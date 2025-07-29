# 🚀 GlobalTradePro Backend API

Modern, güvenli ve ölçeklenebilir trading platformu backend API'si. Node.js, Express.js ve MySQL kullanılarak geliştirilmiştir.

## ✨ Özellikler

### 🔐 Kimlik Doğrulama & Güvenlik
- JWT tabanlı kimlik doğrulama sistemi
- Role-based access control (User/Admin)
- Rate limiting ve brute force koruması
- Şifrelenmiş hassas veri saklama
- Comprehensive logging sistemi

### 💳 Para Yatırma Sistemi
- **Kredi Kartı** desteği (güvenli şifreleme)
- **Papara** entegrasyonu
- **Banka Havalesi** takibi
- Admin onay/ret sistemi
- Otomatik bakiye güncelleme

### 👤 Kullanıcı Yönetimi
- Kullanıcı kaydı ve profil yönetimi
- Bakiye takibi ve işlem geçmişi
- KYC doküman yönetimi
- Hesap kilitleme sistemi

### 🪙 Coin Yönetimi
- Cryptocurrency listesi ve fiyat takibi
- Kategori bazında filtreleme
- Market verileri ve fiyat geçmişi
- Trading fee yönetimi

### 🛠 Admin Paneli
- Dashboard ve istatistikler
- Kullanıcı yönetimi
- Para yatırma onay/ret sistemi
- Sistem ayarları yönetimi
- Comprehensive audit log

## 🏗 Teknik Yapı

### Backend Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MySQL with Sequelize ORM
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** Joi + express-validator
- **Security:** bcryptjs, helmet, rate limiting
- **Logging:** Custom logging system

### Veritabanı Modelleri
- `User` - Kullanıcı bilgileri ve authentication
- `Coin` - Cryptocurrency verileri
- `DepositRequest` - Para yatırma talepleri
- `Transaction` - Tüm işlemler (deposit, buy, sell)
- `Log` - Sistem ve güvenlik logları
- `Settings` - Yapılandırılabilir sistem ayarları

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+ 
- MySQL 8.0+ (veya MariaDB 10.6+)
- phpMyAdmin (opsiyonel - database yönetimi için)
- Git

### Adım 1: Projeyi İndir
```bash
git clone <repo-url>
cd trading-backend
```

### Adım 2: Dependencies Yükle
```bash
npm install
```

### Adım 3: MySQL Database Kurulumu
1. MySQL Server'ı kurun ve başlatın
2. phpMyAdmin'i kurun (opsiyonel)
3. Database oluşturun:
```sql
CREATE DATABASE trading_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Adım 4: Environment Dosyası
`.env` dosyası oluşturun:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=trading_platform
DB_USER=root
DB_PASSWORD=your_mysql_password

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRE=7d

# Encryption Key (tam 32 karakter)
ENCRYPTION_KEY=globaltradeprokey1234567890abcd

# Admin Default Credentials
ADMIN_EMAIL=admin@globaltradepro.com
ADMIN_PASSWORD=Admin123!

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Adım 5: Database Setup
```bash
# MySQL Server'ın çalıştığından emin olun
# Default ayarları yükleyin ve tabloları oluşturun
npm run setup
```

### Adım 6: Sunucuyu Başlat
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server `http://localhost:5000` adresinde çalışmaya başlar.

## 📚 API Dokümantasyonu

### Authentication Endpoints

#### POST /api/auth/register
Yeni kullanıcı kaydı
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123",
  "phone": "+905551234567"
}
```

#### POST /api/auth/login
Kullanıcı girişi
```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

### Deposit Endpoints

#### POST /api/deposits/request
Para yatırma talebi oluştur
```json
{
  "amount": 100,
  "paymentMethod": "kredi_karti",
  "cardNumber": "4111111111111111",
  "cardHolderName": "JOHN DOE",
  "expiryDate": "12/25",
  "cvv": "123"
}
```

#### GET /api/deposits/my-requests
Kullanıcının para yatırma talepleri

#### GET /api/deposits/settings
Para yatırma ayarları (IBAN, Papara numarası)

### Admin Endpoints

#### GET /api/admin/dashboard
Admin dashboard istatistikleri

#### GET /api/admin/deposits/pending
Bekleyen para yatırma talepleri

#### POST /api/admin/deposits/:id/approve
Para yatırma talebini onayla

#### POST /api/admin/deposits/:id/reject
Para yatırma talebini reddet

### Coin Endpoints

#### GET /api/coins
Coin listesi

#### GET /api/coins/:symbol
Belirli coin detayı

## 🔧 Konfigürasyon

### Payment Settings
Admin panelden yapılandırılabilir:
- Minimum/maksimum para yatırma tutarları
- Banka hesap bilgileri (IBAN, hesap sahibi)
- Papara numarası
- Trading fee oranları

### Security Settings
- Login attempt limitleri
- Account lock süreleri  
- JWT token geçerlilik süreleri
- API rate limiting

## 🛡 Güvenlik Özellikleri

### Data Encryption
- Kredi kartı bilgileri AES-256-GCM ile şifrelenir
- Hassas veriler maskelenmiş olarak loglanır
- Password'lar bcrypt ile hash'lenir

### Rate Limiting
- Auth endpoints: 10 request/15min per IP
- Genel API: 100 request/15min per IP
- SQL injection koruması

### Logging & Monitoring
- Tüm işlemler comprehensive olarak loglanır
- Security events ayrı kategoride izlenir
- Admin aktiviteleri audit trail'de saklanır

## 📁 Proje Yapısı

```
trading-backend/
├── config/
│   └── database.js          # MySQL connection with Sequelize
├── middleware/
│   └── auth.js              # Authentication middleware
├── models/
│   ├── User.js              # User model
│   ├── Coin.js              # Coin model
│   ├── DepositRequest.js    # Deposit request model
│   ├── Transaction.js       # Transaction model
│   ├── Log.js               # Logging model
│   └── Settings.js          # Settings model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── admin.js             # Admin routes  
│   ├── coins.js             # Coin routes
│   ├── deposits.js          # Deposit routes
│   └── users.js             # User routes
├── utils/
│   └── encryption.js        # Encryption utilities
├── .env.example             # Environment variables template
├── package.json             # Dependencies
├── server.js                # Main server file
└── README.md                # Bu dosya
```

## 🧪 Test

```bash
# Unit testleri çalıştır
npm test

# Coverage raporu
npm run test:coverage
```

## 🚀 Deployment

### Docker ile Deploy
```bash
# Docker image oluştur
docker build -t trading-backend .

# Container çalıştır
docker run -d -p 5000:5000 --env-file .env trading-backend
```

### Environment Variables (Production)
```env
NODE_ENV=production
DB_HOST=your-production-mysql-host
DB_NAME=trading_platform
DB_USER=your-production-user
DB_PASSWORD=your-production-password
JWT_SECRET=your-super-strong-production-secret
ENCRYPTION_KEY=your-32-char-production-encryption-key
```

## 📈 Monitoring & Logs

### Log Kategorileri
- `auth` - Kimlik doğrulama işlemleri
- `transaction` - Trading işlemleri  
- `deposit` - Para yatırma işlemleri
- `admin` - Admin panel aktiviteleri
- `security` - Güvenlik olayları
- `error` - Sistem hataları

### Health Check
```bash
GET /health
```

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Push edin (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 Destek

Sorularınız için:
- GitHub Issues
- Email: dev@globaltradepro.com

---

**© 2024 GlobalTradePro - Secure Trading Platform Backend** 