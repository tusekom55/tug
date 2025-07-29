-- VERİTABANI GÜNCELLEME SCRIPT'İ
-- Mevcut coins tablosunu hibrit sisteme uyarlama

-- Önce mevcut coins tablosunu yedekle (isteğe bağlı)
-- CREATE TABLE coins_backup AS SELECT * FROM coins;

-- Yeni kolonları ekle
ALTER TABLE coins 
ADD COLUMN coingecko_id VARCHAR(100) UNIQUE AFTER kategori_id,
ADD COLUMN logo_url VARCHAR(500) AFTER coin_kodu,
ADD COLUMN aciklama TEXT AFTER logo_url,
ADD COLUMN current_price DECIMAL(16,8) DEFAULT 0 AFTER aciklama,
ADD COLUMN price_change_24h DECIMAL(5,2) DEFAULT 0 AFTER current_price,
ADD COLUMN market_cap BIGINT DEFAULT 0 AFTER price_change_24h,
ADD COLUMN api_aktif BOOLEAN DEFAULT FALSE AFTER market_cap,
ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER api_aktif,
ADD COLUMN sira INT DEFAULT 0 AFTER is_active,
ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER sira,
ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Fiyat geçmişi tablosu oluştur
CREATE TABLE IF NOT EXISTS coin_price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coin_id INT,
    price DECIMAL(16,8),
    price_change_24h DECIMAL(5,2),
    market_cap BIGINT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coin_id) REFERENCES coins(id) ON DELETE CASCADE
);

-- Loglar tablosunu güncelle
ALTER TABLE loglar 
MODIFY COLUMN tip ENUM('para_yatirma','coin_islem','api_guncelleme');

-- Ayarlar tablosuna varsayılan değerler ekle
INSERT IGNORE INTO ayarlar (`key`, `value`) VALUES 
('api_guncelleme_aktif', 'false'),
('api_guncelleme_siklik', '300'),
('varsayilan_fiyat_kaynak', 'manuel');

-- Kategori tablosunu kontrol et ve eksikleri ekle
INSERT IGNORE INTO coin_kategorileri (id, kategori_adi) VALUES 
(1, 'Major Coins'),
(2, 'Altcoins'),
(3, 'DeFi'),
(4, 'NFT'),
(5, 'Meme Coins'),
(6, 'Stablecoins');

-- Mevcut coin verilerini temizle (eski format)
DELETE FROM coins WHERE coingecko_id IS NULL;

SELECT 'Schema güncelleme tamamlandı!' as Status; 