<?php
// Configuration de la base de données (ici localhost car le fichier est SUR le serveur)
$host = "localhost";
$user = "roni4736_zahavi_benjamin";
$pass = "(wQFU7QVQ!B2";
$db   = "roni4736_zahavi_benjamin_ue4";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    
    // On récupère les données envoyées par Python
    if (isset($_POST['nbFeuRouge'])) {
        $nb = intval($_POST['nbFeuRouge']);
        
        // Insertion dans la table feuRouge
        $sql = "SELECT DATE(date_enregistrement) as jour, COUNT(id) as total_feux 
            FROM feuRouge 
            GROUP BY DATE(date_enregistrement) 
            ORDER BY jour DESC 
            LIMIT 7";
        $stmt->execute([$nb]);
        
        echo "Succès : Donnée enregistrée";
    }
} catch (PDOException $e) {
    echo "Erreur : " . $e->getMessage();
}
?>