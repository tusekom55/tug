-- Kullanıcılar
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('user','admin') DEFAULT 'user',
    balance DECIMAL(16,2) DEFAULT 0,
    ad_soyad VARCHAR(100),
    tc_no VARCHAR(11),
    telefon VARCHAR(20),
    iban VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Coin kategorileri
CREATE TABLE coin_kategorileri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kategori_adi VARCHAR(100)
);

-- Coinler (Hibrit Sistem)
CREATE TABLE coins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kategori_id INT,
    coingecko_id VARCHAR(100) UNIQUE, -- CoinGecko API ID'si (bitcoin, ethereum vb.)
    coin_adi VARCHAR(100),
    coin_kodu VARCHAR(20), -- BTC, ETH vb.
    logo_url VARCHAR(500), -- Coin logosu URL'i
    aciklama TEXT, -- Coin açıklaması
    current_price DECIMAL(16,8) DEFAULT 0, -- Sabit fiyat (API kapalıysa)
    price_change_24h DECIMAL(5,2) DEFAULT 0, -- 24 saatlik değişim %
    market_cap BIGINT DEFAULT 0, -- Piyasa değeri
    api_aktif BOOLEAN DEFAULT FALSE, -- Fiyat API'den çekilsin mi?
    is_active BOOLEAN DEFAULT TRUE, -- Coin listede görünsün mü?
    sira INT DEFAULT 0, -- Listeleme sırası
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (kategori_id) REFERENCES coin_kategorileri(id) ON DELETE SET NULL
);

-- Coin işlemleri (al/sat)
CREATE TABLE coin_islemleri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    coin_id INT,
    islem ENUM('al','sat'),
    miktar DECIMAL(16,8),
    fiyat DECIMAL(16,2),
    tarih DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coin_id) REFERENCES coins(id) ON DELETE CASCADE
);

-- Para yatırma talepleri
CREATE TABLE para_yatirma_talepleri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    yontem ENUM('kredi_karti','papara','havale'),
    tutar DECIMAL(16,2),
    durum ENUM('beklemede','onaylandi','reddedildi') DEFAULT 'beklemede',
    tarih DATETIME DEFAULT CURRENT_TIMESTAMP,
    detay_bilgiler TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ayarlar (API ve Sistem Ayarları)
CREATE TABLE ayarlar (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT
);

-- Loglar
CREATE TABLE loglar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    tip ENUM('para_yatirma','coin_islem','api_guncelleme'),
    detay TEXT,
    tarih DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Fiyat geçmişi (isteğe bağlı)
CREATE TABLE coin_price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coin_id INT,
    price DECIMAL(16,8),
    price_change_24h DECIMAL(5,2),
    market_cap BIGINT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coin_id) REFERENCES coins(id) ON DELETE CASCADE
);

-- Başlangıç ayarları ekleme
INSERT INTO ayarlar (`key`, `value`) VALUES 
('api_guncelleme_aktif', 'false'),
('api_guncelleme_siklik', '300'), -- 5 dakika (saniye)
('varsayilan_fiyat_kaynak', 'manuel'); -- manuel veya api

-- Örnek kategoriler
INSERT INTO coin_kategorileri (kategori_adi) VALUES 
('Major Coins'),
('Altcoins'),
('DeFi'),
('NFT'),
('Meme Coins'),
('Stablecoins');

-- Örnek kullanıcılar
INSERT INTO users (username, email, password, role, balance, ad_soyad, tc_no, telefon, iban) VALUES 
('admin', 'admin@cryptofinance.com', 'password', 'admin', 10000.00, 'Admin User', '12345678901', '+905551234567', 'TR63 0006 4000 0019 3001 9751 44'),
('user1', 'user1@example.com', 'password', 'user', 5000.00, 'Ahmet Yılmaz', '12345678902', '+905551234568', 'TR63 0006 4000 0019 3001 9751 45'),
('user2', 'user2@example.com', 'password', 'user', 3000.00, 'Fatma Demir', '12345678903', '+905551234569', 'TR63 0006 4000 0019 3001 9751 46'); 