-- Kullanıcılar
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('user','admin') DEFAULT 'user',
    balance DECIMAL(16,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Coin kategorileri
CREATE TABLE coin_kategorileri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kategori_adi VARCHAR(100)
);

-- Coinler
CREATE TABLE coins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kategori_id INT,
    coin_adi VARCHAR(100),
    coin_kodu VARCHAR(20),
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

-- Ayarlar
CREATE TABLE ayarlar (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT
);

-- Loglar
CREATE TABLE loglar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    tip ENUM('para_yatirma','coin_islem'),
    detay TEXT,
    tarih DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
); 