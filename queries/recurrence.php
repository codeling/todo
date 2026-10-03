<?php
// recurrenceMode is the unit (0 = no recurrence), recurrenceInterval the number of units
const RECURRENCE_UNITS = array(1 => 'DAY', 2 => 'WEEK', 3 => 'MONTH', 4 => 'YEAR');
const MAX_RECURRENCE_INTERVAL = 999;

// SQL expression: $baseExpr plus the recurrence interval of the todo row
function recurrenceNextSql($baseExpr)
{
    $sql = "CASE recurrenceMode ";
    foreach (RECURRENCE_UNITS as $mode => $unit) {
        $sql .= "WHEN ".$mode." THEN DATE_ADD(".$baseExpr.", INTERVAL recurrenceInterval ".$unit.") ";
    }
    return $sql."END";
}
