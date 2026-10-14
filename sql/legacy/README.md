# Legacy update scripts

`update-001.sql` … `update-012.sql` upgraded the very first versions of the database, one by one.
They are kept for the record and **cannot be replayed**:

* there is no script for the original layout they start with (`update-001.sql` refers to tables
  and columns `install.sql` never had) and `update-001.sql` is not even valid SQL
  and contains data fixes for one specific database (ids, a date),
* some undo each other (`update-006.sql` drops `todo.list_id`, `update-009.sql` adds it again).

A database which has the table `settings` with `db.version` 12 or higher is up to date enough for the
migration runner (`php scripts/migrate.php`, see the README). Anything older has to be brought to
version 12 by hand (the scripts from `update-009.sql` on are the ones which still make sense), or
exported and imported into a new installation.
