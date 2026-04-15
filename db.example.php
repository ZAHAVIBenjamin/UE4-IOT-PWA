<?php
$host = "localhost";
$user = "TON_UTILISATEUR";
$pass = "TON_MOT_DE_PASSE";
$db   = "TA_BASE_DE_DONNEES";


try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["erreur" => "Erreur de connexion DB : " . $e->getMessage()]));
}
?>