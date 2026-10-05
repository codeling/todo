<?php
$prefix = (isset($prefix)? $prefix : "../");
require_once($prefix."config.php");
require_once(__DIR__."/../todo-core.php");

// log details server-side only, don't leak them to the client:
function failRequest($detail) {
    error_log("todo: ".$detail);
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo TodoLang::_("DATABASE_ERROR");
    exit;
}

set_exception_handler(function($e) {
    failRequest(get_class($e).": ".$e->getMessage()." in ".$e->getFile().":".$e->getLine());
});

// make mysqli throw on errors (default since PHP 8.1, explicit for older versions):
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli($db_host, $db_user, $db_password, $db_database);

// values are stored HTML-encoded (the client relies on it):
function encodeInput($str) {
    return htmlentities($str, ENT_QUOTES, "UTF-8");
}

// POST parameter as string ('' if missing)
function postParam($name) {
    return (isset($_POST[$name]) && is_string($_POST[$name])) ? $_POST[$name] : '';
}

// run a prepared statement; all parameters are bound as strings (NULL stays NULL)
function dbExec($db, $sql, $params = array()) {
    $stmt = $db->prepare($sql);
    if (count($params) > 0) {
        $stmt->bind_param(str_repeat("s", count($params)), ...$params);
    }
    $stmt->execute();
    return $stmt;
}

// only for static SQL without any parameters:
function dbQueryOrDie($db, $sql) {
    return $db->query($sql);
}

// answer with JSON (not as text/html, the default)
function sendJson($json) {
    header('Content-Type: application/json; charset=utf-8');
    echo $json;
}

function jsonQueryResults($db, $sql, $params = array())
{
    $qResult = dbExec($db, $sql, $params)->get_result();
    $allResults = array();
    while ($stuff = $qResult->fetch_object())
    {
        $allResults[] = $stuff;
    }
    return json_encode($allResults);
}

// stop with an error message unless the given list belongs to the current user
function requireOwnList($db, $list_id) {
    global $curUserID;
    $qResult = dbExec($db, "SELECT 1 FROM list WHERE id=? AND user_id=?",
        array((int)$list_id, (int)$curUserID))->get_result();
    if ($qResult->num_rows < 1) {
        echo TodoLang::_("ACCESS_DENIED");
        exit;
    }
}

// stop with an error message unless the given todo is in a list of the current user
function requireOwnTodo($db, $todo_id) {
    global $curUserID;
    $qResult = dbExec($db, "SELECT 1 FROM todo t JOIN list l ON t.list_id=l.id ".
        "WHERE t.id=? AND l.user_id=?", array((int)$todo_id, (int)$curUserID))->get_result();
    if ($qResult->num_rows < 1) {
        echo TodoLang::_("ACCESS_DENIED");
        exit;
    }
}

// stop with an error message unless the given tag is used by todos of the current
// user and by no todos of other users: tags are shared by name, so changing or
// deleting a tag which is also used by others would change their data
function requireOwnTag($db, $tag_id) {
    global $curUserID;
    $qResult = dbExec($db, "SELECT COALESCE(SUM(l.user_id=?), 0) AS own, COALESCE(SUM(l.user_id<>?), 0) AS others ".
        "FROM todo_tags r JOIN todo t ON t.id=r.todo_id JOIN list l ON l.id=t.list_id WHERE r.tag_id=?",
        array((int)$curUserID, (int)$curUserID, (int)$tag_id))->get_result();
    $row = $qResult->fetch_object();
    if ((int)$row->own < 1 || (int)$row->others > 0) {
        echo TodoLang::_("ACCESS_DENIED");
        exit;
    }
}
