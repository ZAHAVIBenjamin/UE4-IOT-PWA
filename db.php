<?php


$host = "localhost";
$user = "roni4736_zahavi_benjamin";
$pass = "(wQFU7QVQ!B2";
$db   = "roni4736_zahavi_benjamin_ue4";

try {
    // Création de l'objet PDO ($pdo) qui sera utilisable partout
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    // Si la connexion échoue, on arrête tout et on renvoie une erreur au format JSON
    die(json_encode(["erreur" => "Erreur de connexion DB : " . $e->getMessage()]));
}
?>
