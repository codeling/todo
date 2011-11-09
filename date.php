<?php
    function checkDateStr($dateStr)
    {
        $arr = explode("-", $dateStr);
        return count($arr) == 3 &&
            checkdate((int)$arr[1], (int)$arr[2], (int)$arr[0]);
    }
?>
