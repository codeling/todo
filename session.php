<?php
// session is only used to hold the CSRF token
require_once(__DIR__."/basic-auth/basic-auth.php");

// whether the request came in over HTTPS; X-Forwarded-Proto is set by the client
// unless a proxy overwrites it, so it is only believed if $trust_forwarded_proto
// is set in config.php (only do that if the web server can only be reached through
// the proxy which terminates TLS)
function todoTrustsForwardedProto() {
    global $trust_forwarded_proto;
    return isset($trust_forwarded_proto) && $trust_forwarded_proto === true;
}

function todoIsHttps() {
    return basicAuthIsHttps(todoTrustsForwardedProto());
}

function todoStartSession($readOnly) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name("todo_session");
    // a request without session cookie cannot carry a valid token: don't create a session for it
    if ($readOnly && !isset($_COOKIE[session_name()])) {
        return;
    }
    // never accept a session ID which the server did not create
    ini_set('session.use_strict_mode', '1');
    // keep the Cache-Control header of todo-core.php, PHP would replace it when the session starts
    session_cache_limiter('');
    session_set_cookie_params(array(
        'lifetime' => 0,
        'secure' => todoIsHttps(),
        'httponly' => true,
        'samesite' => 'Strict'
    ));
    session_start($readOnly ? array('read_and_close' => true) : array());
}

// token for the page, created on first use
function csrfToken() {
    todoStartSession(false);
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    $token = $_SESSION['csrf'];
    session_write_close();
    return $token;
}

// for requests that modify data: must be POST and carry the page's token
function requirePostWithCsrf() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        header('Allow: POST');
        require_once(__DIR__."/lang.php");
        echo TodoLang::_("METHOD_NOT_ALLOWED");
        exit;
    }
    todoStartSession(true);
    $token = isset($_SERVER['HTTP_X_CSRF_TOKEN']) ? $_SERVER['HTTP_X_CSRF_TOKEN'] : '';
    if (empty($_SESSION['csrf']) || !is_string($token) ||
        !hash_equals($_SESSION['csrf'], $token)) {
        http_response_code(403);
        require_once(__DIR__."/lang.php");
        echo TodoLang::_("INVALID_CSRF_TOKEN");
        exit;
    }
}
