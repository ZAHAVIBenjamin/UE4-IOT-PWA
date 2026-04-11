<?php
header("Access-Control-Allow-Origin: *");
require_once 'db.php';

try {
    // On ajoute l'ordre dans la base de données
    $stmt = $pdo->prepare("INSERT INTO commandes (action, etat) VALUES ('FORCE_ROUGE', 'ATTENTE')");
    $stmt->execute();
    echo json_encode(["success" => true, "message" => "Ordre envoyé"]);
} catch (PDOException $e) {
    echo json_encode(["erreur" => $e->getMessage()]);
}
?>