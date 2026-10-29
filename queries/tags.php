<?php
// limits of tags: the length of the database column, and a number which no list needs
// (every tag costs a few queries, a request must not be able to cause millions of them)
const MAX_TAG_LENGTH = 255;
const MAX_TAGS_PER_TODO = 50;

// whether the (trimmed) name can be used as tag name: tags are passed around as comma separated
// lists, so a comma would split the tag; the length is counted in characters of the plain text
function isValidTagName($name)
{
    return $name !== '' && strpos($name, ',') === false && charLength($name) <= MAX_TAG_LENGTH;
}

// "a, b,c,a" => array('a', 'b', 'c'): the names, without empty tags and duplicates;
// null if a tag or the number of tags is invalid
function parseTags($tagString)
{
    $tags = array();
    foreach (explode(",", $tagString) as $tag)
    {
        $trimmedTag = trim($tag);
        if (strcmp($trimmedTag, '') == 0) {
            // don't want to have empty tags in the database!
            continue;
        }
        if (!isValidTagName($trimmedTag)) {
            return null;
        }
        $tags[$trimmedTag] = $trimmedTag;
        if (count($tags) > MAX_TAGS_PER_TODO) {
            return null;
        }
    }
    return array_values($tags);
}

// $tagNames: result of parseTags()
// The caller runs this in a transaction (withTransaction): it deletes the old assignments first,
// which must not become visible without the new ones.
function updateTags($db, $todo_id, $tagNames)
{
    $todo_id = (int)$todo_id;
    dbExec($db, "DELETE FROM todo_tags WHERE todo_id=?", array($todo_id));
    foreach ($tagNames as $tagName)
    {
        // tags.name is unique: an existing tag is found (and its id returned by insert_id) in
        // one statement, so two requests creating the same tag can not create it twice
        dbExec($db, "INSERT INTO tags (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
            array($tagName));
        $tag_id = $db->insert_id;
        dbExec($db, "INSERT IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)", array($todo_id, $tag_id));
    }
}
