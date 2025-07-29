const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

class User extends Model {
  // Virtual for account lock status
  get isLocked() {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }

  // Instance method to check password
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Method to handle failed login attempts
  async incLoginAttempts() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < new Date()) {
      return await this.update({
        lockUntil: null,
        loginAttempts: 1
      });
    }
    
    const updates = { loginAttempts: this.loginAttempts + 1 };
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
      updates.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    }
    
    return await this.update(updates);
  }

  // Method to reset login attempts
  async resetLoginAttempts() {
    return await this.update({
      loginAttempts: 0,
      lockUntil: null
    });
  }

  // Method to update balance
  async updateBalance(amount, operation = 'add') {
    if (operation === 'add') {
      this.balance += amount;
    } else if (operation === 'subtract') {
      if (this.balance < amount) {
        throw new Error('Yetersiz bakiye');
      }
      this.balance -= amount;
    }
    return await this.save();
  }

  // Method to get user profile (without sensitive data)
  getPublicProfile() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      balance: this.balance,
      phone: this.phone,
      isActive: this.isActive,
      kycVerified: this.kycVerified,
      kycDocuments: this.kycDocuments,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin
    };
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'İsim alanı zorunludur'
      },
      len: {
        args: [2, 50],
        msg: 'İsim 2-50 karakter arasında olmalıdır'
      }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'Bu email adresi zaten kullanımda'
    },
    validate: {
      isEmail: {
        msg: 'Geçerli bir email adresi giriniz'
      },
      notEmpty: {
        msg: 'Email alanı zorunludur'
      }
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Şifre alanı zorunludur'
      },
      len: {
        args: [6, 255],
        msg: 'Şifre en az 6 karakter olmalıdır'
      }
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
    allowNull: false
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'Bakiye negatif olamaz'
      }
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    validate: {
      is: {
        args: /^[\+]?[1-9][\d]{10,14}$/,
        msg: 'Geçerli bir telefon numarası giriniz'
      }
    },
    set(value) {
      this.setDataValue('phone', value ? value.trim() : null);
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  lastLogin: {
    type: DataTypes.DATE
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  lockUntil: {
    type: DataTypes.DATE
  },
  // KYC bilgileri - JSON olarak saklanacak
  kycVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  kycDocuments: {
    type: DataTypes.JSON,
    defaultValue: null,
    comment: 'KYC documents as JSON array'
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['role']
    },
    {
      fields: ['is_active']
    }
  ],
  // Hooks
  hooks: {
    beforeSave: async (user) => {
      // Only hash password if it's been modified
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  },
  // Default scope - password'u gizle
  defaultScope: {
    attributes: { exclude: ['password'] }
  },
  // Named scopes
  scopes: {
    withPassword: {
      attributes: { include: ['password'] }
    },
    active: {
      where: { isActive: true }
    },
    admins: {
      where: { role: 'admin' }
    }
  }
});

module.exports = User; 