const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Settings = require('./models/Settings');
const Coin = require('./models/Coin');
const { sequelize, connectDB } = require('./config/database');

/**
 * Database setup script
 * Bu script veritabanını başlangıç verileri ile doldurur
 */

// Database connection is now handled by config/database.js

async function createAdminUser() {
  try {
    console.log('\n🔐 Admin kullanıcısı oluşturuluyor...');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@globaltradepro.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

    // Admin kullanıcısı zaten var mı kontrol et
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    
    if (existingAdmin) {
      console.log('⚠️  Admin kullanıcısı zaten mevcut:', adminEmail);
      return existingAdmin;
    }

    // Yeni admin kullanıcısı oluştur
    const adminUser = new User({
      name: 'System Administrator',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isActive: true,
      balance: 0
    });

    await adminUser.save();
    console.log('✅ Admin kullanıcısı oluşturuldu:', adminEmail);
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Şifre:', adminPassword);
    console.log('⚠️  Güvenlik için şifreyi değiştirmeyi unutmayın!');
    
    return adminUser;

  } catch (error) {
    console.error('❌ Admin kullanıcısı oluşturulurken hata:', error.message);
    throw error;
  }
}

async function createDefaultSettings() {
  try {
    console.log('\n⚙️  Varsayılan ayarlar oluşturuluyor...');
    
    await Settings.createDefaults();
    console.log('✅ Varsayılan ayarlar oluşturuldu');

  } catch (error) {
    console.error('❌ Ayarlar oluşturulurken hata:', error.message);
    throw error;
  }
}

async function createSampleCoins() {
  try {
    console.log('\n🪙 Örnek coinler oluşturuluyor...');
    
    const sampleCoins = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 45000,
        category: 'bitcoin',
        description: 'İlk ve en büyük kripto para birimi',
        website: 'https://bitcoin.org',
        logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
        trading: {
          minTradeAmount: 10,
          maxTradeAmount: 100000,
          tradingFee: 0.1,
          isTradeEnabled: true
        },
        market: {
          rank: 1,
          totalSupply: 21000000,
          circulatingSupply: 19500000
        }
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        price: 3200,
        category: 'altcoin',
        description: 'Akıllı kontratlar ve DeFi için platform',
        website: 'https://ethereum.org',
        logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        trading: {
          minTradeAmount: 5,
          maxTradeAmount: 50000,
          tradingFee: 0.1,
          isTradeEnabled: true
        },
        market: {
          rank: 2,
          totalSupply: null,
          circulatingSupply: 120000000
        }
      },
      {
        symbol: 'BNB',
        name: 'Binance Coin',
        price: 320,
        category: 'altcoin',
        description: 'Binance exchange token',
        website: 'https://binance.com',
        logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
        trading: {
          minTradeAmount: 1,
          maxTradeAmount: 10000,
          tradingFee: 0.1,
          isTradeEnabled: true
        },
        market: {
          rank: 3,
          totalSupply: 200000000,
          circulatingSupply: 150000000
        }
      },
      {
        symbol: 'ADA',
        name: 'Cardano',
        price: 0.45,
        category: 'altcoin',
        description: 'Proof-of-stake blockchain platformu',
        website: 'https://cardano.org',
        logo: 'https://cryptologos.cc/logos/cardano-ada-logo.png',
        trading: {
          minTradeAmount: 1,
          maxTradeAmount: 50000,
          tradingFee: 0.1,
          isTradeEnabled: true
        },
        market: {
          rank: 4,
          totalSupply: 45000000000,
          circulatingSupply: 35000000000
        }
      },
      {
        symbol: 'DOGE',
        name: 'Dogecoin',
        price: 0.08,
        category: 'meme',
        description: 'İlk meme coin',
        website: 'https://dogecoin.com',
        logo: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
        trading: {
          minTradeAmount: 1,
          maxTradeAmount: 100000,
          tradingFee: 0.15,
          isTradeEnabled: true
        },
        market: {
          rank: 5,
          totalSupply: null,
          circulatingSupply: 140000000000
        }
      }
    ];

    for (const coinData of sampleCoins) {
      const existingCoin = await Coin.findOne({ where: { symbol: coinData.symbol } });
      
      if (!existingCoin) {
        const coin = new Coin(coinData);
        await coin.save();
        console.log(`  ✅ ${coinData.symbol} (${coinData.name}) oluşturuldu`);
      } else {
        console.log(`  ⚠️  ${coinData.symbol} zaten mevcut`);
      }
    }

    console.log('✅ Örnek coinler oluşturuldu');

  } catch (error) {
    console.error('❌ Coinler oluşturulurken hata:', error.message);
    throw error;
  }
}

async function createTestUser() {
  try {
    console.log('\n👤 Test kullanıcısı oluşturuluyor...');
    
    const testEmail = 'test@globaltradepro.com';
    
    const existingUser = await User.findOne({ where: { email: testEmail } });
    
    if (existingUser) {
      console.log('⚠️  Test kullanıcısı zaten mevcut:', testEmail);
      return existingUser;
    }

    const testUser = new User({
      name: 'Test Kullanıcısı',
      email: testEmail,
      password: 'Test123!',
      phone: '+905551234567',
      role: 'user',
      isActive: true,
      balance: 1000 // Test için başlangıç bakiyesi
    });

    await testUser.save();
    console.log('✅ Test kullanıcısı oluşturuldu:', testEmail);
    console.log('📧 Email:', testEmail);
    console.log('🔑 Şifre: Test123!');
    console.log('💰 Başlangıç bakiyesi: 1000 TL');
    
    return testUser;

  } catch (error) {
    console.error('❌ Test kullanıcısı oluşturulurken hata:', error.message);
    throw error;
  }
}

async function checkEnvironment() {
  console.log('🔍 Environment değişkenleri kontrol ediliyor...\n');
  
  const required = [
    'DB_NAME',
    'JWT_SECRET',
    'ENCRYPTION_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Eksik environment değişkenleri:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 .env dosyasını kontrol edin veya aşağıdaki değişkenleri ayarlayın:');
    console.error('   DB_HOST=localhost');
    console.error('   DB_PORT=3306');
    console.error('   DB_NAME=trading_platform');
    console.error('   DB_USER=root');
    console.error('   DB_PASSWORD=your_password');
    process.exit(1);
  }

  // JWT Secret uzunluk kontrolü
  if (process.env.JWT_SECRET.length < 32) {
    console.error('⚠️  JWT_SECRET en az 32 karakter olmalıdır');
  }

  // Encryption key uzunluk kontrolü
  if (process.env.ENCRYPTION_KEY.length !== 32) {
    console.error('⚠️  ENCRYPTION_KEY tam olarak 32 karakter olmalıdır');
  }

  console.log('✅ Environment değişkenleri kontrol edildi');
}

async function displaySummary() {
  try {
    console.log('\n📊 Kurulum özeti:');
    console.log('=====================================');
    
    const userCount = await User.count();
    const adminCount = await User.count({ where: { role: 'admin' } });
    const coinCount = await Coin.count();
    const settingsCount = await Settings.count();

    console.log(`👥 Toplam kullanıcı: ${userCount}`);
    console.log(`🔐 Admin kullanıcı: ${adminCount}`);
    console.log(`🪙 Toplam coin: ${coinCount}`);
    console.log(`⚙️  Toplam ayar: ${settingsCount}`);
    
    console.log('\n🚀 Sunucuyu başlatmak için:');
    console.log('   npm run dev    (development)');
    console.log('   npm start      (production)');
    
    console.log('\n🌐 API Endpoints:');
    console.log(`   Health: http://localhost:${process.env.PORT || 5000}/health`);
    console.log(`   Auth: http://localhost:${process.env.PORT || 5000}/api/auth`);
    console.log(`   Admin: http://localhost:${process.env.PORT || 5000}/api/admin`);
    
    console.log('\n🗄️  Database:');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'trading_platform'}`);
    console.log(`   Engine: MySQL with Sequelize ORM`);

  } catch (error) {
    console.error('❌ Özet bilgileri alınırken hata:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 GlobalTradePro Backend Kurulum Başlatılıyor...\n');
    
    // Environment kontrolü
    checkEnvironment();
    
    // Veritabanı bağlantısı
    await connectDB();
    
    // Varsayılan ayarları oluştur
    await createDefaultSettings();
    
    // Admin kullanıcısı oluştur
    await createAdminUser();
    
    // Test kullanıcısı oluştur
    await createTestUser();
    
    // Örnek coinleri oluştur
    await createSampleCoins();
    
    // Özet bilgileri göster
    await displaySummary();
    
    console.log('\n🎉 Kurulum başarıyla tamamlandı!');
    
  } catch (error) {
    console.error('\n❌ Kurulum sırasında hata oluştu:', error.message);
    process.exit(1);
  } finally {
    // Veritabanı bağlantısını kapat
    await sequelize.close();
    console.log('\n📴 MySQL bağlantısı kapatıldı');
  }
}

// Script çalıştırılırsa main fonksiyonunu çalıştır
if (require.main === module) {
  main();
}

module.exports = {
  createAdminUser,
  createDefaultSettings,
  createSampleCoins,
  createTestUser
}; 