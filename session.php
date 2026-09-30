<?php
// session is only used to hold the CSRF token

function todoStartSession($readOnly) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_name("todo_session");
    session_set_cookie_params(array(
        'lifetime' => 0,
        'secure' => $https,
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
