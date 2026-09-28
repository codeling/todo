<?php
$prefix = (isset($prefix)? $prefix : "../");
require_once($prefix."config.php");

// log details server-side only, don't leak them to the client:
function failRequest($detail) {
    error_log("todo: ".$detail);
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo "Database error!";
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
