const { DataTypes, Model, Op } = require('sequelize');
const { sequelize } = require('../config/database');

class Coin extends Model {
  // Virtual for price trend
  get priceTrend() {
    if (this.priceChangePercentage24h > 0) return 'up';
    if (this.priceChangePercentage24h < 0) return 'down';
    return 'stable';
  }

  // Method to update price
  async updatePrice(newPrice, volume = 0) {
    const oldPrice = this.price;
    this.price = newPrice;
    this.priceChange24h = newPrice - oldPrice;
    this.priceChangePercentage24h = ((newPrice - oldPrice) / oldPrice) * 100;
    this.volume24h = volume;
    this.lastUpdated = new Date();
    
    // Fiyat geçmişine ekle (son 24 saat için saatlik veriler)
    const currentHistory = this.priceHistory || [];
    currentHistory.push({
      price: newPrice,
      timestamp: new Date()
    });
    
    // Son 24 saati aş geçmiş verileri temizle
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.priceHistory = currentHistory.filter(
      entry => new Date(entry.timestamp) > twentyFourHoursAgo
    );
    
    return await this.save();
  }

  // Method to get trading info
  getTradingInfo() {
    return {
      id: this.id,
      symbol: this.symbol,
      name: this.name,
      price: this.price,
      priceChange24h: this.priceChange24h,
      priceChangePercentage24h: this.priceChangePercentage24h,
      volume24h: this.volume24h,
      minTradeAmount: this.minTradeAmount,
      maxTradeAmount: this.maxTradeAmount,
      tradingFee: this.tradingFee,
      isTradeEnabled: this.isTradeEnabled,
      category: this.category,
      logo: this.logo,
      priceTrend: this.priceTrend
    };
  }

  // Static method to get active coins for trading
  static async getActiveCoins() {
    return await this.findAll({
      where: {
        isActive: true,
        isTradeEnabled: true
      },
      order: [['symbol', 'ASC']]
    });
  }

  // Static method to get coins by category
  static async getCoinsByCategory(category) {
    return await this.findAll({
      where: {
        category: category,
        isActive: true
      },
      order: [['marketCap', 'DESC']]
    });
  }
}

Coin.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  symbol: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: {
      msg: 'Bu sembol zaten kullanımda'
    },
    validate: {
      notEmpty: {
        msg: 'Coin sembolü zorunludur'
      },
      len: {
        args: [1, 10],
        msg: 'Sembol 1-10 karakter arasında olmalıdır'
      },
      is: {
        args: /^[A-Z0-9]+$/,
        msg: 'Sembol sadece büyük harf ve rakam içerebilir'
      }
    },
    set(value) {
      this.setDataValue('symbol', value.toUpperCase().trim());
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Coin adı zorunludur'
      },
      len: {
        args: [1, 100],
        msg: 'Coin adı 1-100 karakter arasında olmalıdır'
      }
    },
    set(value) {
      this.setDataValue('name', value.trim());
    }
  },
  price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'Fiyat negatif olamaz'
      }
    }
  },
  priceChange24h: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0
  },
  priceChangePercentage24h: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0
  },
  marketCap: {
    type: DataTypes.DECIMAL(25, 2),
    defaultValue: 0
  },
  volume24h: {
    type: DataTypes.DECIMAL(25, 2),
    defaultValue: 0
  },
  category: {
    type: DataTypes.ENUM('bitcoin', 'altcoin', 'defi', 'nft', 'meme', 'gaming', 'metaverse', 'other'),
    defaultValue: 'other',
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    validate: {
      len: {
        args: [0, 500],
        msg: 'Açıklama 500 karakterden uzun olamaz'
      }
    }
  },
  website: {
    type: DataTypes.STRING(255),
    validate: {
      isUrl: {
        msg: 'Geçerli bir URL giriniz'
      }
    }
  },
  logo: {
    type: DataTypes.STRING(255),
    validate: {
      isUrl: {
        msg: 'Geçerli bir logo URL giriniz'
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  // Trading ayarları
  minTradeAmount: {
    type: DataTypes.DECIMAL(15, 8),
    defaultValue: 1,
    validate: {
      min: {
        args: [0],
        msg: 'Minimum işlem miktarı negatif olamaz'
      }
    }
  },
  maxTradeAmount: {
    type: DataTypes.DECIMAL(15, 8),
    defaultValue: 1000000,
    validate: {
      min: {
        args: [1],
        msg: 'Maksimum işlem miktarı 1\'den küçük olamaz'
      }
    }
  },
  tradingFee: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.1, // %0.1
    validate: {
      min: {
        args: [0],
        msg: 'İşlem ücreti negatif olamaz'
      },
      max: {
        args: [10],
        msg: 'İşlem ücreti %10\'dan fazla olamaz'
      }
    }
  },
  isTradeEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  // Fiyat geçmişi (JSON array)
  priceHistory: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Price history as JSON array with price and timestamp'
  },
  // Market verileri (JSON object)
  market: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Market data as JSON object'
  },
  // Son güncelleme
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Coin',
  tableName: 'coins',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['symbol']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['category']
    },
    {
      fields: ['is_trade_enabled']
    },
    {
      fields: ['last_updated']
    },
    {
      fields: ['market_cap']
    },
    {
      fields: ['price']
    }
  ]
});

module.exports = Coin; 