<?php
require_once __DIR__ . '/../auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    if (login_user($username, $password)) {
        echo json_encode(['success' => true, 'message' => 'Giriş başarılı']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Kullanıcı adı veya şifre hatalı']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Geçersiz istek']);
} 