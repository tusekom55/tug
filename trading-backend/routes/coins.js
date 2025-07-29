const express = require('express');
const Coin = require('../models/Coin');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/coins
 * @desc    Coin listesi getir
 * @access  Public
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, limit = 50, sort = 'symbol' } = req.query;

    const query = { isActive: true };
    if (category) {
      query.category = category;
    }

    let sortOption = {};
    switch (sort) {
      case 'price':
        sortOption = { price: -1 };
        break;
      case 'marketCap':
        sortOption = { marketCap: -1 };
        break;
      case 'volume':
        sortOption = { volume24h: -1 };
        break;
      case 'change':
        sortOption = { priceChangePercentage24h: -1 };
        break;
      default:
        sortOption = { symbol: 1 };
    }

    const coins = await Coin.find(query)
      .sort(sortOption)
      .limit(parseInt(limit));

    res.json({
      status: 'success',
      data: {
        coins: coins.map(coin => coin.getTradingInfo())
      }
    });

  } catch (error) {
    console.error('Get coins error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Coinler getirilemedi'
    });
  }
});

/**
 * @route   GET /api/coins/:symbol
 * @desc    Belirli bir coin detayı
 * @access  Public
 */
router.get('/:symbol', async (req, res) => {
  try {
    const coin = await Coin.findOne({ 
      symbol: req.params.symbol.toUpperCase(),
      isActive: true 
    });

    if (!coin) {
      return res.status(404).json({
        status: 'error',
        message: 'Coin bulunamadı'
      });
    }

    res.json({
      status: 'success',
      data: { coin }
    });

  } catch (error) {
    console.error('Get coin error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Coin detayları getirilemedi'
    });
  }
});

/**
 * @route   GET /api/coins/categories/list
 * @desc    Coin kategorileri
 * @access  Public
 */
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Coin.distinct('category', { isActive: true });
    
    res.json({
      status: 'success',
      data: { categories }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Kategoriler getirilemedi'
    });
  }
});

module.exports = router; 