<?php
    require("db.php");
    require("../icalcreator/iCalcreator.php");
    require("todo-list-query.php");

    $list_id = (int)$_GET["list_id"];
    $sql = todoListQuery($list_id, true, 0);

    $filename = 'todo.ics';
    $LocalTimeZone = "Europe/Vienna";

    function setDateProperty($vevent, $name, $date)
    {
        $vevent->setProperty('dt'.$name,
            $date->format("Y"),
            $date->format("n"),
            $date->format("j"),
            $date->format("G"),
            intval($date->format("i"), 10),
            0, 0, 0
        );
    }

    $icalConfig = array('unique_id' => 'todo-uniqueid',
        'filename' => $filename);
    $icalendar = new vcalendar($icalConfig);

    $icalendar->setProperty("method", "PUBLISH");
    $icalendar->setProperty("x-wr-calname", "Todo-Calendar");
    $icalendar->setProperty("X-WR-CALDESC", "Calendar from Simple Todo List");
    $icalendar->setProperty("X-WR-TIMEZONE", $LocalTimeZone);
    $icalendar->setProperty("TZID", $LocalTimeZone);
    $uuid = "01dd5eb4-3448-11e5-a151-feff819cdc9f";
    $icalendar->setProperty("X-WR-RELCALID", $uuid);
    
    $qResult = dbQueryOrDie($db, $sql);
    while ($stuff = $qResult->fetch_object())
    {
        $vevent = $icalendar->newComponent('vevent');
        setDateProperty($vevent, 'start', new DateTime($stuff->start));
        setDateProperty($vevent, 'end', new DateTime($stuff->due));
        $vevent->setProperty('summary', $stuff->todo);
        $vevent->setProperty('description', $stuff->notes);
#        $vevent->setProperty('organizer', $email, $name);
#        $vevent->setProperty('location', $location);
    }
    
    echo $icalendar->returnCalendar();

    $db->close();
