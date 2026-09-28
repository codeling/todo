# Tests

Run by `.github/workflows/tests.yml`. Locally:

1. Create a database from `sql/install.sql`, write a matching `config.php`,
   and start the application, e.g. `php -S 127.0.0.1:8000`.
   The tests truncate all tables, so use a separate database.
2. `npm ci` and `npx playwright install chromium`
   (or set `CHROMIUM_PATH` to an installed Chromium).
3. `TODO_URL=http://127.0.0.1:8000 TODO_MYSQL="mysql -h127.0.0.1 -uroot -proot todo" npm test`
   (`TODO_MYSQL` is the client command line used to prepare and check the database).

`sh tests/apache-access.sh` checks the access rules of `.htaccess`
with a temporary Apache instance (run as root, needs `apache2` and `htpasswd`).
