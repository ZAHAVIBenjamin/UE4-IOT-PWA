<?php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db.php';

try {
    // Dernier ordre "ATTENTE"
    $stmt = $pdo->query("SELECT id, action FROM commandes WHERE etat = 'ATTENTE' ORDER BY id ASC LIMIT 1");
    $cmd = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($cmd) {
        // Si on en trouve un, on le marque comme "LU"
        $pdo->query("UPDATE commandes SET etat = 'LU' WHERE id = " . $cmd['id']);
        echo json_encode(["commande" => $cmd['action']]);
    } else {
        echo json_encode(["commande" => "RIEN"]);
    }
} catch (PDOException $e) {
    echo json_encode(["erreur" => $e->getMessage()]);
}
?>