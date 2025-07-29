const { DataTypes, Model, Op } = require('sequelize');
const { sequelize } = require('../config/database');

class Transaction extends Model {
  // Virtual - işlem yönü (+ veya -)
  get direction() {
    return ['buy', 'deposit', 'bonus'].includes(this.type) ? 'in' : 'out';
  }

  // Method - işlem detaylarını al
  getTransactionDetails() {
    return {
      id: this.id,
      type: this.type,
      amount: this.amount,
      coinAmount: this.coinAmount,
      pricePerCoin: this.pricePerCoin,
      fee: this.fee,
      totalAmount: this.totalAmount,
      status: this.status,
      referenceNumber: this.referenceNumber,
      description: this.description,
      direction: this.direction,
      createdAt: this.createdAt,
      coin: this.coin
    };
  }

  // Static method - kullanıcının işlem geçmişi
  static async getUserTransactions(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      type = null,
      startDate = null,
      endDate = null
    } = options;

    const where = { userId: userId };
    
    if (type) where.type = type;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    return await this.findAll({
      where,
      include: [{
        model: sequelize.models.Coin,
        as: 'coin',
        attributes: ['id', 'symbol', 'name', 'logo']
      }],
      order: [['created_at', 'DESC']],
      limit: limit * 1,
      offset: (page - 1) * limit
    });
  }

  // Static method - kullanıcının belirli coin'deki işlemleri
  static async getUserCoinTransactions(userId, coinId) {
    return await this.findAll({
      where: {
        userId: userId,
        coinId: coinId,
        type: { [Op.in]: ['buy', 'sell'] }
      },
      include: [{
        model: sequelize.models.Coin,
        as: 'coin',
        attributes: ['id', 'symbol', 'name']
      }],
      order: [['created_at', 'DESC']]
    });
  }

  // Static method - günlük işlem hacmi
  static async getDailyVolume(date = new Date()) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    return await this.findAll({
      attributes: [
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalVolume'],
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      where: {
        createdAt: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        },
        type: { [Op.in]: ['buy', 'sell'] },
        status: 'completed'
      },
      group: ['type'],
      raw: true
    });
  }

  // Static method - popüler coinler (işlem hacmine göre)
  static async getPopularCoins(days = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await this.findAll({
      attributes: [
        'coin_id',
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalVolume'],
        [sequelize.fn('COUNT', '*'), 'transactionCount']
      ],
      where: {
        createdAt: { [Op.gte]: startDate },
        type: { [Op.in]: ['buy', 'sell'] },
        status: 'completed'
      },
      include: [{
        model: sequelize.models.Coin,
        as: 'coin',
        attributes: ['id', 'symbol', 'name', 'logo']
      }],
      group: ['coin_id', 'coin.id'],
      order: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'DESC']],
      limit: 10,
      raw: false
    });
  }

  // Static method - kullanıcı istatistikleri
  static async getUserStats(userId) {
    return await this.findAll({
      attributes: [
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        [sequelize.fn('COUNT', '*'), 'count'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'avgAmount']
      ],
      where: { userId: userId },
      group: ['type'],
      raw: true
    });
  }
}

Transaction.init({
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
  type: {
    type: DataTypes.ENUM('buy', 'sell', 'deposit', 'withdraw', 'fee', 'bonus', 'adjustment'),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'İşlem tipi zorunludur'
      }
    }
  },
  coinId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'coins',
      key: 'id'
    },
    validate: {
      requiredForTrading(value) {
        if (['buy', 'sell'].includes(this.type) && !value) {
          throw new Error('Buy/sell işlemleri için coin ID zorunludur');
        }
      }
    }
  },
  amount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'Miktar negatif olamaz'
      }
    }
  },
  // Coin miktarı (buy/sell işlemleri için)
  coinAmount: {
    type: DataTypes.DECIMAL(20, 8),
    validate: {
      min: {
        args: [0],
        msg: 'Coin miktarı negatif olamaz'
      },
      requiredForTrading(value) {
        if (['buy', 'sell'].includes(this.type) && !value) {
          throw new Error('Buy/sell işlemleri için coin miktarı zorunludur');
        }
      }
    }
  },
  // İşlem anındaki coin fiyatı
  pricePerCoin: {
    type: DataTypes.DECIMAL(20, 8),
    validate: {
      min: {
        args: [0],
        msg: 'Fiyat negatif olamaz'
      },
      requiredForTrading(value) {
        if (['buy', 'sell'].includes(this.type) && !value) {
          throw new Error('Buy/sell işlemleri için coin fiyatı zorunludur');
        }
      }
    }
  },
  // İşlem ücreti
  fee: {
    type: DataTypes.DECIMAL(15, 8),
    defaultValue: 0,
    validate: {
      min: {
        args: [0],
        msg: 'Ücret negatif olamaz'
      }
    }
  },
  // Toplam tutar (amount + fee)
  totalAmount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Toplam tutar zorunludur'
      }
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
    defaultValue: 'completed',
    allowNull: false
  },
  // İşlem öncesi ve sonrası bakiye
  balanceBefore: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'İşlem öncesi bakiye zorunludur'
      }
    }
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'İşlem sonrası bakiye zorunludur'
      }
    }
  },
  // Referans numarası (benzersiz işlem kimliği)
  referenceNumber: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false
  },
  // İlgili para yatırma talebi (deposit işlemleri için)
  depositRequestId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'deposit_requests',
      key: 'id'
    }
  },
  // Açıklama
  description: {
    type: DataTypes.STRING(200),
    validate: {
      len: {
        args: [0, 200],
        msg: 'Açıklama 200 karakterden uzun olamaz'
      }
    }
  },
  // Admin işlemi mi?
  isAdminTransaction: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  processedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Sistem bilgileri (JSON)
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'System metadata as JSON (ip, userAgent, platform)'
  }
}, {
  sequelize,
  modelName: 'Transaction',
  tableName: 'transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id', 'created_at']
    },
    {
      fields: ['type', 'created_at']
    },
    {
      fields: ['coin_id', 'type']
    },
    {
      unique: true,
      fields: ['reference_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['deposit_request_id']
    }
  ],
  hooks: {
    beforeCreate: async (transaction) => {
      // Referans numarası oluştur
      if (!transaction.referenceNumber) {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        transaction.referenceNumber = `${transaction.type.toUpperCase()}-${timestamp}-${random}`;
      }
    }
  }
});

module.exports = Transaction; 