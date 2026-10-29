<?php
    require(__DIR__."/endpoint.php");
    require("recurrence.php");
    $db = todoDb();
    reactivateDue($db, todoUserId());
    echo 1;
