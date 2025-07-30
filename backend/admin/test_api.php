<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS request için
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';

// Debug için action'ı logla
error_log("Test API called with action: '" . $action . "'");
error_log("GET parameters: " . print_r($_GET, true));

// Action boşsa hata döndür
if (empty($action)) {
    echo json_encode(['error' => 'Action parametresi gerekli']);
    exit;
}

try {
    switch ($action) {
        case 'users':
            // Tüm kullanıcıları listele
            $sql = "SELECT 
                        u.id, u.username, u.email, u.telefon, u.ad_soyad, u.tc_no,
                        u.balance, u.role, u.is_active, u.created_at, u.son_giris
                    FROM users u
                    WHERE u.role = 'user'
                    ORDER BY u.created_at DESC";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $users]);
            break;
            
        case 'withdrawals':
            // Para çekme taleplerini listele
            $sql = "SELECT
                        pct.*,
                        u.username, u.email, u.telefon, u.ad_soyad,
                        a.username as admin_username
                    FROM para_cekme_talepleri pct
                    JOIN users u ON pct.user_id = u.id
                    LEFT JOIN users a ON pct.onaylayan_admin_id = a.id
                    ORDER BY pct.tarih DESC";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $withdrawals = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $withdrawals]);
            break;
            
        case 'invoices':
            // Faturaları listele
            $sql = "SELECT f.*, u.username, u.email
                    FROM faturalar f
                    JOIN users u ON f.user_id = u.id
                    ORDER BY f.tarih DESC";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $invoices]);
            break;
            
        case 'settings':
            // Sistem ayarlarını listele
            $sql = "SELECT * FROM sistem_ayarlari ORDER BY ayar_adi";
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $settings]);
            break;
            
        case 'dashboard':
            // Dashboard istatistikleri
            $sql = "SELECT COUNT(*) as total_users FROM users WHERE role = 'user'";
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $total_users = $stmt->fetchColumn();
            
            $sql = "SELECT COUNT(*) as pending_withdrawals FROM para_cekme_talepleri WHERE durum = 'beklemede'";
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $pending_withdrawals = $stmt->fetchColumn();
            
            $sql = "SELECT COUNT(*) as total_invoices FROM faturalar";
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $total_invoices = $stmt->fetchColumn();
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'total_users' => $total_users,
                    'pending_withdrawals' => $pending_withdrawals,
                    'total_revenue' => $total_users * 1000,
                    'total_invoices' => $total_invoices
                ]
            ]);
            break;
            
        default:
            echo json_encode(['error' => 'Geçersiz işlem: ' . $action]);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['error' => 'Veritabanı hatası: ' . $e->getMessage()]);
}
?> 