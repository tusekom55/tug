<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

// Hibrit coin sistemi - DB'den coin listesi + API'den fiyat
function getHybridCoins($limit = 50, $search = '') {
    $conn = db_connect();
    
    try {
        // Veritabanından aktif coinleri çek
        $sql = '
            SELECT 
                c.id,
                c.coingecko_id,
                c.coin_adi,
                c.coin_kodu,
                c.logo_url,
                c.current_price,
                c.price_change_24h,
                c.market_cap,
                c.api_aktif,
                c.sira,
                ck.kategori_adi
            FROM coins c
            LEFT JOIN coin_kategorileri ck ON c.kategori_id = ck.id
            WHERE c.is_active = 1
        ';
        
        $params = [];
        $types = '';
        
        // Arama filtresi
        if (!empty($search)) {
            $sql .= ' AND (c.coin_adi LIKE ? OR c.coin_kodu LIKE ?)';
            $search_param = '%' . $search . '%';
            $params[] = $search_param;
            $params[] = $search_param;
            $types .= 'ss';
        }
        
        $sql .= ' ORDER BY c.sira ASC, c.id ASC LIMIT ?';
        $params[] = $limit;
        $types .= 'i';
        
        $stmt = $conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        $coins = [];
        $api_aktif_coins = []; // API'den fiyat çekilecek coinler
        
        while ($row = $result->fetch_assoc()) {
            $coins[] = $row;
            
            // API aktifse coin ID'sini sakla
            if ($row['api_aktif'] && $row['coingecko_id']) {
                $api_aktif_coins[] = $row['coingecko_id'];
            }
        }
        
        // API aktif coinler varsa fiyatları güncelle
        if (!empty($api_aktif_coins)) {
            $api_prices = fetchPricesFromAPI($api_aktif_coins);
            
            // Fiyatları coinlerle eşleştir
            foreach ($coins as $index => $coin) {
                if ($coin['api_aktif'] && isset($api_prices[$coin['coingecko_id']])) {
                    $api_data = $api_prices[$coin['coingecko_id']];
                    $coins[$index]['current_price'] = $api_data['current_price'];
                    $coins[$index]['price_change_24h'] = $api_data['price_change_percentage_24h'];
                    $coins[$index]['market_cap'] = $api_data['market_cap'];
                    $coins[$index]['last_updated'] = date('Y-m-d H:i:s');
                    $coins[$index]['price_source'] = 'api';
                } else {
                    $coins[$index]['price_source'] = 'database';
                }
            }
        } else {
            // Tüm fiyatlar veritabanından
            foreach ($coins as $index => $coin) {
                $coins[$index]['price_source'] = 'database';
            }
        }
        
        $stmt->close();
        $conn->close();
        
        return [
            'success' => true,
            'coins' => $coins,
            'total_count' => count($coins),
            'api_active_count' => count($api_aktif_coins),
            'message' => 'Coin listesi başarıyla yüklendi'
        ];
        
    } catch (Exception $e) {
        $conn->close();
        return [
            'success' => false,
            'message' => 'Veritabanı hatası: ' . $e->getMessage()
        ];
    }
}

// CoinGecko API'den fiyat çek
function fetchPricesFromAPI($coingecko_ids) {
    if (empty($coingecko_ids)) {
        return [];
    }
    
    try {
        $ids_string = implode(',', $coingecko_ids);
        $url = "https://api.coingecko.com/api/v3/simple/price?ids={$ids_string}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true";
        
        // cURL kullanarak daha güvenilir API çağrısı
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_USERAGENT, 'TradePro/1.0 (PHP)');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/json'
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($response === FALSE || !empty($curl_error)) {
            error_log('CoinGecko API cURL hatası: ' . $curl_error);
            return [];
        }
        
        if ($http_code !== 200) {
            error_log('CoinGecko API HTTP hatası: ' . $http_code);
            return [];
        }
        
        $data = json_decode($response, true);
        
        if (!$data) {
            error_log('CoinGecko API geçersiz yanıt');
            return [];
        }
        
        // Veriyi düzenle
        $formatted_data = [];
        foreach ($data as $coin_id => $price_data) {
            $formatted_data[$coin_id] = [
                'current_price' => $price_data['usd'] ?? 0,
                'price_change_percentage_24h' => $price_data['usd_24h_change'] ?? 0,
                'market_cap' => $price_data['usd_market_cap'] ?? 0
            ];
        }
        
        return $formatted_data;
        
    } catch (Exception $e) {
        error_log('API fiyat çekme hatası: ' . $e->getMessage());
        return [];
    }
}

// API endpoint
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    
    $limit = max(1, min(100, $limit)); // 1-100 arası sınırla
    
    $result = getHybridCoins($limit, $search);
    echo json_encode($result);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Sadece GET istekleri desteklenir'
    ]);
}
?> 