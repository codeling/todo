<?php
header('Content-Type: text/javascript; charset=utf-8');
// part of the application: only for authenticated requests like all other pages
require_once(__DIR__."/todo-core.php");
?>
var l10n = <?php echo json_encode(TodoLang::$langstrings); ?>;
// the version of the icon files (see iconVersion() in todo-core.php), for the icons which js/html.js builds
var iconVersion = <?php echo iconVersion(); ?>;

function $T(s) {
	return l10n[s] || s;
}
