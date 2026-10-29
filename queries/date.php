<?php
function checkDateStr($dateStr)
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}\z/', $dateStr)) {
        return false;
    }
    $arr = explode("-", $dateStr);
    return checkdate((int)$arr[1], (int)$arr[2], (int)$arr[0]);
}

function convertStrToDate($dateStr)
{
    return DateTime::createFromFormat("Y-m-d", $dateStr);
}
