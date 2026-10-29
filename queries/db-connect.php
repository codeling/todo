<?php
// Path of config.php, or of the file in the environment variable TODO_CONFIG (see lang.php).
// Used by the application (lang.php) and by the command line scripts.
function todoConfigPath() {
    return getenv('TODO_CONFIG') ? getenv('TODO_CONFIG') : __DIR__."/../config.php";
}

// Connects to the database; used by the application (db.php) and by the command line scripts.
// $ssl: null / false for a plain connection (fine for a database on the same host), true for TLS
// with the defaults of the client library, or an array with the keys ca, capath, cert, key, cipher
// (all optional, the paths of PEM files) and verify_server_cert (default true).
function todoDbConnect($host, $user, $password, $database, $ssl = null) {
    $db = mysqli_init();
    $flags = 0;
    if ($ssl) {
        $opts = is_array($ssl) ? $ssl : array();
        $get = function ($key) use ($opts) {
            return isset($opts[$key]) ? $opts[$key] : null;
        };
        $db->ssl_set($get('key'), $get('cert'), $get('ca'), $get('capath'), $get('cipher'));
        $flags = MYSQLI_CLIENT_SSL;
        if (!isset($opts['verify_server_cert']) || $opts['verify_server_cert']) {
            $flags |= MYSQLI_CLIENT_SSL_VERIFY_SERVER_CERT;
        }
    }
    $db->real_connect($host, $user, $password, $database, null, null, $flags);
    // do not depend on the server default (latin1 on older MySQL versions):
    $db->set_charset('utf8mb4');
    // all dates are UTC (UTC_TIMESTAMP(), UTC_DATE()); this makes CURDATE() and NOW() UTC too
    $db->query("SET time_zone = '+00:00'");
    return $db;
}
