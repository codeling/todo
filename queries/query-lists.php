<?php
require("db.php");
$user_id = (int)$curUserID;
sendJson(jsonQueryResults($db, "SELECT id, name FROM list WHERE user_id=?", array($user_id)));
