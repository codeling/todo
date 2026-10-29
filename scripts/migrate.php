<?php
// Upgrades the database: applies the scripts sql/migrations/NNN-*.sql which are newer than
// the version in the table `settings` (key db.version), in order. Command line only.
//
//   php scripts/migrate.php [--status] [--yes] [--database=NAME]
//
// --status       only show the version and the pending migrations
// --yes          do not ask for confirmation
// --database     use this database instead of the one of config.php (used by the tests)
//
// The connection settings are the ones of config.php (or the file in the environment variable
// TODO_CONFIG). The application's database user usually may not change the schema: set
// TODO_MIGRATE_USER and TODO_MIGRATE_PASSWORD to the account of an administrator.
// Make a backup first (README.md). A migration which fails stops the run; as the server cannot
// roll back schema changes, the statements before the failing one stay applied.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit(1);
}
require_once(__DIR__."/../queries/db-connect.php");

// the oldest version the migrations start from (earlier ones: sql/legacy/README.md)
const OLDEST_SUPPORTED_VERSION = 11;

/** @return never */
function fail($message) {
    fwrite(STDERR, "migrate: ".$message."\n");
    exit(1);
}

// array(number => path) of sql/migrations/NNN-name.sql
function findMigrations($dir) {
    $migrations = array();
    foreach (glob($dir."/*.sql") as $path) {
        if (!preg_match('/^(\d{3})-[a-z0-9-]+\.sql$/', basename($path), $m)) {
            fail("unexpected file name in ".$dir.": ".basename($path));
        }
        $number = (int)$m[1];
        if (isset($migrations[$number])) {
            fail("two migrations with the number ".$number);
        }
        $migrations[$number] = $path;
    }
    ksort($migrations);
    $numbers = array_keys($migrations);
    if (count($numbers) > 0 && $numbers !== range($numbers[0], $numbers[count($numbers) - 1])) {
        fail("the numbers of the migrations are not consecutive: ".implode(", ", $numbers));
    }
    return $migrations;
}

function currentVersion($db) {
    try {
        $row = $db->query("SELECT `value` FROM `settings` WHERE `key` = 'db.version'")->fetch_row();
    } catch (mysqli_sql_exception $e) {
        fail("cannot read db.version from the table settings (".$e->getMessage().").\n".
            "An empty database is created with sql/install.sql, a database older than version ".
            OLDEST_SUPPORTED_VERSION." has to be upgraded by hand first (sql/legacy/README.md).");
    }
    if ($row === null || !ctype_digit($row[0])) {
        fail("db.version in the table settings is missing or invalid.");
    }
    return (int)$row[0];
}

// runs all statements of the file; throws mysqli_sql_exception at the first one which fails
function runMigration($db, $path) {
    $db->multi_query(file_get_contents($path));
    do {
        $result = $db->store_result();
        if ($result) {
            $result->free();
        }
    } while ($db->more_results() && $db->next_result());
}

$options = getopt('', array('status', 'yes', 'database:', 'help'));
if (isset($options['help'])) {
    echo "usage: php scripts/migrate.php [--status] [--yes] [--database=NAME]\n";
    exit(0);
}
$config = todoConfigPath();
if (!is_readable($config)) {
    fail("cannot read the configuration ".$config);
}
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
    $db = todoDbConnect(todoConfig('db_host'),
        getenv('TODO_MIGRATE_USER') !== false ? getenv('TODO_MIGRATE_USER') : todoConfig('db_user'),
        getenv('TODO_MIGRATE_PASSWORD') !== false ? getenv('TODO_MIGRATE_PASSWORD') : todoConfig('db_password'),
        isset($options['database']) ? $options['database'] : todoConfig('db_database'),
        todoConfig('db_ssl'));
} catch (mysqli_sql_exception $e) {
    fail("cannot connect to the database: ".$e->getMessage());
}

$migrations = findMigrations(__DIR__."/../sql/migrations");
$latest = count($migrations) > 0 ? max(array_keys($migrations)) : OLDEST_SUPPORTED_VERSION;
$version = currentVersion($db);
if ($version < OLDEST_SUPPORTED_VERSION) {
    fail("the database has version ".$version.", the oldest one this script upgrades is ".
        OLDEST_SUPPORTED_VERSION." (see sql/legacy/README.md).");
}
if ($version > $latest) {
    fail("the database has version ".$version." but this program only knows version ".$latest.
        ": update the program.");
}
$pending = array_filter($migrations, function ($number) use ($version) {
    return $number > $version;
}, ARRAY_FILTER_USE_KEY);
echo "database version: ".$version.", latest: ".$latest."\n";
if (count($pending) == 0) {
    echo "nothing to do.\n";
    exit(0);
}
foreach ($pending as $path) {
    echo "pending: ".basename($path)."\n";
}
if (isset($options['status'])) {
    exit(0);
}
if (!isset($options['yes'])) {
    echo "Have you made a backup? Apply these migrations? [y/N] ";
    $answer = fgets(STDIN);
    if ($answer === false || strtolower(trim($answer)) !== 'y') {
        fail("cancelled.");
    }
}
foreach ($pending as $number => $path) {
    echo "applying ".basename($path)." ... ";
    try {
        runMigration($db, $path);
    } catch (mysqli_sql_exception $e) {
        echo "FAILED\n";
        fail($e->getMessage()."\n".basename($path)." stopped at this error, the statements before it are applied. ".
            "Fix the data it complains about and run the rest of the file by hand, or restore the backup and start again.");
    }
    if (currentVersion($db) !== $number) {
        echo "FAILED\n";
        fail(basename($path)." did not set db.version to ".$number.".");
    }
    echo "ok\n";
}
echo "done, database version: ".$latest."\n";
