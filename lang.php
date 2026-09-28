<?php

require_once(__DIR__."/config.php");
$langfile = __DIR__."/lang/".$language.".ini";

class TodoLang {
    static $langstrings;
    public static function _($key) {
        return isset(self::$langstrings[$key]) ? self::$langstrings[$key] : $key;
    }
}

TodoLang::$langstrings = parse_ini_file($langfile);

