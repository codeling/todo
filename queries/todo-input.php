<?php
// the checks of a todo which enter.php and update.php share
require_once(__DIR__."/date.php");

// the language key of the first problem with the description, the dates and the tags of a todo,
// null if there is none; $todo is HTML-encoded, $start and $due are the dates as sent by the
// client, $tags is the result of parseTags()
function todoInputError($todo, $start, $due, $tags)
{
    // limits of the database columns, counted after HTML-encoding (what is stored):
    if (charLength($todo) > MAX_TODO_LENGTH) {
        return "TODO_TOO_LONG";
    }
    if ($todo === '') {
        return "TODO_MAY_NOT_BE_EMPTY";
    }
    if ($tags === null) {
        return "INVALID_TAGS";
    }
    // empty dates are allowed (a new todo starts today if there is no start date):
    if ($due != '' && !checkDateStr($due)) {
        return "INVALID_DUE_DATE";
    }
    if ($start != '' && !checkDateStr($start)) {
        return "INVALID_START_DATE";
    }
    if ($due != '' && $start != '' && convertStrToDate($due) < convertStrToDate($start)) {
        return "DUE_BEFORE_START";
    }
    return null;
}
