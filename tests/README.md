# Tests

Run by `.github/workflows/tests.yml`. Locally:

1. Create a database from `sql/install.sql`, write a matching `config.php`
   (with `$require_http_auth = false; $require_https = false;`, as the PHP development
   server does no HTTP authentication and no TLS), and start the application, e.g. `php -S 127.0.0.1:8000`.
   The tests truncate all tables, so use a separate database.
2. `npm ci` and `npx playwright install chromium`
   (or set `CHROMIUM_PATH` to an installed Chromium).
3. `TODO_URL=http://127.0.0.1:8000 TODO_MYSQL="mysql -h127.0.0.1 -uroot -proot todo" npm test`
   (`TODO_MYSQL` is the client command line used to prepare and check the database).

`tests/schema.test.js` tests the constraints of the database and the migrations (`scripts/migrate.php`):
it creates and drops the databases `todo_migration_old` and `todo_migration_fresh`, so the database
user needs to be allowed to do that. `tests/fixtures/install-v12.sql` etc. are the layouts before
the migrations; a database migrated from version 12 must have the schema of `sql/install.sql`, so a
new migration needs a change of `install.sql` (and its `db.version`) too.
`tests/db-config.test.js` tests the connection settings.
`tests/performance.test.js` fills the database with 10,000 entries and checks how many rows a
request reads (the `Handler_read_*` counters, not the time, which is unreliable); a missing index
shows as a number close to the size of the table. It needs the database to be used by this test only.

`tests/basic-auth.test.js` tests the `basic-auth/` library on its own, `tests/auth.test.js` the
check in the application. Both start its own PHP servers (no database needed) to test the check for
an authenticated user.

`sh tests/apache-access.sh` checks the access rules of `.htaccess`
with a temporary Apache instance (run as root, needs `apache2` and `htpasswd`).
