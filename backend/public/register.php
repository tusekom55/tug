<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    
    // Debug için
    error_log("Register attempt - Username: $username, Email: $email");
    
    if (empty($username) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Tüm alanları doldurun']);
        exit;
    }
    
    try {
        if (register_user($username, $email, $password)) {
            echo json_encode(['success' => true, 'message' => 'Kayıt başarılı']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Kayıt başarısız - Veritabanı hatası']);
        }
    } catch (Exception $e) {
        error_log("Register error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Hata: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Geçersiz istek']);
} 