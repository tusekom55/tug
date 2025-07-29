const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const DepositRequest = require('../models/DepositRequest');
const Transaction = require('../models/Transaction');
const Log = require('../models/Log');
const Settings = require('../models/Settings');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Tüm admin route'ları için admin yetkisi gerekli
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Admin dashboard istatistikleri
 * @access  Admin
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      pendingDeposits,
      totalDeposits,
      todayTransactions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      DepositRequest.countDocuments({ status: 'beklemede' }),
      DepositRequest.aggregate([
        { $match: { status: 'onaylandı' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.getDailyVolume()
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers
      },
      deposits: {
        pending: pendingDeposits,
        totalApproved: totalDeposits[0]?.total || 0
      },
      todayVolume: todayTransactions
    };

    res.json({
      status: 'success',
      data: { stats }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Dashboard istatistikleri alınamadı'
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Kullanıcı listesi
 * @access  Admin
 */
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.isActive = status === 'active';

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Kullanıcılar getirilemedi'
    });
  }
});

/**
 * @route   GET /api/admin/deposits/pending
 * @desc    Bekleyen para yatırma talepleri
 * @access  Admin
 */
router.get('/deposits/pending', async (req, res) => {
  try {
    const requests = await DepositRequest.find({ status: 'beklemede' })
      .populate('user', 'name email')
      .sort({ createdAt: 1 });

    const adminData = requests.map(request => request.getAdminData());

    res.json({
      status: 'success',
      data: { requests: adminData }
    });

  } catch (error) {
    console.error('Get pending deposits error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Bekleyen talepler getirilemedi'
    });
  }
});

/**
 * @route   POST /api/admin/deposits/:id/approve
 * @desc    Para yatırma talebini onayla
 * @access  Admin
 */
router.post('/deposits/:id/approve', [
  body('notes').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const { notes = '' } = req.body;
    
    const depositRequest = await DepositRequest.findById(req.params.id)
      .populate('user', 'name email balance');

    if (!depositRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Para yatırma talebi bulunamadı'
      });
    }

    if (depositRequest.status !== 'beklemede') {
      return res.status(400).json({
        status: 'error',
        message: 'Bu talep zaten işlenmiş'
      });
    }

    // Kullanıcı bakiyesini artır
    const user = depositRequest.user;
    const previousBalance = user.balance;
    user.balance += depositRequest.amount;
    await user.save();

    // Deposit request'i güncelle
    depositRequest.status = 'onaylandı';
    depositRequest.processedBy = req.user._id;
    depositRequest.processedAt = new Date();
    depositRequest.adminNotes = notes;
    await depositRequest.save();

    // Transaction oluştur
    const transaction = new Transaction({
      user: user._id,
      type: 'deposit',
      amount: depositRequest.amount,
      totalAmount: depositRequest.amount,
      balanceBefore: previousBalance,
      balanceAfter: user.balance,
      description: `Para yatırma - ${depositRequest.paymentMethod}`,
      depositRequest: depositRequest._id,
      isAdminTransaction: true,
      processedBy: req.user._id,
      metadata: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    await transaction.save();

    // Log oluştur
    await Log.createDepositLog({
      action: 'approved',
      description: `Para yatırma talebi onaylandı: ${depositRequest.amount} TL`,
      userId: user._id,
      depositRequestId: depositRequest._id,
      adminData: {
        adminId: req.user._id,
        adminEmail: req.user.email,
        notes
      },
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Para yatırma talebi onaylandı',
      data: {
        transaction: transaction.getTransactionDetails(),
        newBalance: user.balance
      }
    });

  } catch (error) {
    console.error('Approve deposit error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Talep onaylanırken bir hata oluştu'
    });
  }
});

/**
 * @route   POST /api/admin/deposits/:id/reject
 * @desc    Para yatırma talebini reddet
 * @access  Admin
 */
router.post('/deposits/:id/reject', [
  body('notes').notEmpty().withMessage('Ret nedeni zorunludur')
], async (req, res) => {
  try {
    const { notes } = req.body;
    
    const depositRequest = await DepositRequest.findById(req.params.id)
      .populate('user', 'name email');

    if (!depositRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Para yatırma talebi bulunamadı'
      });
    }

    if (depositRequest.status !== 'beklemede') {
      return res.status(400).json({
        status: 'error',
        message: 'Bu talep zaten işlenmiş'
      });
    }

    // Deposit request'i güncelle
    depositRequest.status = 'reddedildi';
    depositRequest.processedBy = req.user._id;
    depositRequest.processedAt = new Date();
    depositRequest.adminNotes = notes;
    await depositRequest.save();

    // Log oluştur
    await Log.createDepositLog({
      action: 'rejected',
      description: `Para yatırma talebi reddedildi: ${depositRequest.amount} TL`,
      userId: depositRequest.user._id,
      depositRequestId: depositRequest._id,
      adminData: {
        adminId: req.user._id,
        adminEmail: req.user.email,
        notes
      },
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Para yatırma talebi reddedildi'
    });

  } catch (error) {
    console.error('Reject deposit error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Talep reddedilirken bir hata oluştu'
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id/balance
 * @desc    Kullanıcı bakiyesi güncelle
 * @access  Admin
 */
router.put('/users/:id/balance', [
  body('amount').isNumeric().withMessage('Tutar sayısal olmalıdır'),
  body('operation').isIn(['add', 'subtract', 'set']).withMessage('Geçersiz işlem tipi'),
  body('reason').notEmpty().withMessage('Sebep zorunludur')
], async (req, res) => {
  try {
    const { amount, operation, reason } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Kullanıcı bulunamadı'
      });
    }

    const previousBalance = user.balance;
    let newBalance;

    switch (operation) {
      case 'add':
        newBalance = previousBalance + amount;
        break;
      case 'subtract':
        if (previousBalance < amount) {
          return res.status(400).json({
            status: 'error',
            message: 'Yetersiz bakiye'
          });
        }
        newBalance = previousBalance - amount;
        break;
      case 'set':
        newBalance = amount;
        break;
    }

    user.balance = newBalance;
    await user.save();

    // Transaction oluştur
    const transaction = new Transaction({
      user: user._id,
      type: 'adjustment',
      amount: Math.abs(newBalance - previousBalance),
      totalAmount: Math.abs(newBalance - previousBalance),
      balanceBefore: previousBalance,
      balanceAfter: newBalance,
      description: `Admin bakiye düzeltmesi: ${reason}`,
      isAdminTransaction: true,
      processedBy: req.user._id,
      metadata: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    await transaction.save();

    // Log oluştur
    await Log.createAdminLog({
      action: 'balance_adjustment',
      description: `Bakiye güncellendi: ${previousBalance} → ${newBalance}`,
      adminId: req.user._id,
      adminEmail: req.user.email,
      targetUserId: user._id,
      previousValue: previousBalance,
      newValue: newBalance,
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Kullanıcı bakiyesi güncellendi',
      data: {
        previousBalance,
        newBalance,
        transaction: transaction.getTransactionDetails()
      }
    });

  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Bakiye güncellenirken bir hata oluştu'
    });
  }
});

/**
 * @route   GET /api/admin/settings
 * @desc    Sistem ayarları
 * @access  Admin
 */
router.get('/settings', async (req, res) => {
  try {
    const { category } = req.query;
    
    let settings;
    if (category) {
      settings = await Settings.getByCategory(category);
    } else {
      settings = await Settings.find().sort({ category: 1, key: 1 });
    }

    // Kategorilere göre grupla
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});

    res.json({
      status: 'success',
      data: { settings: groupedSettings }
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ayarlar getirilemedi'
    });
  }
});

/**
 * @route   PUT /api/admin/settings/:key
 * @desc    Ayar güncelle
 * @access  Admin
 */
router.put('/settings/:key', [
  body('value').notEmpty().withMessage('Değer zorunludur')
], async (req, res) => {
  try {
    const { value } = req.body;
    const key = req.params.key;

    const setting = await Settings.findOne({ key });
    if (!setting) {
      return res.status(404).json({
        status: 'error',
        message: 'Ayar bulunamadı'
      });
    }

    if (!setting.isEditable) {
      return res.status(400).json({
        status: 'error',
        message: 'Bu ayar düzenlenemez'
      });
    }

    // Validasyon kontrolü
    try {
      setting.validateValue(value);
    } catch (validationError) {
      return res.status(400).json({
        status: 'error',
        message: validationError.message
      });
    }

    const previousValue = setting.value;
    setting.value = value;
    setting.lastModifiedBy = req.user._id;
    await setting.save();

    // Log oluştur
    await Log.createAdminLog({
      action: 'setting_updated',
      description: `Ayar güncellendi: ${key}`,
      adminId: req.user._id,
      adminEmail: req.user.email,
      previousValue,
      newValue: value,
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Ayar güncellendi',
      data: { setting }
    });

  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ayar güncellenirken bir hata oluştu'
    });
  }
});

module.exports = router; 