<?php
require_once __DIR__ . '/../auth.php';
if (!is_logged_in()) {
    echo json_encode(['success' => false, 'message' => 'Giriş gerekli']);
    exit;
}
$conn = db_connect();
$user_id = $_SESSION['user_id'];
$stmt = $conn->prepare('SELECT id, username, email, role, balance, created_at FROM users WHERE id = ?');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$result = $stmt->get_result();
if ($user = $result->fetch_assoc()) {
    echo json_encode(['success' => true, 'user' => $user]);
} else {
    echo json_encode(['success' => false, 'message' => 'Kullanıcı bulunamadı']);
}
$stmt->close();
$conn->close(); 