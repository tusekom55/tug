const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Tüm user route'ları için auth gerekli
router.use(authenticateToken);

/**
 * @route   GET /api/users/transactions
 * @desc    Kullanıcının işlem geçmişi
 * @access  Private
 */
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;

    const transactions = await Transaction.getUserTransactions(req.user._id, {
      page,
      limit,
      type,
      startDate,
      endDate
    });

    const total = await Transaction.countDocuments({ user: req.user._id });

    res.json({
      status: 'success',
      data: {
        transactions: transactions.map(t => t.getTransactionDetails()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'İşlem geçmişi getirilemedi'
    });
  }
});

/**
 * @route   GET /api/users/balance
 * @desc    Kullanıcı bakiye bilgisi
 * @access  Private
 */
router.get('/balance', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      status: 'success',
      data: {
        balance: user.balance,
        lastUpdated: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Bakiye bilgisi getirilemedi'
    });
  }
});

/**
 * @route   GET /api/users/stats
 * @desc    Kullanıcının istatistikleri
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await Transaction.getUserStats(req.user._id);
    
    res.json({
      status: 'success',
      data: { stats }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'İstatistikler getirilemedi'
    });
  }
});

module.exports = router; 