 <?php
	require("db.php");
	$result = jsonQueryResults($db, "SELECT id, name FROM list");
	$db->close();
	echo $result;
?>
