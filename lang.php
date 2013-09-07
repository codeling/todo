<?php

require_once("config.php");
$langfile = "lang/".$language.".ini";

class TodoLang {
    static $langstrings;
    public static function _($key) {
        return isset(self::$langstrings[$key]) ? self::$langstrings[$key] : $key;
    }
}

TodoLang::$langstrings = parse_ini_file($langfile);

