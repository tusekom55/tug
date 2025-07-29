<?php
require_once __DIR__ . '/../config.php';
function add_log($user_id, $tip, $detay) {
    $conn = db_connect();
    $stmt = $conn->prepare('INSERT INTO loglar (user_id, tip, detay) VALUES (?, ?, ?)');
    $stmt->bind_param('iss', $user_id, $tip, $detay);
    $stmt->execute();
    $stmt->close();
    $conn->close();
} 