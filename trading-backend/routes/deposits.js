const express = require('express');
const { body, validationResult } = require('express-validator');
const DepositRequest = require('../models/DepositRequest');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Log = require('../models/Log');
const Settings = require('../models/Settings');
const { authenticateToken } = require('../middleware/auth');
const { sanitizeForLog } = require('../utils/encryption');

const router = express.Router();

// Validation rules
const depositValidation = [
  body('amount')
    .isNumeric()
    .withMessage('Tutar sayısal olmalıdır')
    .custom(async (value) => {
      const minDeposit = await Settings.getValue('payment.min.deposit', 10);
      const maxDeposit = await Settings.getValue('payment.max.deposit', 50000);
      
      if (value < minDeposit) {
        throw new Error(`Minimum para yatırma tutarı ${minDeposit} TL'dir`);
      }
      if (value > maxDeposit) {
        throw new Error(`Maksimum para yatırma tutarı ${maxDeposit} TL'dir`);
      }
      return true;
    }),
  body('paymentMethod')
    .isIn(['kredi_karti', 'papara', 'havale'])
    .withMessage('Geçersiz ödeme yöntemi'),
  
  // Kredi kartı validasyonu
  body('cardNumber')
    .if(body('paymentMethod').equals('kredi_karti'))
    .notEmpty()
    .withMessage('Kart numarası gerekli')
    .isLength({ min: 16, max: 19 })
    .withMessage('Geçerli bir kart numarası giriniz')
    .matches(/^[0-9\s-]+$/)
    .withMessage('Kart numarası sadece rakam içermelidir'),
  
  body('cardHolderName')
    .if(body('paymentMethod').equals('kredi_karti'))
    .notEmpty()
    .withMessage('Kart sahibi adı gerekli')
    .isLength({ min: 2, max: 50 })
    .withMessage('Kart sahibi adı 2-50 karakter arasında olmalıdır'),
  
  body('expiryDate')
    .if(body('paymentMethod').equals('kredi_karti'))
    .notEmpty()
    .withMessage('Son kullanma tarihi gerekli')
    .matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
    .withMessage('Son kullanma tarihi MM/YY formatında olmalıdır'),
  
  body('cvv')
    .if(body('paymentMethod').equals('kredi_karti'))
    .notEmpty()
    .withMessage('CVV gerekli')
    .isLength({ min: 3, max: 4 })
    .withMessage('CVV 3 veya 4 haneli olmalıdır')
    .matches(/^[0-9]+$/)
    .withMessage('CVV sadece rakam içermelidir'),
  
  // Papara validasyonu
  body('paparaNumber')
    .if(body('paymentMethod').equals('papara'))
    .notEmpty()
    .withMessage('Papara numarası gerekli')
    .isLength({ min: 10, max: 10 })
    .withMessage('Papara numarası 10 haneli olmalıdır')
    .matches(/^[0-9]+$/)
    .withMessage('Papara numarası sadece rakam içermelidir'),
  
  // Havale validasyonu
  body('senderName')
    .if(body('paymentMethod').equals('havale'))
    .notEmpty()
    .withMessage('Gönderen adı gerekli')
    .isLength({ min: 2, max: 50 })
    .withMessage('Gönderen adı 2-50 karakter arasında olmalıdır'),
  
  body('senderIban')
    .if(body('paymentMethod').equals('havale'))
    .optional()
    .matches(/^TR[0-9]{2}[0-9]{4}[0-9]{1}[0-9]{16}$/)
    .withMessage('Geçerli bir IBAN giriniz'),
  
  body('referenceNumber')
    .if(body('paymentMethod').equals('havale'))
    .optional()
    .isLength({ max: 50 })
    .withMessage('Referans numarası en fazla 50 karakter olabilir')
];

/**
 * @route   POST /api/deposits/request
 * @desc    Para yatırma talebi oluştur
 * @access  Private
 */
router.post('/request', [authenticateToken, ...depositValidation], async (req, res) => {
  try {
    // Validation kontrol
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validasyon hatası',
        errors: errors.array()
      });
    }

    const { 
      amount, 
      paymentMethod, 
      cardNumber, 
      cardHolderName, 
      expiryDate, 
      cvv,
      paparaNumber,
      senderName,
      senderIban,
      referenceNumber 
    } = req.body;

    // Kullanıcının bekleyen talebi var mı kontrol et
    const pendingRequest = await DepositRequest.findOne({
      user: req.user._id,
      status: 'beklemede'
    });

    if (pendingRequest) {
      return res.status(400).json({
        status: 'error',
        message: 'Zaten bekleyen bir para yatırma talebiniz bulunmaktadır.',
        code: 'PENDING_REQUEST_EXISTS'
      });
    }

    // Ödeme detaylarını hazırla
    let paymentDetails = {};
    
    if (paymentMethod === 'kredi_karti') {
      // Kart numarasını temizle (sadece rakamlar)
      const cleanCardNumber = cardNumber.replace(/[\s-]/g, '');
      
      // Son kullanma tarihini kontrol et
      const [month, year] = expiryDate.split('/');
      const currentDate = new Date();
      const expiryDateObj = new Date(2000 + parseInt(year), parseInt(month) - 1);
      
      if (expiryDateObj < currentDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Kartın son kullanma tarihi geçmiş'
        });
      }

      paymentDetails = {
        cardNumber: cleanCardNumber,
        cardHolderName: cardHolderName.toUpperCase(),
        expiryDate,
        cvv
      };
    }
    
    if (paymentMethod === 'papara') {
      paymentDetails = {
        paparaNumber
      };
    }
    
    if (paymentMethod === 'havale') {
      paymentDetails = {
        senderName,
        senderIban,
        referenceNumber,
        transferDate: new Date()
      };
    }

    // Deposit request oluştur
    const depositRequest = new DepositRequest({
      user: req.user._id,
      amount,
      paymentMethod,
      paymentDetails,
      requestIP: req.ip,
      userAgent: req.get('User-Agent')
    });

    await depositRequest.save();

    // Log oluştur
    await Log.createDepositLog({
      action: 'request_created',
      description: `Para yatırma talebi oluşturuldu: ${amount} TL - ${paymentMethod}`,
      userId: req.user._id,
      depositRequestId: depositRequest._id,
      paymentData: {
        method: paymentMethod,
        amount,
        maskedCardNumber: depositRequest.maskedDetails.cardNumber,
        maskedPaparaNumber: depositRequest.maskedDetails.paparaNumber,
        maskedIban: depositRequest.maskedDetails.senderIban
      },
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Güvenli response (hassas bilgiler olmadan)
    const safeDepositData = depositRequest.getSafeData();

    res.status(201).json({
      status: 'success',
      message: 'Para yatırma talebiniz başarıyla oluşturuldu. Admin onayı bekleniyor.',
      data: {
        depositRequest: safeDepositData
      }
    });

  } catch (error) {
    console.error('Deposit request error:', error);

    await Log.createErrorLog({
      description: 'Para yatırma talebi oluşturma hatası',
      error,
      userId: req.user._id,
      request: sanitizeForLog(req.body),
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(500).json({
      status: 'error',
      message: 'Para yatırma talebi oluşturulurken bir hata oluştu'
    });
  }
});

/**
 * @route   GET /api/deposits/my-requests
 * @desc    Kullanıcının para yatırma taleplerini getir
 * @access  Private
 */
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: req.user._id };
    if (status && ['beklemede', 'onaylandı', 'reddedildi'].includes(status)) {
      query.status = status;
    }

    const requests = await DepositRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DepositRequest.countDocuments(query);

    // Güvenli data (hassas bilgiler olmadan)
    const safeRequests = requests.map(request => request.getSafeData());

    res.json({
      status: 'success',
      data: {
        requests: safeRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get deposit requests error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Para yatırma talepleri getirilemedi'
    });
  }
});

/**
 * @route   GET /api/deposits/settings
 * @desc    Para yatırma ayarlarını getir (IBAN, Papara numarası vs.)
 * @access  Public
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.getByCategory('payment', true);
    
    const depositSettings = {
      minDeposit: await Settings.getValue('payment.min.deposit', 10),
      maxDeposit: await Settings.getValue('payment.max.deposit', 50000),
      bankInfo: {
        iban: await Settings.getValue('payment.bank.iban'),
        name: await Settings.getValue('payment.bank.name'),
        branch: await Settings.getValue('payment.bank.branch'),
        accountHolder: await Settings.getValue('payment.bank.accountHolder')
      },
      papara: {
        number: await Settings.getValue('payment.papara.number')
      }
    };

    res.json({
      status: 'success',
      data: {
        settings: depositSettings
      }
    });

  } catch (error) {
    console.error('Get deposit settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ayarlar getirilemedi'
    });
  }
});

/**
 * @route   DELETE /api/deposits/:id/cancel
 * @desc    Para yatırma talebini iptal et
 * @access  Private
 */
router.delete('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const depositRequest = await DepositRequest.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!depositRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Para yatırma talebi bulunamadı'
      });
    }

    // Sadece beklemedeki talepler iptal edilebilir
    if (depositRequest.status !== 'beklemede') {
      return res.status(400).json({
        status: 'error',
        message: 'Sadece beklemedeki talepler iptal edilebilir'
      });
    }

    // Talebi iptal et
    depositRequest.status = 'iptal_edildi';
    depositRequest.processedAt = new Date();
    depositRequest.adminNotes = 'Kullanıcı tarafından iptal edildi';
    await depositRequest.save();

    // Log oluştur
    await Log.createDepositLog({
      action: 'request_cancelled',
      description: `Para yatırma talebi iptal edildi: ${depositRequest.amount} TL`,
      userId: req.user._id,
      depositRequestId: depositRequest._id,
      paymentData: {
        method: depositRequest.paymentMethod,
        amount: depositRequest.amount
      },
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Para yatırma talebiniz iptal edildi'
    });

  } catch (error) {
    console.error('Cancel deposit request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Talep iptal edilirken bir hata oluştu'
    });
  }
});

/**
 * @route   GET /api/deposits/:id
 * @desc    Belirli bir para yatırma talebinin detayını getir
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const depositRequest = await DepositRequest.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!depositRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Para yatırma talebi bulunamadı'
      });
    }

    // Güvenli data döndür
    const safeData = depositRequest.getSafeData();

    res.json({
      status: 'success',
      data: {
        depositRequest: safeData
      }
    });

  } catch (error) {
    console.error('Get deposit request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Talep detayları getirilemedi'
    });
  }
});

/**
 * @route   GET /api/deposits/stats/summary
 * @desc    Kullanıcının para yatırma istatistikleri
 * @access  Private
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const stats = await DepositRequest.aggregate([
      {
        $match: { user: req.user._id }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const summary = {
      total: {
        count: 0,
        amount: 0
      },
      approved: {
        count: 0,
        amount: 0
      },
      pending: {
        count: 0,
        amount: 0
      },
      rejected: {
        count: 0,
        amount: 0
      }
    };

    stats.forEach(stat => {
      summary.total.count += stat.count;
      summary.total.amount += stat.totalAmount;

      if (stat._id === 'onaylandı') {
        summary.approved.count = stat.count;
        summary.approved.amount = stat.totalAmount;
      } else if (stat._id === 'beklemede') {
        summary.pending.count = stat.count;
        summary.pending.amount = stat.totalAmount;
      } else if (stat._id === 'reddedildi') {
        summary.rejected.count = stat.count;
        summary.rejected.amount = stat.totalAmount;
      }
    });

    res.json({
      status: 'success',
      data: {
        summary
      }
    });

  } catch (error) {
    console.error('Get deposit stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'İstatistikler getirilemedi'
    });
  }
});

module.exports = router; 