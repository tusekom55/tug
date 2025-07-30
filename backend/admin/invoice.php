<?php
session_start();
require_once '../config.php';
require_once '../utils/security.php';

// Test modu - session kontrolü olmadan
// if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
//     http_response_code(403);
//     echo json_encode(['error' => 'Yetkisiz erişim']);
//     exit;
// }

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS request için
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'create':
        // Fatura oluştur
        $user_id = $_POST['user_id'] ?? 0;
        $islem_tipi = $_POST['islem_tipi'] ?? '';
        $islem_id = $_POST['islem_id'] ?? 0;
        $tutar = $_POST['tutar'] ?? 0;
        
        // Veritabanı bağlantısını oluştur
        $conn = db_connect();
        
        // Kullanıcı bilgilerini al
        $sql = "SELECT * FROM users WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        
        if (!$user) {
            echo json_encode(['error' => 'Kullanıcı bulunamadı']);
            exit;
        }
        
        // Fatura ayarlarını al
        $sql = "SELECT ayar_adi, ayar_degeri FROM sistem_ayarlari WHERE ayar_adi LIKE 'fatura_%'";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        $fatura_ayarlari = [];
        while ($row = $result->fetch_assoc()) {
            $fatura_ayarlari[$row['ayar_adi']] = $row['ayar_degeri'];
        }
        
        // Fatura numarası oluştur
        $fatura_no = 'FTR-' . date('Ymd') . '-' . str_pad($user_id, 4, '0', STR_PAD_LEFT) . '-' . rand(1000, 9999);
        
        // KDV hesapla
        $kdv_orani = 18; // %18 KDV
        $kdv_tutari = $tutar * ($kdv_orani / 100);
        $toplam_tutar = $tutar + $kdv_tutari;
        
        // Faturayı veritabanına kaydet
        $sql = "INSERT INTO faturalar (user_id, islem_tipi, islem_id, fatura_no, tutar, kdv_orani, kdv_tutari, toplam_tutar) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('issisdd', $user_id, $islem_tipi, $islem_id, $fatura_no, $tutar, $kdv_orani, $kdv_tutari, $toplam_tutar);
        $result = $stmt->execute();
        
        if ($result) {
            $fatura_id = $conn->insert_id;
            
            // Fatura verilerini hazırla
            $fatura_data = [
                'fatura_id' => $fatura_id,
                'fatura_no' => $fatura_no,
                'tarih' => date('d.m.Y H:i'),
                'user' => $user,
                'tutar' => $tutar,
                'kdv_orani' => $kdv_orani,
                'kdv_tutari' => $kdv_tutari,
                'toplam_tutar' => $toplam_tutar,
                'islem_tipi' => $islem_tipi,
                'fatura_ayarlari' => $fatura_ayarlari
            ];
            
            echo json_encode(['success' => true, 'data' => $fatura_data]);
        } else {
            echo json_encode(['error' => 'Fatura oluşturulamadı']);
        }
        break;
        
    case 'get':
        // Fatura getir
        $fatura_id = $_GET['fatura_id'] ?? 0;
        
        $sql = "SELECT f.*, u.username, u.email, u.telefon, u.ad_soyad 
                FROM faturalar f
                JOIN users u ON f.user_id = u.id
                WHERE f.id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$fatura_id]);
        $fatura = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$fatura) {
            echo json_encode(['error' => 'Fatura bulunamadı']);
            exit;
        }
        
        // Fatura ayarlarını al
        $sql = "SELECT ayar_adi, ayar_degeri FROM sistem_ayarlari WHERE ayar_adi LIKE 'fatura_%'";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $fatura_ayarlari = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        $fatura['fatura_ayarlari'] = $fatura_ayarlari;
        
        echo json_encode(['success' => true, 'data' => $fatura]);
        break;
        
    case 'list':
        // Fatura listesi
        $user_id = $_GET['user_id'] ?? 0;
        
        $sql = "SELECT f.*, u.username, u.email 
                FROM faturalar f
                JOIN users u ON f.user_id = u.id";
        
        if ($user_id > 0) {
            $sql .= " WHERE f.user_id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$user_id]);
        } else {
            $sql .= " ORDER BY f.tarih DESC";
            $stmt = $conn->prepare($sql);
            $stmt->execute();
        }
        
        $faturalar = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $faturalar]);
        break;
        
    case 'generate_pdf':
        // PDF fatura oluştur
        $fatura_id = $_GET['fatura_id'] ?? 0;
        
        // Fatura verilerini al
        // Veritabanı bağlantısını oluştur
        $conn = db_connect();
        
        $sql = "SELECT f.*, u.username, u.email, u.telefon, u.ad_soyad 
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
            exit;
        }
        
        // Fatura ayarlarını al
        $sql = "SELECT ayar_adi, ayar_degeri FROM sistem_ayarlari WHERE ayar_adi LIKE 'fatura_%'";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        $fatura_ayarlari = [];
        while ($row = $result->fetch_assoc()) {
            $fatura_ayarlari[$row['ayar_adi']] = $row['ayar_degeri'];
        }
        
        // HTML fatura şablonu oluştur
        $html = generateInvoiceHTML($fatura, $fatura_ayarlari);
        
        // PDF oluştur (basit HTML döndür, gerçek PDF için TCPDF veya mPDF kullanılabilir)
        header('Content-Type: text/html');
        echo $html;
        break;
        
    default:
        echo json_encode(['error' => 'Geçersiz işlem']);
        break;
}

function generateInvoiceHTML($fatura, $fatura_ayarlari) {
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>E-Fatura - ' . $fatura['fatura_no'] . '</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: "Segoe UI", Arial, sans-serif; background: #f8f9fa; color: #333; }
            .invoice-container { max-width: 800px; margin: 20px auto; background: white; border-radius: 20px; box-shadow: 0 15px 40px rgba(0,0,0,0.1); overflow: hidden; }
            
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; position: relative; }
            .company-logo { display: flex; align-items: center; margin-bottom: 25px; }
            .logo-icon { width: 60px; height: 60px; background: linear-gradient(45deg, #ffd700, #ffed4e); border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; color: #333; margin-right: 20px; }
            .company-name { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
            .company-info { font-size: 16px; opacity: 0.9; line-height: 1.5; }
            .qr-code { position: absolute; top: 40px; right: 40px; text-align: center; }
            .qr-placeholder { width: 100px; height: 100px; background: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; font-size: 14px; color: #333; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            
            .content { padding: 40px; }
            .section { margin-bottom: 35px; }
            .section-title { font-size: 22px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; display: flex; align-items: center; }
            .section-title i { margin-right: 15px; color: #667eea; font-size: 24px; }
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
            .info-item { margin-bottom: 20px; }
            .info-label { font-size: 13px; color: #7f8c8d; margin-bottom: 8px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
            .info-value { font-size: 18px; font-weight: 500; color: #2c3e50; }
            
            .amount-highlight { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; text-align: center; margin: 30px 0; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3); }
            .amount-label { font-size: 16px; opacity: 0.9; margin-bottom: 8px; }
            .amount-value { font-size: 42px; font-weight: 700; }
            
            .items-table { width: 100%; border-collapse: collapse; margin: 25px 0; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
            .items-table th { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: left; font-weight: 600; font-size: 16px; }
            .items-table td { padding: 18px 20px; border-bottom: 1px solid #ecf0f1; font-size: 15px; }
            .items-table tr:hover { background: #f8f9fa; }
            
            .payment-methods { display: flex; justify-content: center; gap: 20px; margin: 40px 0; }
            .payment-method { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
            .payment-btc { background: linear-gradient(45deg, #f7931a, #ffd700); }
            .payment-eth { background: linear-gradient(45deg, #627eea, #764ba2); }
            .payment-usdt { background: linear-gradient(45deg, #26a69a, #4db6ac); }
            
            .footer { background: #ecf0f1; padding: 30px; text-align: center; color: #7f8c8d; font-size: 14px; }
            
            .invoice-number { background: rgba(255,255,255,0.1); padding: 15px 25px; border-radius: 10px; display: inline-block; margin-bottom: 20px; }
            .invoice-number h2 { font-size: 24px; font-weight: 600; margin: 0; }
            
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .status-paid { background: #d4edda; color: #155724; }
            
            @media print {
                body { background: white; }
                .invoice-container { box-shadow: none; margin: 0; }
            }
            
            @media (max-width: 768px) {
                .invoice-container { margin: 10px; border-radius: 15px; }
                .header { padding: 25px; }
                .content { padding: 25px; }
                .company-name { font-size: 24px; }
                .amount-value { font-size: 32px; }
                .info-grid { grid-template-columns: 1fr; gap: 15px; }
                .qr-code { position: static; margin-top: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="header">
                <div class="company-logo">
                    <div class="logo-icon">COINOVA</div>
                    <div>
                        <div class="company-name">' . ($fatura_ayarlari['fatura_sirket_adi'] ?? 'Crypto Finance Ltd.') . '</div>
                        <div class="company-info">
                            ' . ($fatura_ayarlari['fatura_adres'] ?? 'İstanbul, Türkiye') . '<br>
                            Tel: ' . ($fatura_ayarlari['fatura_telefon'] ?? '+90 212 555 0123') . ' | 
                            E-posta: ' . ($fatura_ayarlari['fatura_email'] ?? 'info@cryptofinance.com') . '
                        </div>
                    </div>
                </div>
                <div class="qr-code">
                    <div class="qr-placeholder">QR</div>
                    <div style="font-size: 12px; opacity: 0.8;">coinovamarket.com</div>
                    <div style="font-size: 10px; opacity: 0.6;">Güvenli Ödeme</div>
                </div>
            </div>
            
            <div class="content">
                <div class="section">
                    <div class="invoice-number">
                        <h2>FATURA NO: ' . $fatura['fatura_no'] . '</h2>
                        <span class="status-badge status-paid">ÖDENDİ</span>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">
                        <i class="fas fa-user"></i>
                        Müşteri Bilgileri
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Ad Soyad</div>
                            <div class="info-value">' . ($fatura['ad_soyad'] ?? $fatura['username']) . '</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Kullanıcı Adı</div>
                            <div class="info-value">' . $fatura['username'] . '</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">E-posta</div>
                            <div class="info-value">' . $fatura['email'] . '</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Telefon</div>
                            <div class="info-value">' . ($fatura['telefon'] ?? 'Belirtilmemiş') . '</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">İşlem Tarihi</div>
                            <div class="info-value">' . date('d.m.Y H:i', strtotime($fatura['tarih'])) . '</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">İşlem Tipi</div>
                            <div class="info-value">' . ucfirst(str_replace('_', ' ', $fatura['islem_tipi'])) . '</div>
                        </div>
                    </div>
                </div>
                
                <div class="amount-highlight">
                    <div class="amount-label">Ödenecek Tutar</div>
                    <div class="amount-value">' . number_format($fatura['toplam_tutar'], 2, ',', '.') . ' ₺</div>
                </div>
                
                <table class="items-table">
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
                            <td>Para Çekme İşlemi</td>
                            <td>1</td>
                            <td>' . number_format($fatura['tutar'], 2, ',', '.') . ' ₺</td>
                            <td>' . number_format($fatura['tutar'], 2, ',', '.') . ' ₺</td>
                        </tr>
                        <tr>
                            <td>KDV (%' . $fatura['kdv_orani'] . ')</td>
                            <td>1</td>
                            <td>' . number_format($fatura['kdv_tutari'], 2, ',', '.') . ' ₺</td>
                            <td>' . number_format($fatura['kdv_tutari'], 2, ',', '.') . ' ₺</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="section">
                    <div class="section-title">
                        <i class="fas fa-credit-card"></i>
                        Ödeme Yöntemleri
                    </div>
                    <div class="payment-methods">
                        <div class="payment-method payment-btc">₿</div>
                        <div class="payment-method payment-eth">Ξ</div>
                        <div class="payment-method payment-usdt">₮</div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Bu fatura elektronik ortamda oluşturulmuştur ve imza gerektirmez.</p>
                    <p>© 2024 ' . ($fatura_ayarlari['fatura_sirket_adi'] ?? 'Crypto Finance Ltd.') . ' - Tüm hakları saklıdır.</p>
                </div>
            </div>
        </div>
    </body>
    </html>';
    
    return $html;
}
                            <th>TOPLAM</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Ödeme açıklaması :' . str_pad($fatura['id'], 4, '0', STR_PAD_LEFT) . '</td>
                            <td>1</td>
                            <td>' . number_format($fatura['tutar'], 2, ',', '.') . ' ₺</td>
                            <td>' . number_format($fatura['tutar'], 2, ',', '.') . ' ₺</td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="text-align: right; margin: 20px 0;">
                    <div style="margin: 10px 0;">
                        <span style="font-weight: 600;">Ara Toplam:</span>
                        <span style="margin-left: 20px;">' . number_format($fatura['tutar'], 2, ',', '.') . ' ₺</span>
                    </div>
                    <div style="margin: 10px 0;">
                        <span style="font-weight: 600;">Genel Toplam:</span>
                        <span style="margin-left: 20px; font-size: 18px; font-weight: 700; color: #667eea;">' . number_format($fatura['toplam_tutar'], 2, ',', '.') . ' ₺</span>
                    </div>
                </div>
                
                <div class="payment-methods">
                    <div class="payment-method payment-btc">B</div>
                    <div class="payment-method payment-eth">Ξ</div>
                    <div class="payment-method payment-usdt">T</div>
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