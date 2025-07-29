const { DataTypes, Model, Op } = require('sequelize');
const { sequelize } = require('../config/database');

class Settings extends Model {
  // Static method - ayar değerini al
  static async getValue(key, defaultValue = null) {
    try {
      const setting = await this.findOne({ where: { key } });
      return setting ? setting.value : defaultValue;
    } catch (error) {
      console.error(`Setting getValue error for key ${key}:`, error);
      return defaultValue;
    }
  }

  // Static method - ayar değerini güncelle
  static async setValue(key, value, adminId = null) {
    try {
      const setting = await this.findOne({ where: { key } });

      if (!setting) {
        throw new Error(`Setting with key '${key}' not found`);
      }

      setting.value = value;
      setting.lastModifiedBy = adminId;
      await setting.save();

      return setting;
    } catch (error) {
      console.error(`Setting setValue error for key ${key}:`, error);
      throw error;
    }
  }

  // Static method - kategori bazında ayarları getir
  static async getByCategory(category, publicOnly = false) {
    const where = { category };
    if (publicOnly) {
      where.isPublic = true;
    }
    return await this.findAll({ 
      where, 
      order: [['key', 'ASC']]
    });
  }

  // Static method - default ayarları oluştur
  static async createDefaults() {
    const defaults = [
      // Ödeme ayarları
      {
        key: 'payment.papara.number',
        value: '1234567890',
        type: 'string',
        category: 'payment',
        description: 'Papara numarası',
        isPublic: true,
        validation: { pattern: '^[0-9]{10}$' }
      },
      {
        key: 'payment.bank.iban',
        value: 'TR1234567890123456789012345',
        type: 'string',
        category: 'payment',
        description: 'Banka IBAN numarası',
        isPublic: true,
        validation: { pattern: '^TR[0-9]{2}[0-9]{4}[0-9]{1}[0-9]{16}$' }
      },
      {
        key: 'payment.bank.name',
        value: 'GlobalTradePro Bankası',
        type: 'string',
        category: 'payment',
        description: 'Banka adı',
        isPublic: true
      },
      {
        key: 'payment.bank.branch',
        value: 'Merkez Şubesi',
        type: 'string',
        category: 'payment',
        description: 'Banka şubesi',
        isPublic: true
      },
      {
        key: 'payment.bank.accountHolder',
        value: 'GlobalTradePro Ltd.',
        type: 'string',
        category: 'payment',
        description: 'Hesap sahibi',
        isPublic: true
      },
      {
        key: 'payment.min.deposit',
        value: 10,
        type: 'number',
        category: 'payment',
        description: 'Minimum para yatırma tutarı (TL)',
        isPublic: true,
        validation: { min: 1, max: 1000 }
      },
      {
        key: 'payment.max.deposit',
        value: 50000,
        type: 'number',
        category: 'payment',
        description: 'Maksimum para yatırma tutarı (TL)',
        isPublic: true,
        validation: { min: 100, max: 1000000 }
      },

      // Trading ayarları
      {
        key: 'trading.fee.default',
        value: 0.1,
        type: 'number',
        category: 'trading',
        description: 'Varsayılan işlem ücreti (%)',
        validation: { min: 0, max: 5 }
      },
      {
        key: 'trading.min.amount',
        value: 1,
        type: 'number',
        category: 'trading',
        description: 'Minimum işlem tutarı (TL)',
        validation: { min: 0.1, max: 100 }
      },
      {
        key: 'trading.max.amount',
        value: 100000,
        type: 'number',
        category: 'trading',
        description: 'Maksimum işlem tutarı (TL)',
        validation: { min: 1000, max: 10000000 }
      },
      {
        key: 'trading.enabled',
        value: true,
        type: 'boolean',
        category: 'trading',
        description: 'Trading aktif mi?'
      },

      // Güvenlik ayarları
      {
        key: 'security.login.max_attempts',
        value: 5,
        type: 'number',
        category: 'security',
        description: 'Maksimum giriş denemesi',
        validation: { min: 3, max: 10 }
      },
      {
        key: 'security.login.lock_duration',
        value: 120,
        type: 'number',
        category: 'security',
        description: 'Hesap kilitleme süresi (dakika)',
        validation: { min: 15, max: 1440 }
      },
      {
        key: 'security.jwt.expire',
        value: '7d',
        type: 'string',
        category: 'security',
        description: 'JWT token geçerlilik süresi',
        validation: { options: ['1d', '7d', '30d'] }
      },

      // Sistem ayarları
      {
        key: 'system.maintenance.enabled',
        value: false,
        type: 'boolean',
        category: 'system',
        description: 'Bakım modu aktif mi?'
      },
      {
        key: 'system.maintenance.message',
        value: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
        type: 'string',
        category: 'system',
        description: 'Bakım modu mesajı'
      },
      {
        key: 'system.api.rate_limit',
        value: 100,
        type: 'number',
        category: 'system',
        description: 'API rate limit (request/15min)',
        validation: { min: 10, max: 1000 }
      },

      // Bildirim ayarları
      {
        key: 'notification.email.enabled',
        value: true,
        type: 'boolean',
        category: 'notification',
        description: 'Email bildirimleri aktif mi?'
      },
      {
        key: 'notification.deposit.auto_approve',
        value: false,
        type: 'boolean',
        category: 'notification',
        description: 'Para yatırma otomatik onay'
      },

      // UI ayarları
      {
        key: 'ui.platform.name',
        value: 'GlobalTradePro',
        type: 'string',
        category: 'ui',
        description: 'Platform adı',
        isPublic: true
      },
      {
        key: 'ui.support.phone',
        value: '+90 212 XXX XX XX',
        type: 'string',
        category: 'ui',
        description: 'Destek telefonu',
        isPublic: true
      },
      {
        key: 'ui.support.email',
        value: 'destek@globaltradepro.com',
        type: 'string',
        category: 'ui',
        description: 'Destek email',
        isPublic: true
      },
      {
        key: 'ui.support.whatsapp',
        value: '+90 5XX XXX XX XX',
        type: 'string',
        category: 'ui',
        description: 'WhatsApp numarası',
        isPublic: true
      }
    ];

    for (const defaultSetting of defaults) {
      try {
        await this.upsert(defaultSetting);
      } catch (error) {
        console.error(`Error creating default setting ${defaultSetting.key}:`, error);
      }
    }

    console.log('✅ Default settings created/updated');
  }

  // Method - ayarı validasyon kurallarına göre kontrol et
  validateValue(newValue) {
    const { validation, type } = this;

    // Type kontrolü
    if (type === 'number' && typeof newValue !== 'number') {
      throw new Error('Değer sayı olmalıdır');
    }
    if (type === 'boolean' && typeof newValue !== 'boolean') {
      throw new Error('Değer boolean olmalıdır');
    }
    if (type === 'string' && typeof newValue !== 'string') {
      throw new Error('Değer string olmalıdır');
    }

    if (validation) {
      // Sayısal aralık kontrolü
      if (type === 'number') {
        if (validation.min !== undefined && newValue < validation.min) {
          throw new Error(`Değer ${validation.min} den küçük olamaz`);
        }
        if (validation.max !== undefined && newValue > validation.max) {
          throw new Error(`Değer ${validation.max} den büyük olamaz`);
        }
      }

      // Pattern kontrolü
      if (validation.pattern && type === 'string') {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(newValue)) {
          throw new Error('Değer geçerli formatta değil');
        }
      }

      // Seçenekler kontrolü
      if (validation.options && !validation.options.includes(newValue)) {
        throw new Error(`Değer şu seçeneklerden biri olmalı: ${validation.options.join(', ')}`);
      }
    }

    return true;
  }
}

Settings.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: {
        msg: 'Ayar anahtarı zorunludur'
      }
    },
    set(value) {
      this.setDataValue('key', value.trim());
    }
  },
  value: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Ayar değeri zorunludur'
      }
    }
  },
  type: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'object', 'array'),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Veri tipi zorunludur'
      }
    }
  },
  category: {
    type: DataTypes.ENUM('payment', 'trading', 'security', 'system', 'notification', 'ui'),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Kategori zorunludur'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Açıklama zorunludur'
      }
    }
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Admin panelinde görünüp görünmeyeceği'
  },
  isEditable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Admin tarafından düzenlenebilir mi'
  },
  validation: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Validation rules as JSON (min, max, pattern, options)'
  },
  lastModifiedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'Settings',
  tableName: 'settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['key']
    },
    {
      fields: ['category']
    },
    {
      fields: ['is_public']
    }
  ]
});

module.exports = Settings; 