<?php
require_once __DIR__ . '/../auth.php';
$conn = db_connect();
$sql = 'SELECT coins.id, coins.coin_adi, coins.coin_kodu, coin_kategorileri.kategori_adi FROM coins LEFT JOIN coin_kategorileri ON coins.kategori_id = coin_kategorileri.id';
$result = $conn->query($sql);
$coins = [];
while ($row = $result->fetch_assoc()) {
    $coins[] = $row;
}
$conn->close();
echo json_encode(['success' => true, 'coins' => $coins]); 