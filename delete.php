<?php
  require("db.php");
  $id = (int)$_POST['id'];
  echo $db->query("DELETE FROM todo WHERE id='$id'");
  $db->close();
?>
