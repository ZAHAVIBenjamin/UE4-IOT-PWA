<?php
// Autoriser la PWA à communiquer avec ce fichier et définir le format JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json; charset=UTF-8");


require_once 'db.php';

// Récupération et sécurisation des données envoyées par app.js
$dfr = isset($_POST['dfr']) ? intval($_POST['dfr']) : null;
$melody = isset($_POST['melody']) ? htmlspecialchars($_POST['melody']) : null;

if ($dfr && $melody) {
    try {
        // MAJ
        $sql = "UPDATE configuration SET dfr = :dfr, melodie = :melodie WHERE id = 1";
        $stmt = $pdo->prepare($sql);
        
        $stmt->execute([
            ':dfr' => $dfr,
            ':melodie' => $melody
        ]);
        
        echo json_encode(["success" => true, "message" => "Configuration mise à jour avec succès"]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "erreur" => "Erreur SQL : " . $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "erreur" => "Données manquantes (dfr ou melody)"]);
}
?>