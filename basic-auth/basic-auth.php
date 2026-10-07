<?php
/**
 * basic-auth.php - drop-in guard for small web apps which have no login of their own.
 *
 * The web server does the actual HTTP Basic authentication (see htaccess.sample and
 * nginx.conf.sample next to this file). This script is the safety net behind it: it
 * refuses to run the app if a request did not arrive over HTTPS, or if the web server did
 * not authenticate it, so that a missing or ignored web server setting does not leave
 * all data open or the password travelling in cleartext.
 *
 * Usage, at the top of every PHP entry point of the app:
 *
 *     require_once __DIR__ . '/basic-auth/basic-auth.php';
 *     $user = basicAuthRequire();
 *
 * Only REMOTE_USER is trusted for the authentication: the web server sets it after it has
 * checked the credentials, a client cannot forge it with an Authorization header.
 *
 * Options (all optional) for basicAuthRequire(array(...)):
 *   require_https         true   reject requests which did not arrive over HTTPS
 *   require_auth          true   reject requests without an authenticated user
 *   trust_forwarded_proto false  treat "X-Forwarded-Proto: https" as HTTPS. Only set this to
 *                                true if the app can be reached only through a proxy which
 *                                terminates TLS and always overwrites that header: any client
 *                                can send it. Otherwise make the web server set HTTPS for
 *                                the proxy's requests. Only the HTTPS check depends on this,
 *                                never the authentication.
 *   hsts                  true   send Strict-Transport-Security on HTTPS requests
 *   log_prefix            'basic-auth'  prefix of the messages written to the error log
 *   messages              array('https' => ..., 'auth' => ...)  texts shown to the client,
 *                                to translate or adapt them (plain text)
 */

// true if the request arrived over HTTPS
function basicAuthIsHttps($trustForwardedProto = false) {
    if (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    return $trustForwardedProto && isset($_SERVER['HTTP_X_FORWARDED_PROTO']) &&
        strtolower(trim($_SERVER['HTTP_X_FORWARDED_PROTO'])) === 'https';
}

// name of the user the web server authenticated, or null
function basicAuthUser() {
    // REDIRECT_REMOTE_USER: after an internal redirect (e.g. Apache ErrorDocument, rewrites)
    foreach (array('REMOTE_USER', 'REDIRECT_REMOTE_USER') as $key) {
        if (!empty($_SERVER[$key]) && is_string($_SERVER[$key])) {
            return $_SERVER[$key];
        }
    }
    return null;
}

// error_log, but not more than once per minute: rejected requests (e.g. scanners, if the web
// server's authentication is not set up) must not fill the log
function basicAuthLog($message) {
    $marker = sys_get_temp_dir()."/basic-auth-log-".md5(__DIR__);
    $last = @filemtime($marker);
    if ($last !== false && time() - $last < 60) {
        return;
    }
    @touch($marker);
    error_log($message);
}

function basicAuthDeny($message, $logMessage) {
    basicAuthLog($logMessage);
    if (!headers_sent()) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        header('Cache-Control: no-store');
    }
    echo $message;
    exit;
}

// stops the request with 403 unless the requirements are met,
// returns the authenticated user name (null if authentication is not required)
function basicAuthRequire($options = array()) {
    $o = array_merge(array(
        'require_https' => true,
        'require_auth' => true,
        'trust_forwarded_proto' => false,
        'hsts' => true,
        'log_prefix' => 'basic-auth',
    ), $options);
    $messages = array_merge(array(
        'https' => 'Access denied: this application is only available over HTTPS.',
        'auth' => 'Access denied: the web server did not authenticate you. '.
            'Protect the application with HTTP authentication.',
    ), isset($options['messages']) ? $options['messages'] : array());

    // HTTPS first, so that credentials are never even requested over plain HTTP
    if ($o['require_https']) {
        if (!basicAuthIsHttps($o['trust_forwarded_proto'])) {
            basicAuthDeny($messages['https'], $o['log_prefix'].": request over plain HTTP rejected");
        }
        if ($o['hsts'] && !headers_sent()) {
            header('Strict-Transport-Security: max-age=31536000');
        }
    }
    $user = basicAuthUser();
    if ($o['require_auth'] && $user === null) {
        basicAuthDeny($messages['auth'], $o['log_prefix'].": request without authenticated user rejected");
    }
    return $user;
}
