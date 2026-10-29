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

Static analysis of the PHP code (level and exceptions in `phpstan.neon`): `phpstan analyse`
([PHPStan](https://phpstan.org/) 2, e.g. `phpstan.phar` of its releases).

`tests/schema.test.js` tests the constraints of the database and the migrations (`scripts/migrate.php`):
it creates and drops the databases `todo_migration_old` and `todo_migration_fresh`, so the database
user needs to be allowed to do that. `tests/fixtures/install-v11.sql` etc. are the layouts before
the migrations; a database migrated from version 11 or 12 must have the schema of `sql/install.sql`, so a
new migration needs a change of `install.sql` (and its `db.version`) too.
`tests/db-config.test.js` tests the connection settings.
`tests/performance.test.js` fills the database with 10,000 entries and checks how many rows a
request reads (the `Handler_read_*` counters, not the time, which is unreliable); a missing index
shows as a number close to the size of the table. It needs the database to be used by this test only.

`tests/ui.test.js` drives the pages with Playwright. It reads the state of the client (`itemList`, the
Tagify instances, the log, ...) through `window.todoApp`, which `js/main.js` creates for that purpose.

`tests/statistics.test.js` checks the charts of the statistics page against a small known set of entries (and
the periods and the SQL keys of the buckets around new year with the `php` command line); every bar of the
SVG charts has `data-key` and `data-count` for that. It uses the date of the database, so it can run on any day.

`tests/ignore-files.test.js` checks that everything in `.gitignore` is also in `.dockerignore`, so that
passwords and database dumps are not copied into the container image (no server or database needed).

`tests/deny-lists.test.js` checks that `.htaccess` and `nginx.conf.sample` deny exactly the files which
are only included by other scripts: the `queries/*.php` files which the client JavaScript does not call
(`queries/<name>.php` URLs in `*.js` in the root and in `js/`) and the root `.php` files which are neither
referenced by `index.php` nor `config*.php`. A new helper which is not in both lists fails the test, and so
does a stale name (no server or database needed).

`tests/webauth.test.js` tests the guard of the `webauth/` library on its own (the library's
own PHPUnit tests are in `webauth/tests`, run in its repository), `tests/auth.test.js` the
check in the application. Both start its own PHP servers (no database needed) to test the check for
an authenticated user.

`sh tests/apache-access.sh` checks the access rules of `.htaccess`
with a temporary Apache instance (run as root, needs `apache2` and `htpasswd`). It derives the
helpers, the endpoints and the include-only files of the root with the same rules as
`tests/deny-lists.test.js`: the helpers must give 403, the endpoints 401 (200 with the password). It also checks that the old
`statistik.php` is redirected (301) to `statistics.php`, and that the ES modules in `js/` are served
as JavaScript with `Cache-Control: no-cache` (also with the 304 answer to a conditional request),
which is how browsers learn about a changed module (only `js/main.js` has a version in its URL).

`sh tests/container.sh [image]` tests the container image (`Dockerfile`) with a throwaway MariaDB
container: HTTPS and authentication, hidden files, database connection, `scripts/migrate.php`. It needs
docker (or `DOCKER=podman`); run by `.github/workflows/container.yml`.
