<?php
  require("db.php");
  $id = (int)$_REQUEST['id'];
  $completed = (int)$_REQUEST['completed'];
  echo $db->query("UPDATE todo SET completed=$completed, completionDate=NOW() WHERE id=$id");
  $db->close();
?>
