<?php
  require("db.php");
  $id = (int)$_REQUEST['id'];
  echo $db->query("DELETE FROM todo WHERE id='$id'");
  $db->close();
?>
