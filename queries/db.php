<?php
$prefix = (isset($prefix)? $prefix : "../");
require_once($prefix."config.php");
require_once(__DIR__."/../todo-core.php");
$db = new mysqli($db_host, $db_user, $db_password, $db_database);

// stop with an error message unless the given list belongs to the current user
function requireOwnList($db, $list_id) {
    global $curUserID;
    $qResult = dbQueryOrDie($db, "SELECT 1 FROM list WHERE id=".(int)$list_id." AND user_id=".(int)$curUserID);
    if ($qResult->num_rows < 1) {
        echo TodoLang::_("ACCESS_DENIED");
        die;
    }
}

// stop with an error message unless the given todo is in a list of the current user
function requireOwnTodo($db, $todo_id) {
    global $curUserID;
    $qResult = dbQueryOrDie($db, "SELECT 1 FROM todo t JOIN list l ON t.list_id=l.id ".
        "WHERE t.id=".(int)$todo_id." AND l.user_id=".(int)$curUserID);
    if ($qResult->num_rows < 1) {
        echo TodoLang::_("ACCESS_DENIED");
        die;
    }
}

function quoteString($db, $str) {
    return "'".$db->real_escape_string(htmlentities($str, ENT_QUOTES, "UTF-8"))."'";
}

function dbQueryOrDie($db, $sql) {
    $qResult = $db->query($sql);
    if ($qResult == FALSE) {
        echo $db->error;
        die;
    }
    return $qResult;
}

function jsonQueryResults($db, $sql)
{
    $qResult = dbQueryOrDie($db, $sql);
    $allResults = array();
    while ($stuff = $qResult->fetch_object())
    {
        $allResults[] = $stuff;
    }
    return json_encode($allResults);
}
