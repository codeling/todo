<?php
    // Remembers the color scheme which the visitor chose with the button of the pages (todo_theme, see
    // todo-core.php): "auto" (the system's, which needs no cookie), "light" or "dark"
    require(__DIR__."/endpoint.php");
    $mode = postParam('mode');
    if (!in_array($mode, TODO_THEME_MODES, true)) {
        rejectRequest(400, "INVALID_PARAMETERS");
    }
    // (the folder of the application, not of this script: the pages are one level up)
    $path = dirname(dirname($_SERVER['SCRIPT_NAME']));
    setcookie(TODO_THEME_COOKIE, $mode === 'auto' ? '' : $mode, array(
        'expires' => $mode === 'auto' ? time() - 42000 : time() + 365 * 24 * 3600,
        'path' => ($path === '/' || $path === '\\' || $path === '.') ? '/' : $path,
        'secure' => WebAuth\Https::isRequest($_SERVER, todoTrustsForwardedProto()),
        'httponly' => true,
        'samesite' => 'Lax'));
    sendOk(array('mode' => $mode));
