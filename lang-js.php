<?php
header('Content-type: application/x-javascript');
// part of the application: only for authenticated requests like all other pages
require_once(__DIR__."/todo-core.php");
?>
var l10n = <?php echo json_encode(TodoLang::$langstrings); ?>;

function $T(s) {
	return l10n[s] || s;
}
