<?php
class TodoConstants {
    const AppName = "Simple To Do List";
    const AppTitle = "To Do";
    const DefaultUserID = 0;
}
require_once(__DIR__."/lang.php");
require_once(__DIR__."/session.php");
// URL of a local static file, with its modification time appended, so that
// browsers load the new version after an update instead of a cached one
function assetUrl($file) {
    return $file."?v=".filemtime(__DIR__."/".$file);
}
// TODO: get that from the current user account
$curUserID = TodoConstants::DefaultUserID;

// error_log, but not more than once per minute: unauthenticated requests
// (e.g. scanners, if the web server's authentication is not set up) must not fill the log
function logOncePerMinute($message) {
    $marker = sys_get_temp_dir()."/todo-log-".md5(__DIR__);
    $last = @filemtime($marker);
    if ($last !== false && time() - $last < 60) {
        return;
    }
    @touch($marker);
    error_log($message);
}

// The application has no login of its own, it relies on HTTP authentication of
// the web server. Refuse to run if the web server did not authenticate the
// request, so that a missing or ignored .htaccess / nginx setting does not
// leave all data open. Only REMOTE_USER is trusted: the web server sets it after
// checking the credentials, a client cannot forge it with the Authorization header.
function requireHttpAuth() {
    global $require_http_auth;
    if (isset($require_http_auth) && $require_http_auth === false) {
        return;
    }
    foreach (array('REMOTE_USER', 'REDIRECT_REMOTE_USER') as $key) {
        if (!empty($_SERVER[$key])) {
            return;
        }
    }
    logOncePerMinute("todo: request without authenticated user rejected, see \$require_http_auth in config.sample.php");
    http_response_code(403);
    echo TodoLang::_("AUTH_REQUIRED");
    exit;
}

// PHP warnings and notices (which contain file paths) go to the log, not into the response
ini_set('display_errors', '0');
header_remove('X-Powered-By');
// pages and data of the application (and the CSRF token) must not be kept by browsers or proxies
header("Cache-Control: private, no-store");
// inline styles are still used (statistics bars, jQuery UI), inline scripts are not
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; ".
    "img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: same-origin");

requireHttpAuth();
