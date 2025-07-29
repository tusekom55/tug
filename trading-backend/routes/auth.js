const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Log = require('../models/Log');
const Settings = require('../models/Settings');
const { authenticateToken, generateToken, generateRefreshToken } = require('../middleware/auth');
const { sanitizeForLog } = require('../utils/encryption');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('İsim 2-50 karakter arasında olmalıdır'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Geçerli bir email adresi giriniz'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Şifre en az 6 karakter olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
  body('phone')
    .optional()
    .isMobilePhone('tr-TR')
    .withMessage('Geçerli bir telefon numarası giriniz')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Geçerli bir email adresi giriniz'),
  body('password')
    .notEmpty()
    .withMessage('Şifre alanı zorunludur')
];

/**
 * @route   POST /api/auth/register
 * @desc    Kullanıcı kaydı
 * @access  Public
 */
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Validation kontrol
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await Log.createAuthLog({
        action: 'register_validation_failed',
        description: 'Kayıt validasyon hatası',
        success: false,
        system: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        request: sanitizeForLog(req.body),
        flags: ['validation_error']
      });

      return res.status(400).json({
        status: 'error',
        message: 'Validasyon hatası',
        errors: errors.array()
      });
    }

    const { name, email, password, phone } = req.body;

    // Email kontrolü
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await Log.createAuthLog({
        action: 'register_email_exists',
        description: `Kayıt denemesi - email zaten mevcut: ${email}`,
        success: false,
        system: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        flags: ['duplicate_email']
      });

      return res.status(400).json({
        status: 'error',
        message: 'Bu email adresi zaten kullanımda',
        code: 'EMAIL_EXISTS'
      });
    }

    // Kullanıcı oluştur
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      phone,
      balance: 0
    });

    await user.save();

    // Token oluştur
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Başarılı kayıt logu
    await Log.createAuthLog({
      action: 'register_success',
      description: `Yeni kullanıcı kaydı: ${user.email}`,
      userId: user._id,
      success: true,
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Hesabınız başarıyla oluşturuldu',
      data: {
        user: user.getPublicProfile(),
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Register error:', error);

    await Log.createErrorLog({
      description: 'Kayıt işlemi sırasında hata',
      error,
      request: sanitizeForLog(req.body),
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(500).json({
      status: 'error',
      message: 'Kayıt işlemi sırasında bir hata oluştu'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Kullanıcı girişi
 * @access  Public
 */
router.post('/login', loginValidation, async (req, res) => {
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

    const { email, password } = req.body;

    // Kullanıcıyı bul (şifre ile birlikte)
    const user = await User.scope('withPassword').findOne({ 
      where: { email: email.toLowerCase() } 
    });

    if (!user) {
      await Log.createAuthLog({
        action: 'login_user_not_found',
        description: `Giriş denemesi - kullanıcı bulunamadı: ${email}`,
        success: false,
        system: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        flags: ['user_not_found']
      });

      return res.status(401).json({
        status: 'error',
        message: 'Email veya şifre hatalı',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Hesap kilitli mi kontrol et
    if (user.isLocked) {
      await Log.createSecurityLog({
        action: 'login_locked_account',
        description: `Kilitli hesap giriş denemesi: ${email}`,
        userId: user._id,
        system: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        riskLevel: 'high',
        flags: ['locked_account']
      });

      return res.status(423).json({
        status: 'error',
        message: 'Hesabınız kilitlenmiştir. Lütfen daha sonra tekrar deneyin.',
        lockUntil: user.lockUntil
      });
    }

    // Şifre kontrolü
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Başarısız giriş denemesini artır
      await user.incLoginAttempts();

      await Log.createAuthLog({
        action: 'login_invalid_password',
        description: `Hatalı şifre girişi: ${email}`,
        userId: user._id,
        success: false,
        system: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        flags: ['invalid_password']
      });

      return res.status(401).json({
        status: 'error',
        message: 'Email veya şifre hatalı',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Hesap aktif mi?
    if (!user.isActive) {
      await Log.createSecurityLog({
        action: 'login_inactive_account',
        description: `Deaktif hesap giriş denemesi: ${email}`,
        userId: user._id,
        system: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        riskLevel: 'medium',
        flags: ['inactive_account']
      });

      return res.status(403).json({
        status: 'error',
        message: 'Hesabınız deaktif edilmiştir. Lütfen destek ile iletişime geçin.'
      });
    }

    // Başarılı giriş - login attempts sıfırla
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    // Token oluştur
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Başarılı giriş logu
    await Log.createAuthLog({
      action: 'login_success',
      description: `Başarılı giriş: ${user.email}`,
      userId: user._id,
      success: true,
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Giriş başarılı',
      data: {
        user: user.getPublicProfile(),
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    await Log.createErrorLog({
      description: 'Giriş işlemi sırasında hata',
      error,
      request: sanitizeForLog(req.body),
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(500).json({
      status: 'error',
      message: 'Giriş işlemi sırasında bir hata oluştu'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Kullanıcı çıkışı
 * @access  Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Logout logu
    await Log.createAuthLog({
      action: 'logout',
      description: `Kullanıcı çıkışı: ${req.user.email}`,
      userId: req.user._id,
      success: true,
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Çıkış başarılı'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Çıkış işlemi sırasında bir hata oluştu'
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Kullanıcı profili getir
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Profil bilgileri alınamadı'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Kullanıcı profili güncelle
 * @access  Private
 */
router.put('/profile', [
  authenticateToken,
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().isMobilePhone('tr-TR')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validasyon hatası',
        errors: errors.array()
      });
    }

    const { name, phone } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Sadece izin verilen alanları güncelle
    if (name) user.name = name.trim();
    if (phone) user.phone = phone;

    await user.save();

    await Log.createAuthLog({
      action: 'profile_updated',
      description: `Profil güncellendi: ${user.email}`,
      userId: user._id,
      success: true,
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Profil başarıyla güncellendi',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Profil güncellenemedi'
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Şifre değiştir
 * @access  Private
 */
router.post('/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Mevcut şifre gerekli'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Yeni şifre en az 6 karakter olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validasyon hatası',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.scope('withPassword').findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Mevcut şifre kontrolü
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      await Log.createSecurityLog({
        action: 'password_change_invalid_current',
        description: `Şifre değiştirme - hatalı mevcut şifre: ${user.email}`,
        userId: user._id,
        system: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        riskLevel: 'medium',
        flags: ['invalid_current_password']
      });

      return res.status(400).json({
        status: 'error',
        message: 'Mevcut şifre hatalı'
      });
    }

    // Yeni şifre aynı mı?
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Yeni şifre eskisiyle aynı olamaz'
      });
    }

    // Şifre güncelle
    user.password = newPassword;
    await user.save();

    await Log.createSecurityLog({
      action: 'password_changed',
      description: `Şifre değiştirildi: ${user.email}`,
      userId: user._id,
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      riskLevel: 'low'
    });

    res.json({
      status: 'success',
      message: 'Şifre başarıyla değiştirildi'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Şifre değiştirilirken bir hata oluştu'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Token yenile
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token gerekli'
      });
    }

    // Refresh token doğrula
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        status: 'error',
        message: 'Geçersiz refresh token'
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Kullanıcı bulunamadı veya aktif değil'
      });
    }

    // Yeni tokenlar oluştur
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      status: 'success',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      status: 'error',
      message: 'Token yenilenemedi'
    });
  }
});

module.exports = router; 