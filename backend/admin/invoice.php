<?php
session_start();
require_once '../config.php';
require_once '../utils/security.php';

// Admin kontrolü
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Yetkisiz erişim']);
    exit;
}

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'create':
        // Fatura oluştur
        $user_id = $_POST['user_id'] ?? 0;
        $islem_tipi = $_POST['islem_tipi'] ?? '';
        $islem_id = $_POST['islem_id'] ?? 0;
        $tutar = $_POST['tutar'] ?? 0;
        
        // Kullanıcı bilgilerini al
        $sql = "SELECT * FROM users WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            echo json_encode(['error' => 'Kullanıcı bulunamadı']);
            exit;
        }
        
        // Fatura ayarlarını al
        $sql = "SELECT ayar_adi, ayar_degeri FROM sistem_ayarlari WHERE ayar_adi LIKE 'fatura_%'";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $fatura_ayarlari = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
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
        $result = $stmt->execute([$user_id, $islem_tipi, $islem_id, $fatura_no, $tutar, $kdv_orani, $kdv_tutari, $toplam_tutar]);
        
        if ($result) {
            $fatura_id = $conn->lastInsertId();
            
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
        <title>Fatura - ' . $fatura['fatura_no'] . '</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .invoice { background: white; max-width: 800px; margin: 0 auto; padding: 40px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 2px solid #00d4aa; padding-bottom: 20px; margin-bottom: 30px; }
            .company-info { float: left; }
            .invoice-info { float: right; text-align: right; }
            .clear { clear: both; }
            .customer-info { margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 5px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            .items-table th { background: #00d4aa; color: white; }
            .total-section { text-align: right; margin-top: 30px; }
            .total-row { margin: 10px 0; }
            .total-amount { font-size: 24px; font-weight: bold; color: #00d4aa; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="invoice">
            <div class="header">
                <h1>' . ($fatura_ayarlari['fatura_sirket_adi'] ?? 'Crypto Trading Platform') . '</h1>
                <p>' . ($fatura_ayarlari['fatura_adres'] ?? 'Adres bilgisi') . '</p>
                <p>Tel: ' . ($fatura_ayarlari['fatura_telefon'] ?? '') . ' | Email: ' . ($fatura_ayarlari['fatura_email'] ?? '') . '</p>
            </div>
            
            <div class="company-info">
                <h3>Fatura Bilgileri</h3>
                <p><strong>Fatura No:</strong> ' . $fatura['fatura_no'] . '</p>
                <p><strong>Tarih:</strong> ' . date('d.m.Y H:i', strtotime($fatura['tarih'])) . '</p>
            </div>
            
            <div class="invoice-info">
                <h3>Müşteri Bilgileri</h3>
                <p><strong>Ad Soyad:</strong> ' . $fatura['ad_soyad'] . '</p>
                <p><strong>Email:</strong> ' . $fatura['email'] . '</p>
                <p><strong>Telefon:</strong> ' . $fatura['telefon'] . '</p>
            </div>
            
            <div class="clear"></div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Açıklama</th>
                        <th>Tutar</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>' . ucfirst($fatura['islem_tipi']) . ' İşlemi</td>
                        <td>₺' . number_format($fatura['tutar'], 2, ',', '.') . '</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="total-section">
                <div class="total-row">
                    <span>Ara Toplam:</span>
                    <span>₺' . number_format($fatura['tutar'], 2, ',', '.') . '</span>
                </div>
                <div class="total-row">
                    <span>KDV (%' . $fatura['kdv_orani'] . '):</span>
                    <span>₺' . number_format($fatura['kdv_tutari'], 2, ',', '.') . '</span>
                </div>
                <div class="total-row total-amount">
                    <span>Genel Toplam:</span>
                    <span>₺' . number_format($fatura['toplam_tutar'], 2, ',', '.') . '</span>
                </div>
            </div>
            
            <div class="footer">
                <p>Bu belge elektronik ortamda oluşturulmuştur.</p>
                <p>Vergi No: ' . ($fatura_ayarlari['fatura_vergi_no'] ?? '') . '</p>
            </div>
        </div>
    </body>
    </html>';
    
    return $html;
}
?> 