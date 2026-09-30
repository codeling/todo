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

// inline styles are still used (statistics bars, jQuery UI), inline scripts are not
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; ".
    "img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: same-origin");
