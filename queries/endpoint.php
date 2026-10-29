<?php
// the start of every endpoint which modifies data; the order matters:
// authenticates first, a CSRF check is no replacement for that
require(__DIR__."/../todo-core.php");
requirePostWithCsrf();
require(__DIR__."/db.php");
