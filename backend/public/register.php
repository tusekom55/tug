<?php
require_once __DIR__ . '/../auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    if (register_user($username, $email, $password)) {
        echo json_encode(['success' => true, 'message' => 'Kayıt başarılı']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Kayıt başarısız']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Geçersiz istek']);
} 