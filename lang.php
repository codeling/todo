<?php

// config.php may be kept outside of the web root: set the environment variable TODO_CONFIG
// to its path (SetEnv in Apache, env[] in the php-fpm pool, fastcgi_param in nginx)
require_once(getenv('TODO_CONFIG') ? getenv('TODO_CONFIG') : __DIR__."/config.php");
$langfile = __DIR__."/lang/".$language.".ini";

class TodoLang {
    static $langstrings;
    public static function _($key) {
        return isset(self::$langstrings[$key]) ? self::$langstrings[$key] : $key;
    }
}

TodoLang::$langstrings = parse_ini_file($langfile);

