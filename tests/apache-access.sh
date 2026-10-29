#!/bin/sh
# Checks the access rules in .htaccess with a throwaway Apache instance
# (needs apache2 and htpasswd; PHP is not executed, only access is checked).
set -eu
REPO=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
PORT=${APACHE_TEST_PORT:-8090}
MODS=/usr/lib/apache2/modules
trap 'apache2 -f "$WORK/httpd.conf" -k stop >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

mkdir -p "$WORK/www"
cp -r "$REPO" "$WORK/www/todo"
touch "$WORK/www/todo/config.php"
# created in the checkout for compose.yaml (README.md), ignored by git
mkdir -p "$WORK/www/todo/secrets" && echo secret > "$WORK/www/todo/secrets/todo_password"
htpasswd -bc "$WORK/htpasswd" alice secret 2>/dev/null
sed -i "s#/path/outside/webroot/.htpasswd#$WORK/htpasswd#" "$WORK/www/todo/.htaccess"
chmod -R a+rX "$WORK"
cat > "$WORK/httpd.conf" <<CONF
ServerRoot /etc/apache2
ServerName localhost
Listen 127.0.0.1:$PORT
PidFile $WORK/httpd.pid
ErrorLog $WORK/error.log
User www-data
Group www-data
LoadModule mpm_event_module $MODS/mod_mpm_event.so
LoadModule authz_core_module $MODS/mod_authz_core.so
LoadModule authz_user_module $MODS/mod_authz_user.so
LoadModule authn_core_module $MODS/mod_authn_core.so
LoadModule authn_file_module $MODS/mod_authn_file.so
LoadModule auth_basic_module $MODS/mod_auth_basic.so
LoadModule alias_module $MODS/mod_alias.so
LoadModule headers_module $MODS/mod_headers.so
LoadModule setenvif_module $MODS/mod_setenvif.so
LoadModule mime_module $MODS/mod_mime.so
TypesConfig /etc/mime.types
DocumentRoot $WORK/www
# stands in for TLS: a proxy which terminates it is trusted to set HTTPS (see .htaccess);
# the test server only speaks HTTP
SetEnvIfExpr "%{HTTP:X-Test-TLS} == 'on'" HTTPS=on
<Directory $WORK/www>
    AllowOverride All
    Require all granted
</Directory>
CONF
apache2 -f "$WORK/httpd.conf" -k start
sleep 1

URL=http://127.0.0.1:$PORT/todo
FAIL=0
# The files which must be denied are derived from the code (same rules as tests/deny-lists.test.js,
# which compares them with the lists in .htaccess and nginx.conf.sample), so a new helper is checked
# without changing this script:
# - endpoints = queries/<name>.php called by the client JavaScript (*.js in the root and in js/)
# - helpers = the other queries/*.php files
# - pages = index.php and the root .php files referenced by index.php with src="" or href=""
# - include-only = the other root .php files, except config*.php
endpoints=$({
    grep -hoE 'queries/[A-Za-z0-9_-]+\.php' "$REPO"/*.js || true
    if [ -d "$REPO/js" ]; then
        grep -rhoE --include='*.js' 'queries/[A-Za-z0-9_-]+\.php' "$REPO/js" || true
    fi
} | sed 's#^queries/##; s#\.php$##' | sort -u)
pages=$({
    echo index
    grep -Eo '(src|href)="[A-Za-z0-9_.-]+\.php["?#]' "$REPO/index.php" || true
} | sed 's/^[a-z]*="//; s/\.php["?#]$//' | sort -u)
helpers=
for f in "$REPO"/queries/*.php; do
    name=$(basename "$f" .php)
    echo "$endpoints" | grep -Fqx "$name" || helpers="$helpers $name"
done
include_only=
for f in "$REPO"/*.php; do
    name=$(basename "$f" .php)
    case "$name" in config*) continue ;; esac
    echo "$pages" | grep -Fqx "$name" || include_only="$include_only $name"
done
if [ -z "$endpoints" ] || [ "$pages" = index ]; then
    echo "FAIL no endpoints or pages found in the client JavaScript and index.php"
    FAIL=1
fi
# path, expected status without credentials, expected status with credentials
# (X-Test-TLS: on, see above)
check() {
    noauth=$(curl -s -H 'X-Test-TLS: on' -o /dev/null -w '%{http_code}' "$URL/$1")
    auth=$(curl -s -H 'X-Test-TLS: on' -u alice:secret -o /dev/null -w '%{http_code}' "$URL/$1")
    if [ "$noauth" = "$2" ] && [ "$auth" = "$3" ]; then
        echo "ok   $1 ($noauth/$auth)"
    else
        echo "FAIL $1: got $noauth/$auth, expected $2/$3"
        FAIL=1
    fi
}
for name in $pages; do
    check "$name.php" 401 200
done
for name in $endpoints; do
    check "queries/$name.php" 401 200
done
check vendor/jquery/jquery.min.js 401 200
check todo.css 401 200
for denied in sql/install.sql lang/en-US.ini config.php config.sample.php package.json \
        package-lock.json scripts/vendor.sh webauth/webauth.php webauth/src/ServerAuth.php webauth/README.md webauth/samples/htaccess.sample webauth/composer.json webauth/tests/ServerAuthTest.php \
        config.php/x .htaccess nginx.conf.sample README.md phpstan.neon; do
    check "$denied" 403 403
done
# the helpers of queries/ and the include-only files of the root, also with a trailing path
# (FilesMatch applies to it too, see .htaccess)
for name in $helpers; do
    check "queries/$name.php" 403 403
    check "queries/$name.php/x" 403 403
done
for name in $include_only; do
    check "$name.php" 403 403
    check "$name.php/x" 403 403
done
for hidden in scripts/migrate.php secrets/todo_password secrets .git/HEAD node_modules/jquery/dist/jquery.js tests/lib.js; do
    check "$hidden" 401 404
done
# migrations written in PHP: sql/ is hidden as a whole, not by the extension (.sql files are denied by it)
for f in "$REPO"/sql/migrations/*.php; do
    check "sql/migrations/$(basename "$f")" 401 404
done
# plain HTTP: no password prompt (403, not 401), with or without credentials, and
# also if the client claims that a proxy terminated TLS (any client can send that header)
for creds in "" "-u alice:secret" "-H X-Forwarded-Proto:https -u alice:secret"; do
    code=$(curl -s $creds -o /dev/null -w '%{http_code}' "$URL/index.php")
    if [ "$code" = 403 ]; then echo "ok   plain HTTP index.php ($code) $creds"; else echo "FAIL plain HTTP index.php: got $code, expected 403 ($creds)"; FAIL=1; fi
done
headers=$(curl -s -H 'X-Test-TLS: on' -u alice:secret -D - -o /dev/null "$URL/todo.css")
echo "$headers" | grep -qi '^X-Frame-Options: DENY' || { echo "FAIL missing X-Frame-Options"; FAIL=1; }
echo "$headers" | grep -qi '^X-Content-Type-Options: nosniff' || { echo "FAIL missing nosniff"; FAIL=1; }
echo "$headers" | grep -qi '^Strict-Transport-Security: ' || { echo "FAIL missing Strict-Transport-Security"; FAIL=1; }
exit $FAIL
