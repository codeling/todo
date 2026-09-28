<?php
class TodoConstants {
    const AppName = "Simple To Do List";
    const AppTitle = "To Do";
    const DefaultUserID = 0;
}
require_once(__DIR__."/lang.php");
// URL of a local static file, with its modification time appended, so that
// browsers load the new version after an update instead of a cached one
function assetUrl($file) {
    return $file."?v=".filemtime(__DIR__."/".$file);
}
// TODO: get that from the current user account
$curUserID = TodoConstants::DefaultUserID;

