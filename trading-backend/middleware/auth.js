const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Log = require('../models/Log');

/**
 * JWT token doğrulama middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Token bulunamadı. Lütfen giriş yapın.'
      });
    }

    // Token doğrulama
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kullanıcıyı veritabanından kontrol et
    const user = await User.findById(decoded.id).select('+password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Geçersiz token. Kullanıcı bulunamadı.'
      });
    }

    // Kullanıcı aktif mi kontrol et
    if (!user.isActive) {
      await Log.createSecurityLog({
        action: 'blocked_user_access_attempt',
        description: `Deaktif kullanıcı erişim denemesi: ${user.email}`,
        userId: user._id,
        system: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        riskLevel: 'high',
        flags: ['inactive_user']
      });

      return res.status(403).json({
        status: 'error',
        message: 'Hesabınız deaktif edilmiştir. Lütfen destek ile iletişime geçin.'
      });
    }

    // Hesap kilitli mi kontrol et
    if (user.isLocked) {
      await Log.createSecurityLog({
        action: 'locked_user_access_attempt',
        description: `Kilitli kullanıcı erişim denemesi: ${user.email}`,
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
        message: 'Hesabınız çok fazla başarısız giriş denemesi nedeniyle kilitlenmiştir.',
        lockUntil: user.lockUntil
      });
    }

    // Request'e kullanıcı bilgilerini ekle
    req.user = user;
    next();

  } catch (error) {
    console.error('Token doğrulama hatası:', error);

    // Token süresi dolmuş
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token süresi dolmuş. Lütfen tekrar giriş yapın.',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Geçersiz token
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Geçersiz token. Lütfen tekrar giriş yapın.',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Token doğrulama sırasında bir hata oluştu.'
    });
  }
};

/**
 * Admin yetki kontrolü middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Kimlik doğrulama gerekli.'
    });
  }

  if (req.user.role !== 'admin') {
    // Yetkisiz erişim denemesini logla
    Log.createSecurityLog({
      action: 'unauthorized_admin_access',
      description: `Yetkisiz admin panel erişim denemesi: ${req.user.email}`,
      userId: req.user._id,
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      riskLevel: 'high',
      flags: ['unauthorized_access', 'admin_panel']
    });

    return res.status(403).json({
      status: 'error',
      message: 'Bu işlem için admin yetkisi gereklidir.',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  next();
};

/**
 * Opsiyonel auth middleware (token varsa doğrula, yoksa devam et)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Hata olsa bile devam et (opsiyonel auth)
    next();
  }
};

/**
 * Rate limiting için kullanıcı tanımlama
 */
const identifyUser = (req, res, next) => {
  // IP adresini al
  req.clientIP = req.ip || 
                req.connection.remoteAddress || 
                req.socket.remoteAddress ||
                (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                req.headers['x-forwarded-for']?.split(',')[0];

  // User agent
  req.userAgent = req.get('User-Agent') || 'Unknown';

  // Kullanıcı varsa ID'sini ekle
  if (req.user) {
    req.userId = req.user._id.toString();
  }

  next();
};

/**
 * JWT token oluştur
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Refresh token oluştur
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

/**
 * Token'dan kullanıcı ID'si al (doğrulama yapmadan)
 */
const extractUserIdFromToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded ? decoded.id : null;
  } catch (error) {
    return null;
  }
};

/**
 * API key doğrulama (external services için)
 */
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      message: 'API key gerekli.'
    });
  }

  // API key'i kontrol et (environment'dan al)
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

  if (!validApiKeys.includes(apiKey)) {
    Log.createSecurityLog({
      action: 'invalid_api_key',
      description: `Geçersiz API key kullanımı: ${apiKey.substring(0, 8)}...`,
      system: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      riskLevel: 'high',
      flags: ['invalid_api_key']
    });

    return res.status(401).json({
      status: 'error',
      message: 'Geçersiz API key.'
    });
  }

  req.isApiRequest = true;
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth,
  identifyUser,
  generateToken,
  generateRefreshToken,
  extractUserIdFromToken,
  authenticateApiKey
}; 