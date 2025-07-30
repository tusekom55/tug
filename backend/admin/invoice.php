<?php
// Hata raporlamayı aç
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS request için
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Debug log
error_log("Invoice API called with method: " . $_SERVER['REQUEST_METHOD']);
error_log("GET data: " . print_r($_GET, true));
error_log("POST data: " . print_r($_POST, true));

try {
    // Dosya yollarını kontrol et
    $config_path = __DIR__ . '/../config.php';
    $security_path = __DIR__ . '/../utils/security.php';
    
    error_log("Config path: " . $config_path);
    error_log("Security path: " . $security_path);
    error_log("Config exists: " . (file_exists($config_path) ? 'yes' : 'no'));
    error_log("Security exists: " . (file_exists($security_path) ? 'yes' : 'no'));
    
    if (!file_exists($config_path)) {
        throw new Exception('config.php dosyası bulunamadı: ' . $config_path);
    }
    
    if (!file_exists($security_path)) {
        throw new Exception('security.php dosyası bulunamadı: ' . $security_path);
    }
    
    require_once $config_path;
    require_once $security_path;
    
    error_log("Dosyalar başarıyla yüklendi");
    
    // Fonksiyon kontrolü
    if (!function_exists('db_connect')) {
        throw new Exception('db_connect fonksiyonu bulunamadı');
    }
    
    error_log("db_connect fonksiyonu mevcut");
    
} catch (Exception $e) {
    error_log("Dosya yükleme hatası: " . $e->getMessage());
    echo json_encode(['error' => 'Dosya yükleme hatası: ' . $e->getMessage()]);
    exit;
} catch (Error $e) {
    error_log("PHP Fatal Error: " . $e->getMessage());
    echo json_encode(['error' => 'PHP Fatal Error: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'test':
            // API bağlantı testi
            error_log("Test action called");
            echo json_encode(['success' => true, 'message' => 'API bağlantısı başarılı', 'timestamp' => date('Y-m-d H:i:s')]);
            break;
        
        case 'test_db':
            // Veritabanı bağlantı testi
            try {
                $conn = db_connect();
                echo json_encode(['success' => true, 'message' => 'Veritabanı bağlantısı başarılı', 'timestamp' => date('Y-m-d H:i:s')]);
            } catch (Exception $e) {
                echo json_encode(['error' => 'Veritabanı bağlantısı başarısız: ' . $e->getMessage()]);
            }
            break;
            
        case 'test_user':
            // Kullanıcı testi
            $user_id = $_GET['user_id'] ?? 2; // Default test user
            try {
                $conn = db_connect();
                $sql = "SELECT id, username, email, ad_soyad, tc_no, iban FROM users WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param('i', $user_id);
                $stmt->execute();
                $result = $stmt->get_result();
                $user = $result->fetch_assoc();
                
                if ($user) {
                    echo json_encode(['success' => true, 'message' => 'Kullanıcı bulundu', 'user' => $user]);
                } else {
                    echo json_encode(['error' => 'Kullanıcı bulunamadı (ID: ' . $user_id . ')']);
                }
            } catch (Exception $e) {
                echo json_encode(['error' => 'Kullanıcı sorgusu başarısız: ' . $e->getMessage()]);
            }
            break;
            
        case 'create':
            try {
                error_log("=== CREATE CASE STARTED ===");
                
                // JSON verilerini al
                $raw_input = file_get_contents('php://input');
                error_log("Raw input: " . $raw_input);
                
                $input = json_decode($raw_input, true);
                error_log("Decoded input: " . print_r($input, true));
                
                $user_id = $input['user_id'] ?? $_POST['user_id'] ?? 2; // Default test user
                $islem_tipi = $input['islem_tipi'] ?? $_POST['islem_tipi'] ?? 'para_cekme';
                $islem_id = $input['islem_id'] ?? $_POST['islem_id'] ?? 1;
                $tutar = $input['tutar'] ?? $_POST['tutar'] ?? 100.00;
                
                error_log("Creating invoice with data: user_id=$user_id, islem_tipi=$islem_tipi, islem_id=$islem_id, tutar=$tutar");
                
                // Parametreleri kontrol et
                if (empty($user_id) || empty($islem_tipi) || empty($tutar)) {
                    throw new Exception('Eksik parametreler: user_id, islem_tipi ve tutar gerekli');
                }
                
                // Veritabanı bağlantısını oluştur
                error_log("Attempting database connection...");
                $conn = db_connect();
                error_log("Database connection successful");
                
                // Kullanıcı bilgilerini al
                $sql = "SELECT id, username, email, ad_soyad, tc_no, iban FROM users WHERE id = ?";
                $stmt = $conn->prepare($sql);
                if (!$stmt) {
                    throw new Exception('User query prepare failed: ' . $conn->error);
                }
                
                $stmt->bind_param('i', $user_id);
                $stmt->execute();
                $result = $stmt->get_result();
                $user = $result->fetch_assoc();
                
                if (!$user) {
                    throw new Exception('Kullanıcı bulunamadı (ID: ' . $user_id . ')');
                }
                
                error_log("User found: " . print_r($user, true));
                
                // Fatura numarası oluştur
                $fatura_no = 'INV-' . date('Y') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
                
                // Faturayı veritabanına kaydet
                $sql = "INSERT INTO faturalar (user_id, islem_tipi, islem_id, fatura_no, tutar, toplam_tutar) VALUES (?, ?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                if (!$stmt) {
                    throw new Exception('Invoice insert prepare failed: ' . $conn->error);
                }
                
                $stmt->bind_param('isisdd', $user_id, $islem_tipi, $islem_id, $fatura_no, $tutar, $tutar);
                
                if ($stmt->execute()) {
                    $fatura_id = $conn->insert_id;
                    
                    $fatura_data = [
                        'id' => $fatura_id,
                        'fatura_no' => $fatura_no,
                        'user_id' => $user_id,
                        'tutar' => $tutar,
                        'tarih' => date('Y-m-d H:i:s')
                    ];
                    
                    error_log("Invoice created successfully: " . print_r($fatura_data, true));
                    echo json_encode(['success' => true, 'data' => $fatura_data]);
                } else {
                    error_log("Invoice insert failed: " . $stmt->error);
                    echo json_encode(['error' => 'Fatura oluşturulamadı: ' . $stmt->error]);
                }
                
            } catch (Exception $e) {
                error_log("Create case error: " . $e->getMessage());
                echo json_encode(['error' => 'Create hatası: ' . $e->getMessage()]);
            }
            break;
            
        case 'generate_pdf':
            // Fatura HTML görüntüleme
            $fatura_id = $_GET['id'] ?? 0;
            
            if (empty($fatura_id)) {
                echo json_encode(['error' => 'Fatura ID gerekli']);
                break;
            }
            
            try {
                $conn = db_connect();
                
                // Fatura bilgilerini al
                $sql = "SELECT f.*, u.username, u.email, u.ad_soyad, u.tc_no, u.iban 
                        FROM faturalar f 
                        JOIN users u ON f.user_id = u.id 
                        WHERE f.id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param('i', $fatura_id);
                $stmt->execute();
                $result = $stmt->get_result();
                $fatura = $result->fetch_assoc();
                
                if (!$fatura) {
                    echo json_encode(['error' => 'Fatura bulunamadı']);
                    break;
                }
                
                // Sistem ayarlarını al
                $ayarlar_sql = "SELECT ayar_adi, ayar_degeri FROM sistem_ayarlari";
                $ayarlar_result = $conn->query($ayarlar_sql);
                $fatura_ayarlari = [];
                while ($row = $ayarlar_result->fetch_assoc()) {
                    $fatura_ayarlari[$row['ayar_adi']] = $row['ayar_degeri'];
                }
                
                // HTML fatura oluştur
                $html = generateInvoiceHTML($fatura, $fatura_ayarlari);
                
                header('Content-Type: text/html');
                echo $html;
                
            } catch (Exception $e) {
                echo json_encode(['error' => 'Fatura oluşturulamadı: ' . $e->getMessage()]);
            }
            break;
            
        default:
            error_log("Geçersiz action: " . $action);
            echo json_encode(['error' => 'Geçersiz işlem: ' . $action]);
            break;
    }
} catch (Exception $e) {
    error_log("Invoice API genel hata: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    echo json_encode(['error' => 'Sistem hatası: ' . $e->getMessage()]);
}

function generateInvoiceHTML($fatura, $fatura_ayarlari) {
    $html = '<!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fatura - ' . htmlspecialchars($fatura['fatura_no']) . '</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
            .invoice-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #2196F3, #1976D2); color: white; padding: 30px; position: relative; }
            .company-info { display: flex; justify-content: space-between; align-items: center; }
            .logo { width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #2196F3; }
            .company-details h1 { font-size: 28px; margin-bottom: 10px; }
            .company-details p { opacity: 0.9; margin: 2px 0; }
            .qr-code { width: 80px; height: 80px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666; }
            .info-section { padding: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3; }
            .info-box h3 { color: #2196F3; margin-bottom: 15px; font-size: 16px; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .info-row strong { color: #333; }
            .info-row span { color: #666; }
            .table-section { padding: 0 30px; }
            .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .invoice-table th { background: #2196F3; color: white; padding: 15px; text-align: left; }
            .invoice-table td { padding: 15px; border-bottom: 1px solid #eee; }
            .invoice-table tr:hover { background: #f8f9fa; }
            .totals { padding: 30px; background: #f8f9fa; }
            .total-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 5px 0; }
            .total-row.final { border-top: 2px solid #2196F3; font-weight: bold; font-size: 18px; color: #2196F3; }
            .footer { text-align: center; padding: 20px; background: #f8f9fa; color: #666; font-size: 14px; }
            @media (max-width: 768px) {
                .info-section { grid-template-columns: 1fr; gap: 20px; }
                .company-info { flex-direction: column; gap: 20px; text-align: center; }
                .invoice-table { font-size: 14px; }
                .invoice-table th, .invoice-table td { padding: 10px 5px; }
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="header">
                <div class="company-info">
                    <div>
                        <div class="logo">CF</div>
                        <div class="company-details">
                            <h1>' . ($fatura_ayarlari['fatura_sirket_adi'] ?? 'Crypto Finance Ltd.') . '</h1>
                            <p>' . ($fatura_ayarlari['fatura_adres'] ?? 'İstanbul, Türkiye') . '</p>
                            <p>Tel: ' . ($fatura_ayarlari['fatura_telefon'] ?? '+90 212 555 0123') . '</p>
                            <p>Email: ' . ($fatura_ayarlari['fatura_email'] ?? 'info@cryptofinance.com') . '</p>
                        </div>
                    </div>
                    <div class="qr-code">
                        QR Code<br>Placeholder
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <div class="info-box">
                    <h3>Müşteri Bilgileri</h3>
                    <div class="info-row">
                        <strong>Ad Soyad:</strong>
                        <span>' . htmlspecialchars($fatura['ad_soyad'] ?? $fatura['username']) . '</span>
                    </div>
                    <div class="info-row">
                        <strong>TC No:</strong>
                        <span>' . htmlspecialchars($fatura['tc_no'] ?? 'Belirtilmemiş') . '</span>
                    </div>
                    <div class="info-row">
                        <strong>E-posta:</strong>
                        <span>' . htmlspecialchars($fatura['email']) . '</span>
                    </div>
                    <div class="info-row">
                        <strong>IBAN:</strong>
                        <span>' . htmlspecialchars($fatura['iban'] ?? 'Belirtilmemiş') . '</span>
                    </div>
                </div>
                
                <div class="info-box">
                    <h3>Fatura Bilgileri</h3>
                    <div class="info-row">
                        <strong>Fatura No:</strong>
                        <span>' . htmlspecialchars($fatura['fatura_no']) . '</span>
                    </div>
                    <div class="info-row">
                        <strong>Tarih:</strong>
                        <span>' . date('d.m.Y H:i', strtotime($fatura['tarih'])) . '</span>
                    </div>
                    <div class="info-row">
                        <strong>İşlem Tipi:</strong>
                        <span>' . ucfirst(str_replace('_', ' ', $fatura['islem_tipi'])) . '</span>
                    </div>
                    <div class="info-row">
                        <strong>Durum:</strong>
                        <span style="color: #4CAF50;">Tamamlandı</span>
                    </div>
                </div>
            </div>
            
            <div class="table-section">
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>AÇIKLAMA</th>
                            <th>MİKTAR</th>
                            <th>BİRİM FİYAT</th>
                            <th>TOPLAM</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>' . ucfirst(str_replace('_', ' ', $fatura['islem_tipi'])) . ' İşlemi</td>
                            <td>1</td>
                            <td>₺' . number_format($fatura['tutar'], 2, ',', '.') . '</td>
                            <td>₺' . number_format($fatura['tutar'], 2, ',', '.') . '</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="totals">
                <div class="total-row">
                    <span>Ara Toplam:</span>
                    <span>₺' . number_format($fatura['tutar'], 2, ',', '.') . '</span>
                </div>
                <div class="total-row">
                    <span>KDV (%' . ($fatura['kdv_orani'] ?? 0) . '):</span>
                    <span>₺' . number_format($fatura['kdv_tutari'] ?? 0, 2, ',', '.') . '</span>
                </div>
                <div class="total-row final">
                    <span>Genel Toplam:</span>
                    <span>₺' . number_format($fatura['toplam_tutar'] ?? $fatura['tutar'], 2, ',', '.') . '</span>
                </div>
            </div>
            
            <div class="footer">
                <p>Bu belge elektronik ortamda oluşturulmuştur. | Vergi No: ' . ($fatura_ayarlari['fatura_vergi_no'] ?? '1234567890') . '</p>
            </div>
        </div>
    </body>
    </html>';
    
    return $html;
}
?> 