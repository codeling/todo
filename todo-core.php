<?php
class TodoConstants {
    const AppName = "Simple To Do List";
    const AppTitle = "To Do";
    const DefaultUserID = 0;
}
// PHP warnings and errors (which contain file paths) go to the log, not into the response;
// set before anything else is loaded, so that also a missing config.php or language file does not show them
ini_set('display_errors', '0');
header_remove('X-Powered-By');
require_once(__DIR__."/lang.php");
require_once(__DIR__."/session.php");
require_once(__DIR__."/webauth/webauth.php");
// URL of a local static file, with its modification time appended, so that
// browsers load the new version after an update instead of a cached one
// (for the ES modules of js/ only js/main.js gets it, the modules which it imports are
// checked by the browser each time because of the web server's Cache-Control: no-cache)
function assetUrl($file) {
    return $file."?v=".filemtime(__DIR__."/".$file);
}
// The icons are those of codeling/webicons (webicons/icons/*.svg, see webicons/README.md): shapes without colors,
// which a page shows as an inline SVG that uses the file (<use>), so that todo.css sets the color (also in the
// dark scheme). The version in the URL is the newest modification time of the files (one for all icons: js/html.js
// builds the same URLs with the number it gets from lang-js.php).
function iconVersion() {
    static $version = null;
    if ($version === null) {
        $version = 0;
        foreach (glob(__DIR__."/webicons/icons/*.svg") ?: array() as $file) {
            $version = max($version, (int)filemtime($file));
        }
    }
    return $version;
}
// an icon next to a text or inside a button which has a label of its own: hidden from assistive technology
function iconSvg($name, $class = '') {
    return '<svg class="icon icon-'.htmlspecialchars($name).($class !== '' ? ' '.htmlspecialchars($class) : '').
        '" viewBox="0 0 16 16" aria-hidden="true"><use href="webicons/icons/'.htmlspecialchars($name).'.svg?v='.iconVersion().'#i"/></svg>';
}
// a button with an icon; the label is its tooltip and its name for screen readers
function iconButton($id, $class, $icon, $label) {
    return '<button type="button" id="'.htmlspecialchars($id).'" class="iconButton '.htmlspecialchars($class).
        '" title="'.htmlspecialchars($label).'" aria-label="'.htmlspecialchars($label).'">'.iconSvg($icon).'</button>';
}
// The color scheme: the one of the system ("auto"), or the one which was chosen with the button of the pages
// ("light" or "dark"), kept in the cookie todo_theme (queries/theme.php sets it). The pages write the choice into
// the root element (data-theme), so they are drawn right from the start, also without a script.
const TODO_THEME_COOKIE = 'todo_theme';
const TODO_THEME_MODES = array('auto', 'light', 'dark');
// the background of the page in the two schemes, for the color of the browser's address bar on phones
// (the same as --page-bg in todo.css; tests/theme.test.js checks that)
const TODO_THEME_COLORS = array('light' => '#F8F8F8', 'dark' => '#1c1c1e');

function todoThemeMode() {
    $value = isset($_COOKIE[TODO_THEME_COOKIE]) ? $_COOKIE[TODO_THEME_COOKIE] : null;
    return (is_string($value) && in_array($value, TODO_THEME_MODES, true)) ? $value : 'auto';
}
// the attribute of the root element; nothing for "auto"
function themeHtmlAttribute() {
    $mode = todoThemeMode();
    return $mode === 'auto' ? '' : ' data-theme="'.$mode.'"';
}
// the elements of the head which tell the browser about the schemes: both are supported (so that form controls and
// scroll bars follow), and the color of the address bar for the scheme of the system; js/theme.js sets both
// colors to the chosen one if the visitor chose a scheme
function themeHeadHtml() {
    return '<meta name="color-scheme" content="light dark">'."\n".
        '    <meta name="theme-color" media="(prefers-color-scheme: light)" content="'.TODO_THEME_COLORS['light'].'">'."\n".
        '    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="'.TODO_THEME_COLORS['dark'].'">';
}
// The button which changes the scheme: system, light, dark, and again. It has the icons of the three schemes, todo.css
// shows the one of the scheme in use, js/theme.js changes the choice (and the label, which says what is in use)
function themeButtonHtml() {
    $mode = todoThemeMode();
    $labels = array('auto' => TodoLang::_("THEME_AUTO"), 'light' => TodoLang::_("THEME_LIGHT"), 'dark' => TodoLang::_("THEME_DARK"));
    $attributes = '';
    foreach ($labels as $name => $label) {
        $attributes .= ' data-label-'.$name.'="'.htmlspecialchars($label).'"';
    }
    $icons = '';
    foreach (TODO_THEME_MODES as $name) {
        $icons .= iconSvg('theme-'.$name);
    }
    return '<button type="button" class="themeswitch" title="'.htmlspecialchars($labels[$mode]).'" aria-label="'.
        htmlspecialchars($labels[$mode]).'"'.$attributes.'>'.$icons.'</button>';
}
// The dialogs are <dialog> elements which are opened with showModal() (js/dialogs.js): the header has the title and
// the button to close it (js/dialogs.js closes the dialog of any element with data-dialog-close)
function dialogHeaderHtml($titleId, $title) {
    return '<div class="dialog_header"><h2 id="'.htmlspecialchars($titleId).'" class="dialog_title">'.htmlspecialchars($title).'</h2>'.
        '<button type="button" class="iconButton dialog_close" data-dialog-close title="'.htmlspecialchars(TodoLang::_("CLOSE")).
        '" aria-label="'.htmlspecialchars(TodoLang::_("CLOSE")).'">'.iconSvg('close').'</button></div>';
}
// a button of the footer of a dialog: the label is its text, the icon is optional
function dialogButtonHtml($id, $class, $label, $icon = null) {
    return '<button type="button"'.($id === null ? '' : ' id="'.htmlspecialchars($id).'"').' class="dialogButton '.htmlspecialchars($class).'">'.
        ($icon === null ? '' : iconSvg($icon)).htmlspecialchars($label).'</button>';
}
// the button which closes the dialog without doing anything
function dialogCancelButtonHtml() {
    return '<button type="button" class="dialogButton" data-dialog-close>'.htmlspecialchars(TodoLang::_("CANCEL")).'</button>';
}
// the ID of the user whose lists and entries are shown
// TODO: get that from the current user account
function todoUserId() {
    return TodoConstants::DefaultUserID;
}

// pages and data of the application (and the CSRF token) must not be kept by browsers or proxies
header("Cache-Control: private, no-store");
// neither inline scripts nor inline styles (style attributes and <style> elements): the statistics
// charts are SVG with attributes, jQuery UI and Tagify set styles with JavaScript (allowed)
header("Content-Security-Policy: default-src 'self'; style-src 'self'; ".
    "img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: same-origin");

// The application has no login of its own, it relies on HTTP authentication of the web
// server over HTTPS. Refuse to run if the request did not meet that, so that a missing
// or ignored .htaccess / nginx setting does not leave all data open.
WebAuth\ServerAuth::guard(array(
    'require_https' => todoConfig('require_https') !== false,
    'require_auth' => todoConfig('require_http_auth') !== false,
    'trust_forwarded_proto' => todoTrustsForwardedProto(),
    'log_prefix' => 'todo',
    'messages' => array(
        'https' => TodoLang::_("HTTPS_REQUIRED"),
        'auth' => TodoLang::_("AUTH_REQUIRED"),
    ),
));
