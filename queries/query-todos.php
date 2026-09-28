<?php
    require("db.php");
    require("reactivate.php");
    require("todo-list-query.php");

    $list_id = (int)$_GET["list_id"];
    requireOwnList($db, $list_id);
    $incomplete = isset($_GET["incomplete"])? $_GET["incomplete"] === 'true': false;
    $age = isset($_GET["age"])? (int)$_GET["age"]: 0;
    $sql = todoListQuery($list_id, $incomplete, $age);
    $result = jsonQueryResults($db, $sql);
    $db->close();
    echo $result;
