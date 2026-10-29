<?php
// first: it hides PHP errors (also of loading config.php) and authenticates
require_once(__DIR__."/../todo-core.php");

// log details server-side only, don't leak them to the client:
/** @return never */
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
require_once(__DIR__."/db-connect.php");
require_once(__DIR__."/limits.php");

// the database connection of this request, opened on first use (the pages and endpoints keep it
// in $db and pass it to the functions below)
function todoDb() {
    static $db = null;
    if ($db === null) {
        $db = todoDbConnect(todoConfig('db_host'), todoConfig('db_user'), todoConfig('db_password'),
            todoConfig('db_database'), todoConfig('db_ssl'));
    }
    return $db;
}

// number of characters (not bytes), as the database counts the length of a varchar
function charLength($str) {
    return preg_match_all('/./su', $str);
}

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
function dbQuery($db, $sql) {
    return $db->query($sql);
}

// runs $fn() in one transaction: commits and returns its result, or rolls back and rethrows if it
// throws (the exception handler then answers 500). The checks which can stop the request with
// rejectRequest() belong before it: that exit leaves the transaction open, and the database only
// rolls it back when the connection closes. $fn may call $db->rollback() itself to discard its
// changes without an error; the commit afterwards does nothing.
function withTransaction($db, $fn) {
    $db->begin_transaction();
    try {
        $result = $fn();
        $db->commit();
        return $result;
    } catch (Throwable $e) {
        $db->rollback();
        throw $e;
    }
}

// answer with JSON (not as text/html, the default)
function sendJson($json) {
    header('Content-Type: application/json; charset=utf-8');
    echo $json;
}

// the rows of a query as JSON
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

// stop with the (translated) message of a language key; for requests which are refused
// (the database error has its own function above)
/** @return never */
function rejectRequest($langKey) {
    echo TodoLang::_($langKey);
    exit;
}

// stop with an error message unless exactly one row was changed (the result of a statement
// which is meant to change one row); the messages are language keys
function requireSingleRow($affectedRows, $noneKey, $manyKey) {
    if ($affectedRows < 1) {
        rejectRequest($noneKey);
    }
    if ($affectedRows > 1) {
        rejectRequest($manyKey);
    }
}

// stop with an error message unless the given list belongs to the current user
function requireOwnList($db, $list_id) {
    $qResult = dbExec($db, "SELECT 1 FROM list WHERE id=? AND user_id=?",
        array((int)$list_id, (int)todoUserId()))->get_result();
    if ($qResult->num_rows < 1) {
        rejectRequest("ACCESS_DENIED");
    }
}

// stop with an error message unless the given todo is in a list of the current user
function requireOwnTodo($db, $todo_id) {
    $qResult = dbExec($db, "SELECT 1 FROM todo t JOIN list l ON t.list_id=l.id ".
        "WHERE t.id=? AND l.user_id=?", array((int)$todo_id, (int)todoUserId()))->get_result();
    if ($qResult->num_rows < 1) {
        rejectRequest("ACCESS_DENIED");
    }
}

// stop with an error message unless the given tag is used by todos of the current
// user and by no todos of other users: tags are shared by name, so changing or
// deleting a tag which is also used by others would change their data
function requireOwnTag($db, $tag_id) {
    $userId = (int)todoUserId();
    $qResult = dbExec($db, "SELECT COALESCE(SUM(l.user_id=?), 0) AS own, COALESCE(SUM(l.user_id<>?), 0) AS others ".
        "FROM todo_tags r JOIN todo t ON t.id=r.todo_id JOIN list l ON l.id=t.list_id WHERE r.tag_id=?",
        array($userId, $userId, (int)$tag_id))->get_result();
    $row = $qResult->fetch_object();
    if ((int)$row->own < 1 || (int)$row->others > 0) {
        rejectRequest("ACCESS_DENIED");
    }
}
