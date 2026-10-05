<?php
    require(__DIR__."/../session.php");
    requirePostWithCsrf();
    require("db.php");
    require("reactivate.php");
    echo 1;
    $db->close();
