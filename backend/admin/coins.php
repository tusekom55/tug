<?php
require_once __DIR__ . '/../auth.php';
if (!is_admin()) {
    echo json_encode(['success' => false, 'message' => 'Yetkisiz erişim']);
    exit;
}
$conn = db_connect();
$action = $_GET['action'] ?? '';

if ($action === 'list') {
    $sql = 'SELECT coins.id, coins.coin_adi, coins.coin_kodu, coin_kategorileri.kategori_adi FROM coins LEFT JOIN coin_kategorileri ON coins.kategori_id = coin_kategorileri.id';
    $result = $conn->query($sql);
    $coins = [];
    while ($row = $result->fetch_assoc()) {
        $coins[] = $row;
    }
    echo json_encode(['success' => true, 'coins' => $coins]);
}
elseif ($action === 'add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $coin_adi = $_POST['coin_adi'] ?? '';
    $coin_kodu = $_POST['coin_kodu'] ?? '';
    $kategori_id = $_POST['kategori_id'] ?? null;
    $stmt = $conn->prepare('INSERT INTO coins (coin_adi, coin_kodu, kategori_id) VALUES (?, ?, ?)');
    $stmt->bind_param('ssi', $coin_adi, $coin_kodu, $kategori_id);
    $ok = $stmt->execute();
    $stmt->close();
    echo json_encode(['success' => $ok]);
}
elseif ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = $_POST['id'] ?? 0;
    $stmt = $conn->prepare('DELETE FROM coins WHERE id = ?');
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $stmt->close();
    echo json_encode(['success' => $ok]);
}
elseif ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = $_POST['id'] ?? 0;
    $coin_adi = $_POST['coin_adi'] ?? '';
    $coin_kodu = $_POST['coin_kodu'] ?? '';
    $kategori_id = $_POST['kategori_id'] ?? null;
    $stmt = $conn->prepare('UPDATE coins SET coin_adi = ?, coin_kodu = ?, kategori_id = ? WHERE id = ?');
    $stmt->bind_param('ssii', $coin_adi, $coin_kodu, $kategori_id, $id);
    $ok = $stmt->execute();
    $stmt->close();
    echo json_encode(['success' => $ok]);
}
else {
    echo json_encode(['success' => false, 'message' => 'Geçersiz istek']);
}
$conn->close(); 