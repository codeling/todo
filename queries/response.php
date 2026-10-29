<?php
// How the endpoints (queries/*.php) answer, shared by session.php (CSRF and method checks) and
// db.php: JSON with an HTTP status. An error is {"error": "<translated message>"} and the status says
// what kind of error it is (see rejectRequest() in db.php), a success is 200 and {"ok": true, ...}.
// The pages (index.php, statistik.php) answer with HTML, and with plain text if the database fails.
// An endpoint says that it is one by defining TODO_API_REQUEST before anything can fail
// (endpoint.php for the modifying ones, the first line of the query-*.php scripts); failRequest() in
// db.php, which is also reached by the exception handler of the pages, decides by that.

// answer with JSON (not as text/html, the default); $json is already encoded
function sendJson($json, $status = 200) {
    // (after output has started the status and the type can not be changed any more)
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo $json;
}

// the answer of an endpoint which did its work: {"ok": true} and the given fields
function sendOk($fields = array()) {
    sendJson(json_encode(array_merge(array('ok' => true), $fields)));
}

// stop with an error answer of an endpoint: the HTTP status and {"error": message}
/** @return never */
function exitWithError($status, $message) {
    sendJson(json_encode(array('error' => $message)), $status);
    exit;
}
