<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db.php';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // On récupère les 50 dernières entrées du capteur
    $sql = "SELECT date_enregistrement FROM feuRouge ORDER BY date_enregistrement DESC LIMIT 50";
            
    $stmt = $pdo->query($sql);
    $donnees = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($donnees);

} catch (PDOException $e) {
    echo json_encode(["erreur" => $e->getMessage()]);
}
?>