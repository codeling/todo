# Simple To Do List

A small PHP / MariaDB (MySQL) to-do list with lists, tags, recurring entries and statistics.

## Installation

1. Create a database and load `sql/install.sql`.
2. Copy `config.sample.php` to `config.php` and adapt it.
3. Serve the directory with PHP (mysqli) behind **HTTP authentication and HTTPS**, see below.

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
`sql/migrations/`; read the comments at the top of a file before you run it, they describe what it
changes and which data would stop it. Schema changes cannot be rolled back: if a migration fails,
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

`sql/install.sql` creates a new database with the layout of the latest version (and `db.version`);
`sql/uninstall.sql` removes it. The scripts of the first versions are in `sql/legacy/`; they cannot be
replayed (see the note there), databases older than version 11 have to be upgraded by hand.
The tests check that a database upgraded from version 11 or 12 has exactly the schema of a new installation.
They run against MariaDB 10.11 and MySQL 8.0 (with the default `sql_mode`, which refuses the zero date
that the first versions used as a default: the migrations 012 and 013 work around that).

A database on another host should be reached over TLS: see `$db_ssl` in `config.sample.php`.

## Security: deployment

The application has **no login of its own**. It relies on the web server's HTTP authentication
(`REMOTE_USER`) and rejects every request without it, as well as every request not made over
HTTPS (`$require_https`). This is done by the drop-in library in `basic-auth/`, which can be
reused in other small apps (see `basic-auth/README.md`). It is the last line of defence only,
set up the rest properly:

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
  GRANT SELECT, INSERT, UPDATE, DELETE, CREATE TEMPORARY TABLES ON todo.* TO 'todo'@'localhost';
  ```

  (`CREATE TEMPORARY TABLES` is used when recurring entries are copied.) Apply `sql/update-*.sql`
  with an administrative account.
* PHP: `expose_php = Off` and `display_errors = Off` (the application also sets the latter for its
  own pages).

## Tests

See `tests/README.md`. The workflows in `.github/workflows` run them, check that `vendor/` matches
`package-lock.json` and run `npm audit`.
