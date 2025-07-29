<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/utils/security.php';

// Kullanıcı kaydı
function register_user($username, $email, $password) {
    $conn = db_connect();
    $username = sanitize_input($conn, $username);
    $email = sanitize_input($conn, $email);
    // Şifreyi hashlemeden düz metin olarak kaydet
    $stmt = $conn->prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    $stmt->bind_param('sss', $username, $email, $password);
    $result = $stmt->execute();
    $stmt->close();
    $conn->close();
    return $result;
}

// Kullanıcı girişi
function login_user($username, $password) {
    $conn = db_connect();
    $username = sanitize_input($conn, $username);
    $stmt = $conn->prepare('SELECT id, password, role FROM users WHERE username = ?');
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows === 1) {
        $stmt->bind_result($id, $stored_password, $role);
        $stmt->fetch();
        // Düz metin şifre kontrolü
        if ($password === $stored_password) {
            $_SESSION['user_id'] = $id;
            $_SESSION['role'] = $role;
            $stmt->close();
            $conn->close();
            return true;
        }
    }
    $stmt->close();
    $conn->close();
    return false;
}

// Oturum kontrolü
function is_logged_in() {
    return isset($_SESSION['user_id']);
}

// Admin kontrolü
function is_admin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

// Çıkış
function logout_user() {
    session_destroy();
} 