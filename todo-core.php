<?php
class TodoConstants {
    const AppName = "Simple To Do List";
    const AppTitle = "To Do";
    const DefaultUserID = 0;
}
require_once(__DIR__."/lang.php");
require_once(__DIR__."/session.php");
require_once(__DIR__."/basic-auth/basic-auth.php");
// URL of a local static file, with its modification time appended, so that
// browsers load the new version after an update instead of a cached one
function assetUrl($file) {
    return $file."?v=".filemtime(__DIR__."/".$file);
}
// TODO: get that from the current user account
$curUserID = TodoConstants::DefaultUserID;

// inline styles are still used (statistics bars, jQuery UI), inline scripts are not
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; ".
    "img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: same-origin");

// The application has no login of its own, it relies on HTTP authentication of the web
// server over HTTPS. Refuse to run if the request did not meet that, so that a missing
// or ignored .htaccess / nginx setting does not leave all data open.
basicAuthRequire(array(
    'require_https' => !(isset($require_https) && $require_https === false),
    'require_auth' => !(isset($require_http_auth) && $require_http_auth === false),
    'log_prefix' => 'todo',
    'messages' => array(
        'https' => TodoLang::_("HTTPS_REQUIRED"),
        'auth' => TodoLang::_("AUTH_REQUIRED"),
    ),
));
