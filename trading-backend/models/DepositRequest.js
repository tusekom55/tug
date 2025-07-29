const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

class DepositRequest extends Model {
  // Maskeli kart numarası oluşturma
  maskCardNumber(cardNumber) {
    if (!cardNumber || cardNumber.length < 4) return '****';
    const last4 = cardNumber.slice(-4);
    const masked = '*'.repeat(cardNumber.length - 4) + last4;
    return masked.replace(/(.{4})/g, '$1-').slice(0, -1);
  }

  // Maskeli Papara numarası oluşturma
  maskPaparaNumber(paparaNumber) {
    if (!paparaNumber || paparaNumber.length < 4) return '****';
    const last3 = paparaNumber.slice(-3);
    return '*'.repeat(paparaNumber.length - 3) + last3;
  }

  // Maskeli IBAN oluşturma
  maskIban(iban) {
    if (!iban || iban.length < 8) return 'TR**-****-****-****-**';
    const first2 = iban.slice(0, 2);
    const last2 = iban.slice(-2);
    return `${first2}**-****-****-****-**${last2}`;
  }

  // Talep durumunu güncelleme
  async updateStatus(status, adminId, notes = '') {
    this.status = status;
    this.processedBy = adminId;
    this.processedAt = new Date();
    this.adminNotes = notes;
    return await this.save();
  }

  // Güvenli görüntüleme için hassas bilgileri kaldır
  getSafeData() {
    const obj = this.toJSON();
    
    // Şifrelenmiş verileri kaldır
    delete obj.paymentDetails;
    
    return {
      ...obj,
      maskedDetails: this.maskedDetails
    };
  }

  // Admin için tam bilgiler (maskeli)
  getAdminData() {
    const obj = this.toJSON();
    
    const adminPaymentDetails = {};
    
    if (this.paymentMethod === 'kredi_karti') {
      adminPaymentDetails.cardNumber = this.maskedDetails?.cardNumber;
      adminPaymentDetails.cardHolderName = this.paymentDetails?.cardHolderName ? '***' : undefined;
      adminPaymentDetails.expiryDate = this.paymentDetails?.expiryDate ? '**/**' : undefined;
    }
    
    if (this.paymentMethod === 'papara') {
      adminPaymentDetails.paparaNumber = this.maskedDetails?.paparaNumber;
    }
    
    if (this.paymentMethod === 'havale') {
      adminPaymentDetails.senderName = this.paymentDetails?.senderName;
      adminPaymentDetails.senderIban = this.maskedDetails?.senderIban;
      adminPaymentDetails.transferDate = this.paymentDetails?.transferDate;
      adminPaymentDetails.referenceNumber = this.paymentDetails?.referenceNumber;
    }
    
    return {
      ...obj,
      paymentDetails: adminPaymentDetails
    };
  }

  // Static method - kullanıcının bekleyen taleplerini getir
  static async getUserPendingRequests(userId) {
    return await this.findAll({
      where: {
        userId: userId,
        status: 'beklemede'
      },
      order: [['created_at', 'DESC']]
    });
  }

  // Static method - admin için bekleyen talepleri getir
  static async getPendingRequests() {
    return await this.findAll({
      where: { status: 'beklemede' },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }],
      order: [['created_at', 'ASC']] // Eskiden yeniye
    });
  }
}

DepositRequest.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    validate: {
      notEmpty: {
        msg: 'Kullanıcı ID zorunludur'
      }
    }
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: {
        args: [1],
        msg: 'Minimum yatırım tutarı 1 TL'
      },
      max: {
        args: [1000000],
        msg: 'Maksimum yatırım tutarı 1,000,000 TL'
      }
    }
  },
  paymentMethod: {
    type: DataTypes.ENUM('kredi_karti', 'papara', 'havale'),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Ödeme yöntemi zorunludur'
      }
    }
  },
  status: {
    type: DataTypes.ENUM('beklemede', 'onaylandı', 'reddedildi', 'iptal_edildi'),
    defaultValue: 'beklemede',
    allowNull: false
  },
  
  // Ödeme detayları (şifrelenmiş JSON)
  paymentDetails: {
    type: DataTypes.JSON,
    comment: 'Encrypted payment details as JSON',
    set(value) {
      if (value && typeof value === 'object') {
        const encrypted = {};
        for (const [key, val] of Object.entries(value)) {
          if (val && typeof val === 'string' && ['cardNumber', 'cardHolderName', 'expiryDate', 'cvv', 'paparaNumber', 'senderName', 'senderIban'].includes(key)) {
            encrypted[key] = encrypt(val);
          } else {
            encrypted[key] = val;
          }
        }
        this.setDataValue('paymentDetails', encrypted);
      } else {
        this.setDataValue('paymentDetails', value);
      }
    },
    get() {
      const value = this.getDataValue('paymentDetails');
      if (value && typeof value === 'object') {
        const decrypted = {};
        for (const [key, val] of Object.entries(value)) {
          if (val && typeof val === 'string' && ['cardNumber', 'cardHolderName', 'expiryDate', 'cvv', 'paparaNumber', 'senderName', 'senderIban'].includes(key)) {
            try {
              decrypted[key] = decrypt(val);
            } catch (error) {
              decrypted[key] = val; // Fallback if decryption fails
            }
          } else {
            decrypted[key] = val;
          }
        }
        return decrypted;
      }
      return value;
    }
  },
  
  // Maskelenmiş bilgiler (JSON)
  maskedDetails: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Masked payment details for display'
  },
  
  // Admin işlemleri
  processedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  processedAt: {
    type: DataTypes.DATE
  },
  adminNotes: {
    type: DataTypes.TEXT,
    validate: {
      len: {
        args: [0, 500],
        msg: 'Admin notu 500 karakterden uzun olamaz'
      }
    }
  },
  
  // Sistem bilgileri
  requestIP: {
    type: DataTypes.STRING(45), // IPv6 için yeterli
  },
  userAgent: {
    type: DataTypes.TEXT
  },
  
  // Dosya ekleri (JSON array)
  attachments: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'File attachments as JSON array'
  }
}, {
  sequelize,
  modelName: 'DepositRequest',
  tableName: 'deposit_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id', 'created_at']
    },
    {
      fields: ['status', 'created_at']
    },
    {
      fields: ['payment_method']
    },
    {
      fields: ['processed_by']
    }
  ],
  hooks: {
    beforeSave: async (depositRequest) => {
      // Maskeli bilgileri oluştur
      const maskedDetails = {};
      const paymentDetails = depositRequest.paymentDetails;
      
      if (depositRequest.paymentMethod === 'kredi_karti' && paymentDetails?.cardNumber) {
        try {
          const decryptedCard = typeof paymentDetails.cardNumber === 'string' && paymentDetails.cardNumber.includes(':')
            ? decrypt(paymentDetails.cardNumber)
            : paymentDetails.cardNumber;
          maskedDetails.cardNumber = depositRequest.maskCardNumber(decryptedCard);
        } catch (error) {
          console.error('Error creating masked card number:', error);
        }
      }
      
      if (depositRequest.paymentMethod === 'papara' && paymentDetails?.paparaNumber) {
        try {
          const decryptedPapara = typeof paymentDetails.paparaNumber === 'string' && paymentDetails.paparaNumber.includes(':')
            ? decrypt(paymentDetails.paparaNumber)
            : paymentDetails.paparaNumber;
          maskedDetails.paparaNumber = depositRequest.maskPaparaNumber(decryptedPapara);
        } catch (error) {
          console.error('Error creating masked papara number:', error);
        }
      }
      
      if (depositRequest.paymentMethod === 'havale' && paymentDetails?.senderIban) {
        try {
          const decryptedIban = typeof paymentDetails.senderIban === 'string' && paymentDetails.senderIban.includes(':')
            ? decrypt(paymentDetails.senderIban)
            : paymentDetails.senderIban;
          maskedDetails.senderIban = depositRequest.maskIban(decryptedIban);
        } catch (error) {
          console.error('Error creating masked IBAN:', error);
        }
      }
      
      depositRequest.maskedDetails = maskedDetails;
    }
  }
});

module.exports = DepositRequest; 