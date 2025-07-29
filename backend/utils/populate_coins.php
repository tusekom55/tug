<?php
require_once __DIR__ . '/../config.php';

// CoinGecko'dan popüler coinleri çek ve veritabanına kaydet
function populateCoinsFromAPI() {
    $conn = db_connect();
    
    // Önce kategorilerin ID'lerini alalım
    $categories = [
        'Major Coins' => 1,
        'Altcoins' => 2,
        'DeFi' => 3,
        'NFT' => 4,
        'Meme Coins' => 5,
        'Stablecoins' => 6
    ];
    
    try {
        echo "🚀 CoinGecko API'den coin verileri çekiliyor...\n\n";
        
        // CoinGecko'dan top 100 coin çek
        $url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false';
        $response = file_get_contents($url);
        
        if ($response === FALSE) {
            throw new Exception('CoinGecko API\'ye erişim hatası');
        }
        
        $coins = json_decode($response, true);
        
        if (!$coins || !is_array($coins)) {
            throw new Exception('API\'den geçersiz veri');
        }
        
        $success_count = 0;
        $skip_count = 0;
        
        foreach ($coins as $index => $coin) {
            // Coin kategorisini belirle
            $kategori_id = getCoinCategory($coin['name'], $coin['symbol']);
            
            // Veritabanında mevcut mu kontrol et
            $check_stmt = $conn->prepare('SELECT id FROM coins WHERE coingecko_id = ?');
            $check_stmt->bind_param('s', $coin['id']);
            $check_stmt->execute();
            $result = $check_stmt->get_result();
            
            if ($result->num_rows > 0) {
                echo "⏭️  {$coin['name']} zaten mevcut, atlanıyor...\n";
                $skip_count++;
                $check_stmt->close();
                continue;
            }
            $check_stmt->close();
            
            // Coin'i ekle
            $stmt = $conn->prepare('
                INSERT INTO coins (
                    kategori_id, coingecko_id, coin_adi, coin_kodu, logo_url, 
                    current_price, price_change_24h, market_cap, api_aktif, 
                    is_active, sira
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            
            $sira = $index + 1;
            $api_aktif = false; // Default olarak API kapalı
            $is_active = true;
            
            $stmt->bind_param(
                'issssdiiiii',
                $kategori_id,
                $coin['id'], // coingecko_id
                $coin['name'],
                strtoupper($coin['symbol']),
                $coin['image'],
                $coin['current_price'],
                $coin['price_change_percentage_24h'],
                $coin['market_cap'],
                $api_aktif,
                $is_active,
                $sira
            );
            
            if ($stmt->execute()) {
                echo "✅ {$coin['name']} ({$coin['symbol']}) eklendi - Sıra: {$sira}\n";
                $success_count++;
            } else {
                echo "❌ {$coin['name']} eklenirken hata: " . $stmt->error . "\n";
            }
            
            $stmt->close();
        }
        
        echo "\n🎉 İşlem tamamlandı!\n";
        echo "✅ Başarılı: {$success_count} coin\n";
        echo "⏭️  Atlanan: {$skip_count} coin\n\n";
        
        // İstatistikleri göster
        showStats($conn);
        
    } catch (Exception $e) {
        echo "❌ Hata: " . $e->getMessage() . "\n";
    } finally {
        $conn->close();
    }
}

// Coin kategorisini belirle (basit logic)
function getCoinCategory($name, $symbol) {
    $name_lower = strtolower($name);
    $symbol_lower = strtolower($symbol);
    
    // Major Coins
    if (in_array($symbol_lower, ['btc', 'eth', 'bnb', 'xrp', 'ada', 'sol', 'dot', 'avax'])) {
        return 1;
    }
    
    // Stablecoins
    if (in_array($symbol_lower, ['usdt', 'usdc', 'busd', 'dai', 'tusd', 'usdd'])) {
        return 6;
    }
    
    // Meme Coins
    if (strpos($name_lower, 'doge') !== false || strpos($name_lower, 'shib') !== false || 
        strpos($name_lower, 'meme') !== false || in_array($symbol_lower, ['doge', 'shib', 'pepe'])) {
        return 5;
    }
    
    // DeFi
    if (strpos($name_lower, 'defi') !== false || strpos($name_lower, 'swap') !== false ||
        in_array($symbol_lower, ['uni', 'cake', 'aave', 'comp', 'sushi', 'crv'])) {
        return 3;
    }
    
    // Default: Altcoins
    return 2;
}

// İstatistikleri göster
function showStats($conn) {
    echo "📊 COIN İSTATİSTİKLERİ:\n";
    echo "=" . str_repeat("=", 30) . "\n";
    
    $stmt = $conn->prepare('
        SELECT 
            ck.kategori_adi,
            COUNT(c.id) as coin_sayisi,
            SUM(CASE WHEN c.api_aktif = 1 THEN 1 ELSE 0 END) as api_aktif_sayisi
        FROM coin_kategorileri ck
        LEFT JOIN coins c ON ck.id = c.kategori_id
        GROUP BY ck.id, ck.kategori_adi
        ORDER BY coin_sayisi DESC
    ');
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($row = $result->fetch_assoc()) {
        echo sprintf("📂 %-15s: %2d coin (API: %d)\n", 
            $row['kategori_adi'], 
            $row['coin_sayisi'], 
            $row['api_aktif_sayisi']
        );
    }
    
    $stmt->close();
    
    // Toplam istatistik
    $total_stmt = $conn->prepare('SELECT COUNT(*) as total FROM coins');
    $total_stmt->execute();
    $total_result = $total_stmt->get_result();
    $total = $total_result->fetch_assoc()['total'];
    $total_stmt->close();
    
    echo "\n💰 TOPLAM COIN SAYISI: {$total}\n";
    echo "🔴 API DURUMU: KAPALI (Tüm fiyatlar sabit)\n\n";
}

// Script çalıştırılırsa
if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
    echo "🪙 COIN VERİTABANI POPULATE İŞLEMİ\n";
    echo "=" . str_repeat("=", 40) . "\n\n";
    
    populateCoinsFromAPI();
}
?> 