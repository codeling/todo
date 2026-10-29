<?php
// (makes failRequest() answer with JSON, see response.php)
const TODO_API_REQUEST = true;
require("db.php");
$db = todoDb();
$user_id = (int)todoUserId();
sendJson(jsonQueryResults($db, "SELECT id, name FROM list WHERE user_id=?", array($user_id)));
