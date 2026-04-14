<?php
require_once 'db.php';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if (isset($_POST['nbFeuRouge'])) {
        $nb = intval($_POST['nbFeuRouge']);
        
        $sql = "INSERT INTO feuRouge (date_enregistrement) VALUES (NOW())";
        $stmt = $pdo->prepare($sql);
        
        $stmt->execute();
        
        echo "✅ Succès : Feu rouge enregistrée dans la base";
    } else {
        echo "⚠️ Erreur : Aucune donnée nbFeuRouge reçue";
    }

} catch (PDOException $e) {
    echo "❌ Erreur de base de données : " . $e->getMessage();
}
?>