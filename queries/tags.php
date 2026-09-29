<?php
function updateTags($db, $todo_id, $tags)
{
    $todo_id = (int)$todo_id;
    dbExec($db, "DELETE FROM todo_tags WHERE todo_id=?", array($todo_id));
    foreach ( $tags as $tag)
    {
        $trimmedTag = trim($tag);
        if (strcmp($trimmedTag, '') == 0) {
            // don't want to have empty tags in the database!
            continue;
        }
        $encodedTag = encodeInput($trimmedTag);
        $obj = dbExec($db, "SELECT id FROM tags WHERE name=?", array($encodedTag))
            ->get_result()->fetch_object();
        if (is_null($obj)) {
            dbExec($db, "INSERT INTO tags (name) VALUES (?)", array($encodedTag));
            $tag_id = $db->insert_id;
        } else {
            $tag_id = $obj->id;
        }
        dbExec($db, "INSERT IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)", array($todo_id, $tag_id));
    }
}
