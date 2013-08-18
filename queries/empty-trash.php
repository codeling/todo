<?php
    require("db.php");
    dbQueryOrDie($db, "DELETE FROM todo WHERE deleted=1");
    echo 1;
    $db->close();
