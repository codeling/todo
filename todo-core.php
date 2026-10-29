<?php
class TodoConstants {
    const AppName = "Simple To Do List";
    const AppTitle = "To Do";
    const DefaultUserID = 0;
}
// PHP warnings and errors (which contain file paths) go to the log, not into the response;
// set before anything else is loaded, so that also a missing config.php or language file does not show them
ini_set('display_errors', '0');
header_remove('X-Powered-By');
require_once(__DIR__."/lang.php");
require_once(__DIR__."/session.php");
require_once(__DIR__."/webauth/webauth.php");
// URL of a local static file, with its modification time appended, so that
// browsers load the new version after an update instead of a cached one
// (for the ES modules of js/ only js/main.js gets it, the modules which it imports are
// checked by the browser each time because of the web server's Cache-Control: no-cache)
function assetUrl($file) {
    return $file."?v=".filemtime(__DIR__."/".$file);
}
// the ID of the user whose lists and entries are shown
// TODO: get that from the current user account
function todoUserId() {
    return TodoConstants::DefaultUserID;
}

// pages and data of the application (and the CSRF token) must not be kept by browsers or proxies
header("Cache-Control: private, no-store");
// neither inline scripts nor inline styles (style attributes and <style> elements): the statistics
// charts are SVG with attributes, jQuery UI and Tagify set styles with JavaScript (allowed)
header("Content-Security-Policy: default-src 'self'; style-src 'self'; ".
    "img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: same-origin");

// The application has no login of its own, it relies on HTTP authentication of the web
// server over HTTPS. Refuse to run if the request did not meet that, so that a missing
// or ignored .htaccess / nginx setting does not leave all data open.
WebAuth\ServerAuth::guard(array(
    'require_https' => todoConfig('require_https') !== false,
    'require_auth' => todoConfig('require_http_auth') !== false,
    'trust_forwarded_proto' => todoTrustsForwardedProto(),
    'log_prefix' => 'todo',
    'messages' => array(
        'https' => TodoLang::_("HTTPS_REQUIRED"),
        'auth' => TodoLang::_("AUTH_REQUIRED"),
    ),
));
