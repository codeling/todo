<?php

// config.php may be kept outside of the web root: set the environment variable TODO_CONFIG
// to its path (SetEnv in Apache, env[] in the php-fpm pool, fastcgi_param in nginx)
require_once(__DIR__."/queries/db-connect.php");
$langfile = __DIR__."/lang/".todoConfig('language').".ini";

class TodoLang {
    static $langstrings;
    public static function _($key) {
        return isset(self::$langstrings[$key]) ? self::$langstrings[$key] : $key;
    }
}

TodoLang::$langstrings = parse_ini_file($langfile);

