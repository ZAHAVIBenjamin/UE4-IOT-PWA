<?php
// get_config.php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db.php';

try {
    // On va chercher la configuration active (id = 1)
    $stmt = $pdo->query("SELECT dfr, melodie FROM configuration WHERE id = 1");
    $config = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // On renvoie le résultat (ex: {"dfr": 5000, "melodie": "A"})
    echo json_encode($config);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["erreur" => $e->getMessage()]);
}
?>