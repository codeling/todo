#!/bin/sh
# Prepares the configuration of the application from the environment, then starts Apache.
# Settings (see "Container" in README.md):
#   TODO_DB_HOST (db), TODO_DB_USER (todo), TODO_DB_PASSWORD, TODO_DB_NAME (todo), TODO_DB_SSL
#   TODO_LANGUAGE (en-US), TODO_TRUST_FORWARDED_PROTO
#   TODO_USER and TODO_PASSWORD: the one user of the web interface
# TODO_DB_PASSWORD and TODO_PASSWORD can be replaced by TODO_DB_PASSWORD_FILE / TODO_PASSWORD_FILE
# (Docker / Podman secrets). Files which replace the settings above:
#   /etc/todo/config.php   used instead of the generated config.php (see config.sample.php)
#   /etc/todo/htpasswd     used instead of TODO_USER / TODO_PASSWORD (htpasswd -B -C 12 -c ...)
set -eu
umask 077
mkdir -p /tmp/todo /tmp/apache2

# value of $1, or the content of the file named in $1_FILE
file_env() {
    name=$1
    eval "file=\${${name}_FILE:-}"
    eval "value=\${${name}:-}"
    if [ -n "$file" ]; then
        if [ -n "$value" ]; then
            echo "todo: set either $name or ${name}_FILE, not both" >&2
            exit 1
        fi
        [ -r "$file" ] || { echo "todo: cannot read $file" >&2; exit 1; }
        value=$(cat "$file")
    fi
    printf '%s' "$value"
}

if [ -f /etc/todo/config.php ]; then
    export TODO_CONFIG=/etc/todo/config.php
else
    case "${TODO_LANGUAGE:-en-US}" in
        *[!A-Za-z-]*) echo "todo: invalid TODO_LANGUAGE" >&2; exit 1 ;;
    esac
    TODO_DB_PASSWORD=$(file_env TODO_DB_PASSWORD)
    export TODO_DB_PASSWORD
    # var_export quotes the values, so that they cannot inject code
    php -r '
        $e = function ($name, $default) { $v = getenv($name); return $v === false || $v === "" ? $default : $v; };
        $bool = function ($name) use ($e) { return strtolower($e($name, "false")) === "true"; };
        echo "<?php\n";
        echo "\$db_host = ", var_export($e("TODO_DB_HOST", "db"), true), ";\n";
        echo "\$db_user = ", var_export($e("TODO_DB_USER", "todo"), true), ";\n";
        echo "\$db_password = ", var_export($e("TODO_DB_PASSWORD", ""), true), ";\n";
        echo "\$db_database = ", var_export($e("TODO_DB_NAME", "todo"), true), ";\n";
        echo "\$db_ssl = ", var_export($bool("TODO_DB_SSL"), true), ";\n";
        echo "\$language = ", var_export($e("TODO_LANGUAGE", "en-US"), true), ";\n";
        echo "\$trust_forwarded_proto = ", var_export($bool("TODO_TRUST_FORWARDED_PROTO"), true), ";\n";
    ' > /tmp/todo/config.php
    export TODO_CONFIG=/tmp/todo/config.php
fi

# only the web server needs the user (not e.g. "php scripts/migrate.php")
if [ "${1:-}" != apache2-foreground ]; then
    :
elif [ -f /etc/todo/htpasswd ]; then
    ln -sf /etc/todo/htpasswd /tmp/todo/htpasswd
else
    password=$(file_env TODO_PASSWORD)
    if [ -z "${TODO_USER:-}" ] || [ -z "$password" ]; then
        echo "todo: the web interface needs a user: set TODO_USER and TODO_PASSWORD (or TODO_PASSWORD_FILE)," >&2
        echo "todo: or mount an htpasswd file at /etc/todo/htpasswd" >&2
        exit 1
    fi
    printf '%s\n' "$password" | htpasswd -i -B -C 12 -c /tmp/todo/htpasswd "$TODO_USER" >/dev/null
fi
# the passwords are not needed any more: keep them out of the environment of Apache and PHP
unset TODO_PASSWORD TODO_PASSWORD_FILE TODO_DB_PASSWORD TODO_DB_PASSWORD_FILE password

exec docker-php-entrypoint "$@"
