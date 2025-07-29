const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-encryption-key!'; // 32 karakter
const ALGORITHM = 'aes-256-gcm';

/**
 * Metni şifreler
 * @param {string} text - Şifrelenecek metin
 * @returns {string} - Şifrelenmiş metin (base64)
 */
function encrypt(text) {
  try {
    if (!text) return null;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    cipher.setAAD(Buffer.from('additional_data', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // IV + AuthTag + Encrypted Data'yı birleştir
    const combined = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    return Buffer.from(combined).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Şifreleme işlemi başarısız');
  }
}

/**
 * Şifreli metni çözer
 * @param {string} encryptedData - Şifrelenmiş metin (base64)
 * @returns {string} - Orijinal metin
 */
function decrypt(encryptedData) {
  try {
    if (!encryptedData) return null;
    
    const combined = Buffer.from(encryptedData, 'base64').toString('utf8');
    const parts = combined.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAAD(Buffer.from('additional_data', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Şifre çözme işlemi başarısız');
  }
}

/**
 * Hash oluşturur (tek yönlü)
 * @param {string} text - Hash'lenecek metin
 * @param {string} salt - Tuz değeri (opsiyonel)
 * @returns {string} - Hash değeri
 */
function createHash(text, salt = '') {
  try {
    const hash = crypto.createHash('sha256');
    hash.update(text + salt);
    return hash.digest('hex');
  } catch (error) {
    console.error('Hash error:', error);
    throw new Error('Hash oluşturma işlemi başarısız');
  }
}

/**
 * Güvenli rastgele string üretir
 * @param {number} length - String uzunluğu
 * @returns {string} - Rastgele string
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * HMAC oluşturur (doğrulama için)
 * @param {string} data - Veri
 * @param {string} secret - Gizli anahtar
 * @returns {string} - HMAC değeri
 */
function createHMAC(data, secret = ENCRYPTION_KEY) {
  try {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  } catch (error) {
    console.error('HMAC error:', error);
    throw new Error('HMAC oluşturma işlemi başarısız');
  }
}

/**
 * HMAC doğrular
 * @param {string} data - Orijinal veri
 * @param {string} signature - HMAC imzası
 * @param {string} secret - Gizli anahtar
 * @returns {boolean} - Doğrulama sonucu
 */
function verifyHMAC(data, signature, secret = ENCRYPTION_KEY) {
  try {
    const expectedSignature = createHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

/**
 * Kart numarasını maskeler
 * @param {string} cardNumber - Kart numarası
 * @returns {string} - Maskelenmiş kart numarası
 */
function maskCardNumber(cardNumber) {
  if (!cardNumber || cardNumber.length < 4) return '****';
  const last4 = cardNumber.slice(-4);
  const masked = '*'.repeat(cardNumber.length - 4) + last4;
  return masked.replace(/(.{4})/g, '$1-').slice(0, -1);
}

/**
 * Telefon numarasını maskeler
 * @param {string} phone - Telefon numarası
 * @returns {string} - Maskelenmiş telefon
 */
function maskPhone(phone) {
  if (!phone || phone.length < 4) return '****';
  const last3 = phone.slice(-3);
  return '*'.repeat(phone.length - 3) + last3;
}

/**
 * Email adresini maskeler
 * @param {string} email - Email adresi
 * @returns {string} - Maskelenmiş email
 */
function maskEmail(email) {
  if (!email || !email.includes('@')) return '***@***.com';
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '*'.repeat(Math.max(local.length - 2, 1)) + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

/**
 * IBAN'ı maskeler
 * @param {string} iban - IBAN numarası
 * @returns {string} - Maskelenmiş IBAN
 */
function maskIban(iban) {
  if (!iban || iban.length < 8) return 'TR**-****-****-****-**';
  const first2 = iban.slice(0, 2);
  const last2 = iban.slice(-2);
  return `${first2}**-****-****-****-**${last2}`;
}

/**
 * Hassas veriyi güvenli şekilde loglar
 * @param {any} data - Log edilecek veri
 * @returns {any} - Maskelenmiş veri
 */
function sanitizeForLog(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = [
    'password', 'cardNumber', 'cvv', 'pin', 'token', 'secret',
    'paparaNumber', 'iban', 'accountNumber', 'socialSecurity'
  ];
  
  const sanitized = JSON.parse(JSON.stringify(data));
  
  function maskSensitiveData(obj) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          if (typeof obj[key] === 'string') {
            if (key.toLowerCase().includes('card')) {
              obj[key] = maskCardNumber(obj[key]);
            } else if (key.toLowerCase().includes('phone')) {
              obj[key] = maskPhone(obj[key]);
            } else if (key.toLowerCase().includes('email')) {
              obj[key] = maskEmail(obj[key]);
            } else if (key.toLowerCase().includes('iban')) {
              obj[key] = maskIban(obj[key]);
            } else {
              obj[key] = '***HIDDEN***';
            }
          } else {
            obj[key] = '***HIDDEN***';
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          maskSensitiveData(obj[key]);
        }
      }
    }
  }
  
  maskSensitiveData(sanitized);
  return sanitized;
}

module.exports = {
  encrypt,
  decrypt,
  createHash,
  generateRandomString,
  createHMAC,
  verifyHMAC,
  maskCardNumber,
  maskPhone,
  maskEmail,
  maskIban,
  sanitizeForLog
}; 