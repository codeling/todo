<?php
require_once("lang.php");
?>
var l10n = <?php echo json_encode(TodoLang::$langstrings); ?>;

function $T(s) {
	return l10n[s] || s;
}
