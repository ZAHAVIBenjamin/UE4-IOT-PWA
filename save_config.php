<?php
// En-têtes pour autoriser la PWA à communiquer avec ce fichier (CORS) et définir le format JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json; charset=UTF-8");

// On inclut ta connexion PDO existante
require_once 'db.php';

// Récupération et sécurisation des données envoyées par app.js
$dfr = isset($_POST['dfr']) ? intval($_POST['dfr']) : null;
$melody = isset($_POST['melody']) ? htmlspecialchars($_POST['melody']) : null;

// Si les deux valeurs sont bien reçues
if ($dfr && $melody) {
    try {
        // On met à jour UNIQUEMENT la ligne avec l'id 1
        $sql = "UPDATE configuration SET dfr = :dfr, melodie = :melodie WHERE id = 1";
        $stmt = $pdo->prepare($sql);
        
        // Exécution de la requête avec les paramètres sécurisés
        $stmt->execute([
            ':dfr' => $dfr,
            ':melodie' => $melody
        ]);
        
        // On renvoie un succès au format JSON pour que app.js l'interprète
        echo json_encode(["success" => true, "message" => "Configuration mise à jour avec succès"]);
        
    } catch (PDOException $e) {
        http_response_code(500); // Erreur serveur
        echo json_encode(["success" => false, "erreur" => "Erreur SQL : " . $e->getMessage()]);
    }
} else {
    http_response_code(400); // Mauvaise requête
    echo json_encode(["success" => false, "erreur" => "Données manquantes (dfr ou melody)"]);
}
?>