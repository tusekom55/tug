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
    case 'list':
        // Tüm ayarları listele
        $sql = "SELECT * FROM sistem_ayarlari ORDER BY ayar_adi";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $settings]);
        break;
        
    case 'update':
        // Ayar güncelle
        $ayar_adi = $_POST['ayar_adi'] ?? '';
        $ayar_degeri = $_POST['ayar_degeri'] ?? '';
        
        if (empty($ayar_adi)) {
            echo json_encode(['error' => 'Ayar adı gerekli']);
            exit;
        }
        
        $sql = "UPDATE sistem_ayarlari SET ayar_degeri = ? WHERE ayar_adi = ?";
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute([$ayar_degeri, $ayar_adi]);
        
        if ($result) {
            // Log kaydı
            $sql = "INSERT INTO admin_islem_loglari 
                    (admin_id, islem_tipi, hedef_id, islem_detayi) 
                    VALUES (?, 'ayar_guncelleme', 0, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$_SESSION['user_id'], "Ayar güncellendi: $ayar_adi"]);
            
            echo json_encode(['success' => true, 'message' => 'Ayar güncellendi']);
        } else {
            echo json_encode(['error' => 'Güncelleme başarısız']);
        }
        break;
        
    case 'get':
        // Belirli bir ayarı getir
        $ayar_adi = $_GET['ayar_adi'] ?? '';
        
        if (empty($ayar_adi)) {
            echo json_encode(['error' => 'Ayar adı gerekli']);
            exit;
        }
        
        $sql = "SELECT * FROM sistem_ayarlari WHERE ayar_adi = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$ayar_adi]);
        $setting = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$setting) {
            echo json_encode(['error' => 'Ayar bulunamadı']);
            exit;
        }
        
        echo json_encode(['success' => true, 'data' => $setting]);
        break;
        
    case 'payment_methods':
        // Ödeme yöntemleri ayarlarını getir
        $payment_settings = [
            'papara_numara' => '',
            'banka_adi' => '',
            'banka_iban' => '',
            'banka_hesap_sahibi' => '',
            'kart_komisyon_orani' => '2.5',
            'papara_komisyon_orani' => '1.0',
            'havale_komisyon_orani' => '0.0',
            'minimum_cekme_tutari' => '50',
            'maksimum_cekme_tutari' => '10000'
        ];
        
        $sql = "SELECT ayar_adi, ayar_degeri FROM sistem_ayarlari WHERE ayar_adi IN ('" . implode("','", array_keys($payment_settings)) . "')";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($settings as $setting) {
            $payment_settings[$setting['ayar_adi']] = $setting['ayar_degeri'];
        }
        
        echo json_encode(['success' => true, 'data' => $payment_settings]);
        break;
        
    case 'invoice_settings':
        // Fatura ayarlarını getir
        $invoice_settings = [
            'fatura_sirket_adi' => 'Crypto Trading Platform',
            'fatura_adres' => '',
            'fatura_vergi_no' => '',
            'fatura_telefon' => '',
            'fatura_email' => ''
        ];
        
        $sql = "SELECT ayar_adi, ayar_degeri FROM sistem_ayarlari WHERE ayar_adi IN ('" . implode("','", array_keys($invoice_settings)) . "')";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($settings as $setting) {
            $invoice_settings[$setting['ayar_adi']] = $setting['ayar_degeri'];
        }
        
        echo json_encode(['success' => true, 'data' => $invoice_settings]);
        break;
        
    default:
        echo json_encode(['error' => 'Geçersiz işlem']);
        break;
}
?> 