const { DataTypes, Model, Op } = require('sequelize');
const { sequelize } = require('../config/database');

class Log extends Model {
  // Static method - güvenlik logları
  static async createSecurityLog(data) {
    return await this.create({
      type: 'security',
      level: data.level || 'warning',
      action: data.action,
      description: data.description,
      userId: data.userId,
      metadata: {
        system: data.system,
        ...data.metadata
      },
      security: {
        riskLevel: data.riskLevel || 'medium',
        flags: data.flags || []
      }
    });
  }

  // Static method - işlem logları
  static async createTransactionLog(data) {
    return await this.create({
      type: 'transaction',
      action: data.action, // buy, sell, deposit
      description: data.description,
      userId: data.userId,
      entityType: 'transaction',
      entityId: data.transactionId,
      metadata: {
        transaction: data.transactionData,
        system: data.system
      }
    });
  }

  // Static method - auth logları
  static async createAuthLog(data) {
    return await this.create({
      type: 'auth',
      action: data.action, // login, logout, register, failed_login
      description: data.description,
      userId: data.userId,
      level: data.success ? 'info' : 'warning',
      metadata: {
        system: data.system,
        request: data.request
      },
      security: {
        riskLevel: data.success ? 'low' : 'medium',
        flags: data.flags || []
      }
    });
  }

  // Static method - admin logları
  static async createAdminLog(data) {
    return await this.create({
      type: 'admin',
      action: data.action,
      description: data.description,
      userId: data.targetUserId,
      metadata: {
        admin: {
          adminId: data.adminId,
          adminEmail: data.adminEmail,
          targetUserId: data.targetUserId,
          previousValue: data.previousValue,
          newValue: data.newValue
        },
        system: data.system
      }
    });
  }

  // Static method - deposit logları
  static async createDepositLog(data) {
    return await this.create({
      type: 'deposit',
      action: data.action, // request_created, approved, rejected
      description: data.description,
      userId: data.userId,
      entityType: 'deposit_request',
      entityId: data.depositRequestId,
      metadata: {
        payment: data.paymentData,
        admin: data.adminData,
        system: data.system
      }
    });
  }

  // Static method - error logları
  static async createErrorLog(data) {
    return await this.create({
      type: 'error',
      action: 'system_error',
      description: data.description || data.error.message,
      level: 'error',
      userId: data.userId,
      metadata: {
        error: {
          name: data.error.name,
          message: data.error.message,
          stack: data.error.stack,
          code: data.error.code
        },
        request: data.request,
        system: data.system
      }
    });
  }

  // Static method - belirli kullanıcının logları
  static async getUserLogs(userId, options = {}) {
    const {
      page = 1,
      limit = 50,
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
      order: [['created_at', 'DESC']],
      limit: limit * 1,
      offset: (page - 1) * limit
    });
  }

  // Static method - güvenlik analizi
  static async getSecurityAnalysis(timeRange = 24) {
    const startDate = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    return await this.findAll({
      attributes: [
        'type',
        'level',
        'action',
        [sequelize.fn('COUNT', '*'), 'count'],
        [sequelize.fn('MAX', sequelize.col('created_at')), 'lastOccurrence']
      ],
      where: {
        createdAt: { [Op.gte]: startDate },
        [Op.or]: [
          { type: 'security' },
          { level: { [Op.in]: ['warning', 'error', 'critical'] } }
        ]
      },
      group: ['type', 'level', 'action'],
      order: [[sequelize.fn('COUNT', '*'), 'DESC']],
      raw: true
    });
  }

  // Static method - admin aktivite raporu
  static async getAdminActivityReport(startDate, endDate) {
    return await this.findAll({
      attributes: [
        [sequelize.literal('JSON_EXTRACT(metadata, "$.admin.adminId")'), 'adminId'],
        [sequelize.literal('JSON_EXTRACT(metadata, "$.admin.adminEmail")'), 'adminEmail'],
        [sequelize.fn('COUNT', '*'), 'totalActions'],
        [sequelize.fn('GROUP_CONCAT', 
          sequelize.literal('CONCAT(action, ":", description, ":", created_at)'), 
          { separator: '||' }
        ), 'actions']
      ],
      where: {
        type: 'admin',
        createdAt: { 
          [Op.gte]: new Date(startDate), 
          [Op.lte]: new Date(endDate) 
        }
      },
      group: [sequelize.literal('JSON_EXTRACT(metadata, "$.admin.adminId")')],
      order: [[sequelize.fn('COUNT', '*'), 'DESC']],
      raw: true
    });
  }

  // Static method - sistem performans logları
  static async getSystemPerformance(hours = 24) {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    return await this.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m-%d %H:00'), 'hour'],
        [sequelize.fn('COUNT', '*'), 'totalRequests'],
        [sequelize.fn('AVG', 
          sequelize.literal('JSON_EXTRACT(metadata, "$.response.responseTime")')
        ), 'averageResponseTime'],
        [sequelize.fn('SUM', 
          sequelize.literal('CASE WHEN JSON_EXTRACT(metadata, "$.response.statusCode") >= 400 THEN 1 ELSE 0 END')
        ), 'errorCount']
      ],
      where: {
        createdAt: { [Op.gte]: startDate },
        type: 'api'
      },
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m-%d %H:00')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m-%d %H:00'), 'ASC']],
      raw: true
    });
  }
}

Log.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Kullanıcı bilgisi
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Log tipi
  type: {
    type: DataTypes.ENUM('auth', 'transaction', 'deposit', 'admin', 'error', 'security', 'api', 'system', 'user_action'),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Log tipi zorunludur'
      }
    }
  },
  // Alt kategori
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Action zorunludur'
      }
    },
    comment: 'Action like login, logout, register, buy, sell, deposit_request, admin_login, etc.'
  },
  // Detaylı açıklama
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Açıklama zorunludur'
      }
    }
  },
  // İlgili entity (transaction id, deposit request id, etc.)
  entityType: {
    type: DataTypes.ENUM('user', 'transaction', 'deposit_request', 'coin', 'admin', 'system')
  },
  entityId: {
    type: DataTypes.INTEGER
  },
  // Severity level
  level: {
    type: DataTypes.ENUM('info', 'warning', 'error', 'critical'),
    defaultValue: 'info'
  },
  // Ek veri (JSON format) - tüm metadata burada saklanacak
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Complete metadata as JSON including request, response, system, transaction, payment, error, admin info'
  },
  // Güvenlik flags (JSON)
  security: {
    type: DataTypes.JSON,
    defaultValue: {
      isBlocked: false,
      riskLevel: 'low',
      flags: []
    },
    comment: 'Security information as JSON'
  }
}, {
  sequelize,
  modelName: 'Log',
  tableName: 'logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['type', 'created_at']
    },
    {
      fields: ['user_id', 'created_at']
    },
    {
      fields: ['level', 'created_at']
    },
    {
      fields: ['action', 'created_at']
    },
    {
      fields: ['entity_type', 'entity_id']
    },
    {
      fields: [sequelize.literal('(JSON_EXTRACT(metadata, "$.system.ip"))')]
    },
    {
      fields: [sequelize.literal('(JSON_EXTRACT(security, "$.riskLevel"))')]
    }
  ]
});

module.exports = Log; 