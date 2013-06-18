<?php
class TodoConstants {
    const AppName = "Simple To Do List";
    const AppTitle = "To Do";
    const DefaultListID = 1;
}

class TodoLang {
    static $langfile = "lang-de.ini";
    static $langstrings;
    static function _($key) {
        return isset(self::$langstrings[$key]) ? self::$langstrings[$key] : '???'.$key.'???';
    }
}

TodoLang::$langstrings = parse_ini_file(TodoLang::$langfile);
$curListID = isset($_REQUEST['id']) ? $_REQUEST['id'] : TodoConstants::DefaultListID;

