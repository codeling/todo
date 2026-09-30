<?php
    require("db.php");
    require("reactivate.php");
    require("todo-list-query.php");

    $list_id = (int)$_GET["list_id"];
    requireOwnList($db, $list_id);
    $incomplete = isset($_GET["incomplete"])? $_GET["incomplete"] === 'true': false;
    $age = isset($_GET["age"])? (int)$_GET["age"]: 0;
    $sql = todoListQuery($incomplete);
    $result = jsonQueryResults($db, $sql, array($list_id, $age));
    $db->close();
    echo $result;
