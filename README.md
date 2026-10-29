# Simple To Do List

A small PHP / MariaDB (MySQL) to-do list with lists, tags, recurring entries and statistics.

## Installation

1. Create a database and load `sql/install.sql`.
2. Copy `config.sample.php` to `config.php` and adapt it.
3. Serve the directory with PHP 8.1+ (mysqli; the tests run on PHP 8.3 and 8.5) behind
   **HTTP authentication and HTTPS**, see below.
   Or run the [container](#container).

The client (`js/`) is a set of ES modules which the browser loads from `js/main.js`; there is no build
step. Only the URL of `js/main.js` carries a version, so the web server has to make browsers check the
other modules each time (`Cache-Control: no-cache`; `.htaccess` and `nginx.conf.sample` do that),
otherwise a browser may keep using an old module after an update.

## Upgrading and backups

Back up the database before every upgrade, and regularly:

```sh
mysqldump --single-transaction todo > todo-$(date +%F).sql
# restore into an empty database:
mysql todo < todo-2026-01-31.sql
```

The version of the database layout is stored in the table `settings` (`db.version`). After
updating the program, upgrade the database with the migration runner:

```sh
php scripts/migrate.php --status      # shows the version and the pending migrations
php scripts/migrate.php               # asks for confirmation, then applies them in order
```

It reads the connection settings of `config.php` (or `TODO_CONFIG`). The database user of the
application usually may not change the schema; set `TODO_MIGRATE_USER` and
`TODO_MIGRATE_PASSWORD` to an administrative account. The migrations are the numbered files in
`sql/migrations/` (`.sql`, or `.php` for a change which SQL cannot express: it returns a function that
gets the database connection); read the comments at the top of a file before you run it, they describe
what it changes and which data would stop it. Schema changes cannot be rolled back: if a migration fails,
the statements before the failing one stay applied. Fix the data it complains about and run the
rest of the file by hand, or restore the backup and start again. What the migrations do so far:

* `012`: `recurrenceMode` (an interval in days) becomes the unit (days, weeks, months, years) and
  `recurrenceInterval` the number of units.
* `013`: tags whose names differ only in case are merged, `recurringCopied` rows of deleted entries
  are removed, and the constraints (unique tag names, foreign keys, ranges of the values) and indexes
  are added. It stops without deleting anything if an entry belongs to a list which does not exist or
  a value is out of range. The `CHECK` constraints need MariaDB 10.2.1 or MySQL 8.0.16 (older servers
  accept but do not enforce them).
* `014`: all tables are converted to `utf8mb4` (emoji and other 4-byte characters) with the collation
  `utf8mb4_unicode_520_ci`. It rebuilds the tables, so run it when nobody uses the application. Tags
  which the new collation considers equal (like `straße` and `STRASSE`) are merged.
* `015`: the start and due dates become `DATE` columns (a time of day of older entries is dropped).
* `016` (a PHP file): descriptions, notes, tag names and list names are stored as plain text instead of
  HTML-encoded (`Stra&szlig;e &amp; Co` becomes `Straße & Co`; the application escapes the text when it
  shows it). Run it right after updating the program: the new program shows the old entities as they
  are. Tags which become equal (like `ä` and `&auml;`) are merged. It only changes data, so it runs in
  one transaction and is applied completely or not at all; the account needs the right to create
  temporary tables.

`sql/install.sql` creates a new database with the layout of the latest version (and `db.version`);
`sql/uninstall.sql` removes it. The scripts of the first versions are in `sql/legacy/`; they cannot be
replayed (see the note there), databases older than version 11 have to be upgraded by hand.
The tests check that a database upgraded from version 11 or 12 has exactly the schema of a new installation.
They run against MariaDB 10.11 and MySQL 8.0 (with the default `sql_mode`, which refuses the zero date
that the first versions used as a default: the migrations 012 and 013 work around that).

A database on another host should be reached over TLS: see `$db_ssl` in `config.sample.php`.

The statistics page is `statistics.php` (it was `statistik.php`): `.htaccess` and `nginx.conf.sample`
redirect the old address, so bookmarks keep working. If you copied their rules into your own server
configuration, add that redirect, and the new include-only file `queries/statistics-data.php` to the files
which are denied.

## Security: deployment

The application has **no login of its own**. It relies on the web server's HTTP authentication
(`REMOTE_USER`) and rejects every request without it, as well as every request not made over
HTTPS (`$require_https`). This is done by the shared library in `webauth/` (see below and
`webauth/README.md`). It is the last line of defence only, set up the rest properly:

* **HTTPS only.** Basic authentication sends the password with every request.
  `.htaccess` (Apache) and `nginx.conf.sample` already require it. The `X-Forwarded-Proto`
  header is never believed by them, as any client can send it; behind a proxy which
  terminates TLS see the notes in `.htaccess`, and `$trust_forwarded_proto` in `config.sample.php`.
* **Strong password hashes:** `htpasswd -B -C 12 -c <file> <user>` (bcrypt). Keep the file outside of the web root.
* **Limit password guessing.** Basic authentication has no lockout. Use fail2ban
  (a filter on the `401` responses of the access log, or on `user ... authentication failure` in the
  Apache error log), `mod_evasive`, or `limit_req` in nginx (see `nginx.conf.sample`).
* **All users share all data.** The application does not separate the data of different
  HTTP-authenticated users (`TodoConstants::DefaultUserID`): everyone who can log in can read,
  change and delete everything.
* **Block internal files in the web server, not only in `.htaccess`.** `.htaccess` is ignored
  if `AllowOverride` does not allow it; then `.git/`, `sql/`, `tests/`, `package*.json` and
  editor backups (`config.php~`) would be downloadable. Copy the rules of `.htaccess` into the
  virtual host (`<Directory>` / `<FilesMatch>`), or deploy a release without `.git`, `tests`, `sql`,
  `scripts` and `node_modules`. `sh tests/apache-access.sh` checks the rules.
* **Keep `config.php` outside of the web root** and set the environment variable `TODO_CONFIG`
  to its path (`SetEnv TODO_CONFIG /etc/todo/config.php` in Apache, `env[TODO_CONFIG]` in the
  php-fpm pool, `fastcgi_param TODO_CONFIG ...;` in nginx).
* **Use a restricted database user**, not `root`:

  ```sql
  CREATE USER 'todo'@'localhost' IDENTIFIED BY '<password>';
  GRANT SELECT, INSERT, UPDATE, DELETE ON todo.* TO 'todo'@'localhost';
  ```

  Upgrade the database with the migration runner `scripts/migrate.php` and an administrative
  account (`TODO_MIGRATE_USER`), not with this user (see *Upgrading and backups*).
* PHP: `expose_php = Off` and `display_errors = Off` (the application also sets the latter for its
  own pages).

## Container

The image runs the application with Apache and PHP as an unprivileged user (port 8080), so it
works with Docker and with rootless Docker / Podman (`podman` can be used instead of `docker`
everywhere below). The CI workflow `container.yml` builds it for `amd64` and `arm64` on every change of
the `main` branch (and once a week) and publishes it as `ghcr.io/codeling/todo:latest` (and `:sha-<commit>`); build it
yourself with `docker build -t todo .`.

The application only works over HTTPS and with HTTP authentication (see *Security*), so the container
is meant to be used **behind a reverse proxy which terminates TLS** (nginx, Caddy, Traefik, ...)
and **overwrites `X-Forwarded-Proto`**. Publish the port only to that proxy (`127.0.0.1:8080:8080`, or
an internal network), and set `TODO_TRUST_FORWARDED_PROTO=true`: then requests with
`X-Forwarded-Proto: https` count as HTTPS. Without the setting the container rejects every request as
not secure. The password is checked by the container, the proxy only passes the `Authorization` header
(and must not cache the responses).

The quickest start is `compose.yaml` (the application and MariaDB, which creates the tables from
`sql/install.sql` on its first start):

```sh
mkdir secrets
openssl rand -hex 24 > secrets/db_password
printf '%s' 'a long password' > secrets/todo_password      # for the user "alice" (see TODO_USER)
docker compose up -d                                       # http://127.0.0.1:8080, behind your proxy
```

With Caddy as the proxy: `todo.example.com { reverse_proxy 127.0.0.1:8080 }`.
To try it without a proxy: `curl -u alice:<password> -H 'X-Forwarded-Proto: https' http://127.0.0.1:8080/`.

Without compose, create the database as in *Installation* and start the container:

```sh
docker run -d --name todo -p 127.0.0.1:8080:8080 \
    -e TODO_DB_HOST=db.example.com -e TODO_DB_PASSWORD_FILE=/run/secrets/db_password \
    -e TODO_USER=alice -e TODO_PASSWORD_FILE=/run/secrets/todo_password \
    -e TODO_TRUST_FORWARDED_PROTO=true \
    -v "$PWD/secrets":/run/secrets:ro,Z \
    --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true \
    ghcr.io/codeling/todo:latest
```

| Environment variable | Meaning | Default |
| --- | --- | --- |
| `TODO_DB_HOST`, `TODO_DB_USER`, `TODO_DB_NAME` | database connection (`$db_host`, `$db_user`, `$db_database`) | `db`, `todo`, `todo` |
| `TODO_DB_PASSWORD` or `TODO_DB_PASSWORD_FILE` | password of the database user | empty |
| `TODO_DB_SSL` | `true`: TLS for the database connection (`$db_ssl`) | `false` |
| `TODO_LANGUAGE` | language, a file name of `lang/` without `.ini` | `en-US` |
| `TODO_TRUST_FORWARDED_PROTO` | `true`: believe `X-Forwarded-Proto` (`$trust_forwarded_proto`, see above) | `false` |
| `TODO_USER`, `TODO_PASSWORD` or `TODO_PASSWORD_FILE` | the user of the web interface (stored as a bcrypt hash) | required |

Prefer the `..._FILE` variants (Docker / Podman secrets or mounted files) to plain passwords in the
environment; the container removes the passwords from the environment of the web server. More users,
or settings which have no variable (like `$db_ssl` with certificates), need files: mount a full
`config.php` (see `config.sample.php`) at `/etc/todo/config.php` and an `htpasswd` file
(`htpasswd -B -C 12 -c htpasswd alice`) at `/etc/todo/htpasswd`; they replace the variables above.
Rootless Podman and SELinux need `:Z` on such mounts, and the files must be readable by the user of
the container (`podman unshare chown 33:33 <file>` or `chmod a+r`).

The root file system can be read-only; only `/tmp` has to be writable (it holds the generated
`config.php` and password file). Apache logs to the output of the container.

### Data, backup, import and upgrades

The container itself keeps no data. Everything is in the database; with `compose.yaml` it is in the
named volume `db` (`/var/lib/mysql` of the `db` service). It survives `docker compose down` and
`docker compose pull`, but not `docker compose down -v`. Export and import go through SQL dumps, not
through copies of the files of the volume (those only work with the same MariaDB version). The
database user of `compose.yaml` has all privileges on the database `todo`, the password of
`root` is random and not needed. The commands read the password from the secret of the `db` service:

```sh
# export (back up before every upgrade, and regularly)
docker compose exec -T db sh -c 'mariadb-dump --single-transaction -utodo -p"$(cat /run/secrets/db_password)" todo' > todo-$(date +%F).sql

# import: replaces the tables of the dump, e.g. into a new volume
docker compose exec -T db sh -c 'mariadb -utodo -p"$(cat /run/secrets/db_password)" todo' < todo-2026-01-31.sql
```

If you start a container with `docker run` and another database server, use `mysqldump` and `mysql`
as in *Upgrading and backups*.

**Moving an existing database into the container:**

1. Dump the old database (see *Upgrading and backups*): `mysqldump --single-transaction todo > todo.sql`.
   The version of the layout must be 12 or newer (``SELECT value FROM settings WHERE `key` = 'db.version'``).
2. Start the new setup (`docker compose up -d`, as above). A new volume is created, and `sql/install.sql`
   creates empty tables in it.
3. Import the dump with the import command above. It replaces the empty tables with the old data.
4. If the dump comes from an older version of the application than the image, upgrade the database:

   ```sh
   docker compose run --rm todo php scripts/migrate.php --status
   docker compose run --rm todo php scripts/migrate.php
   ```

   (with `compose.yaml` the database user may change the schema; with another database server set
   `TODO_MIGRATE_USER` and `TODO_MIGRATE_PASSWORD` with `-e`, see *Upgrading and backups*).
5. Open the application and check the data, then stop the old installation.

The same steps move the data back out: export it and import it into the other database.

**Upgrading the image:** make a backup, `docker compose pull && docker compose up -d`, then run
`docker compose run --rm todo php scripts/migrate.php` (`--status` shows the pending migrations); the
application needs the database of its own version, so do this right after the update.

`sh tests/container.sh` tests the image (access rules, database connection, no root user).

## Shared authentication library

`webauth/` is a copy of [php-webauth](https://github.com/codeling/php-webauth), which is shared
with [W2](https://github.com/codeling/w2wiki), included as a git subtree. Besides the guard used here,
it has CSRF tokens, IP allowlists, a password check and throttling of failed logins, for a
login of the application's own later on. Change the library in its own repository, and update
the copy with

```sh
git subtree pull --prefix=webauth https://github.com/codeling/php-webauth.git main --squash
```

## Tests

See `tests/README.md`. The workflows in `.github/workflows` run them (and test the container image), check that `vendor/` matches
`package-lock.json` and run `npm audit`.

## Dependency updates

The actions and the container images are pinned to exact versions (commit SHA, image digest);
Dependabot (`.github/dependabot.yml`) opens pull requests for new versions. `dependabot-auto-merge.yml`
merges the patch updates of the actions and images once the checks have passed, and the weekly
build of `container.yml` publishes them. For that, enable in the repository settings:

* *General → Pull Requests → Allow auto-merge*
* in the ruleset for `main` (*Rules → Rulesets*): *Require status checks to pass*, source
  *GitHub Actions*. Without required checks, GitHub would merge the pull requests at once, before
  the tests have run. The checks are the job names, each version of a matrix job on its own:
  * `tests.yml`: `php-lint (PHP 8.3)`, `php-lint (PHP 8.5)`, `phpstan`, `apache-access`,
    `integration (PHP 8.3, MariaDB 10.11)`, `integration (PHP 8.5, MariaDB 10.11)`,
    `integration (PHP 8.3, MySQL 8.0)`, `integration (PHP 8.5, MySQL 8.0)`
  * `vendor.yml`: `vendor-up-to-date`
  * `container.yml`: `test` (not `publish`, which does not run for pull requests)

  When the PHP or database versions of `tests.yml` change, the names change too: update the
  ruleset along with them, or no pull request can be merged (a required check which never
  runs stays "expected"). GitHub also suggests names of earlier runs (e.g. `php-lint` without
  a version), which do not run any more.

Minor and major updates, npm updates (`vendor/` has to be regenerated, see `dependabot.yml`) and
updates of only the image digest (rebuilds of the same version) are left to be merged by hand.
