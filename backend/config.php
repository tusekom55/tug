<?php
// Veritabanı bağlantı ayarları
$DB_HOST = 'localhost';
$DB_USER = 'u225998063_dbt';
$DB_PASS = '123456Tubb';
$DB_NAME = 'u225998063_tugay';

// Bağlantı fonksiyonu (mysqli, hata kontrolü ile)
function db_connect() {
    global $DB_HOST, $DB_USER, $DB_PASS, $DB_NAME;
    $conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
    if ($conn->connect_error) {
        die('Veritabanı bağlantı hatası: ' . $conn->connect_error);
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}
// Oturum başlat
if (session_status() === PHP_SESSION_NONE) {
    session_start();
} 