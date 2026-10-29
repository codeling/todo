<?php
// the start of every endpoint which modifies data; the order matters:
// authenticates first, a CSRF check is no replacement for that
// (the constant makes failRequest() answer with JSON, see response.php)
const TODO_API_REQUEST = true;
require(__DIR__."/../todo-core.php");
requirePostWithCsrf();
require(__DIR__."/db.php");
