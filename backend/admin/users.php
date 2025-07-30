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
        // Tüm kullanıcıları listele
        $sql = "SELECT 
                    u.id, u.username, u.email, u.telefon, u.ad_soyad, u.tc_no,
                    u.balance, u.role, u.is_active, u.created_at, u.son_giris,
                    COUNT(pyt.id) as yatirma_talep_sayisi,
                    COUNT(pct.id) as cekme_talep_sayisi,
                    COUNT(cig.id) as islem_sayisi
                FROM users u
                LEFT JOIN para_yatirma_talepleri pyt ON u.id = pyt.user_id
                LEFT JOIN para_cekme_talepleri pct ON u.id = pct.user_id
                LEFT JOIN kullanici_islem_gecmisi cig ON u.id = cig.user_id
                WHERE u.role = 'user'
                GROUP BY u.id
                ORDER BY u.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $users]);
        break;
        
    case 'detail':
        // Kullanıcı detayları
        $user_id = $_GET['user_id'] ?? 0;
        
        $sql = "SELECT 
                    u.*, 
                    COUNT(pyt.id) as yatirma_talep_sayisi,
                    COUNT(pct.id) as cekme_talep_sayisi,
                    COUNT(cig.id) as islem_sayisi
                FROM users u
                LEFT JOIN para_yatirma_talepleri pyt ON u.id = pyt.user_id
                LEFT JOIN para_cekme_talepleri pct ON u.id = pct.user_id
                LEFT JOIN kullanici_islem_gecmisi cig ON u.id = cig.user_id
                WHERE u.id = ?
                GROUP BY u.id";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([$user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            echo json_encode(['error' => 'Kullanıcı bulunamadı']);
            exit;
        }
        
        // İşlem geçmişi
        $sql = "SELECT * FROM kullanici_islem_gecmisi 
                WHERE user_id = ? 
                ORDER BY tarih DESC 
                LIMIT 50";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$user_id]);
        $islem_gecmisi = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Para yatırma talepleri
        $sql = "SELECT * FROM para_yatirma_talepleri 
                WHERE user_id = ? 
                ORDER BY tarih DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$user_id]);
        $yatirma_talepleri = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Para çekme talepleri
        $sql = "SELECT * FROM para_cekme_talepleri 
                WHERE user_id = ? 
                ORDER BY tarih DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$user_id]);
        $cekme_talepleri = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true, 
            'data' => [
                'user' => $user,
                'islem_gecmisi' => $islem_gecmisi,
                'yatirma_talepleri' => $yatirma_talepleri,
                'cekme_talepleri' => $cekme_talepleri
            ]
        ]);
        break;
        
    case 'update':
        // Kullanıcı güncelle
        $user_id = $_POST['user_id'] ?? 0;
        $balance = $_POST['balance'] ?? 0;
        $is_active = $_POST['is_active'] ?? 1;
        
        $sql = "UPDATE users SET balance = ?, is_active = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute([$balance, $is_active, $user_id]);
        
        if ($result) {
            // Log kaydı
            $sql = "INSERT INTO admin_islem_loglari (admin_id, islem_tipi, hedef_id, islem_detayi) 
                    VALUES (?, 'kullanici_duzenleme', ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$_SESSION['user_id'], $user_id, "Bakiye: $balance, Aktif: $is_active"]);
            
            echo json_encode(['success' => true, 'message' => 'Kullanıcı güncellendi']);
        } else {
            echo json_encode(['error' => 'Güncelleme başarısız']);
        }
        break;
        
    case 'delete':
        // Kullanıcı sil
        $user_id = $_POST['user_id'] ?? 0;
        
        // Önce kullanıcının aktif talepleri var mı kontrol et
        $sql = "SELECT COUNT(*) FROM para_yatirma_talepleri WHERE user_id = ? AND durum = 'beklemede'";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$user_id]);
        $aktif_yatirma = $stmt->fetchColumn();
        
        $sql = "SELECT COUNT(*) FROM para_cekme_talepleri WHERE user_id = ? AND durum = 'beklemede'";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$user_id]);
        $aktif_cekme = $stmt->fetchColumn();
        
        if ($aktif_yatirma > 0 || $aktif_cekme > 0) {
            echo json_encode(['error' => 'Kullanıcının aktif talepleri var. Önce bunları işleyin.']);
            exit;
        }
        
        $sql = "DELETE FROM users WHERE id = ? AND role = 'user'";
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute([$user_id]);
        
        if ($result) {
            // Log kaydı
            $sql = "INSERT INTO admin_islem_loglari (admin_id, islem_tipi, hedef_id, islem_detayi) 
                    VALUES (?, 'kullanici_silme', ?, 'Kullanıcı silindi')";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$_SESSION['user_id'], $user_id]);
            
            echo json_encode(['success' => true, 'message' => 'Kullanıcı silindi']);
        } else {
            echo json_encode(['error' => 'Silme başarısız']);
        }
        break;
        
    default:
        echo json_encode(['error' => 'Geçersiz işlem']);
        break;
}
?> 