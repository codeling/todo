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

`tests/basic-auth.test.js` tests the `basic-auth/` library on its own, `tests/auth.test.js` the
check in the application. Both start its own PHP servers (no database needed) to test the check for
an authenticated user.

`sh tests/apache-access.sh` checks the access rules of `.htaccess`
with a temporary Apache instance (run as root, needs `apache2` and `htpasswd`).
