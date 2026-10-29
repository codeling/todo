<?php
// limits of the database columns todo.description and todo.notes, counted in characters of the
// text (which is stored as sent); no code besides the constants, so that PHPStan can load it
// as bootstrap file (phpstan.neon)
const MAX_TODO_LENGTH = 255;
const MAX_NOTES_LENGTH = 10000;
