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
LoadModule mime_module $MODS/mod_mime.so
TypesConfig /etc/mime.types
DocumentRoot $WORK/www
<Directory $WORK/www>
    AllowOverride All
    Require all granted
</Directory>
CONF
apache2 -f "$WORK/httpd.conf" -k start
sleep 1

URL=http://127.0.0.1:$PORT/todo
FAIL=0
# path, expected status without credentials, expected status with credentials
check() {
    noauth=$(curl -s -o /dev/null -w '%{http_code}' "$URL/$1")
    auth=$(curl -s -u alice:secret -o /dev/null -w '%{http_code}' "$URL/$1")
    if [ "$noauth" = "$2" ] && [ "$auth" = "$3" ]; then
        echo "ok   $1 ($noauth/$auth)"
    else
        echo "FAIL $1: got $noauth/$auth, expected $2/$3"
        FAIL=1
    fi
}
check index.php 401 200
check queries/trash.php 401 200
check vendor/jquery/jquery.min.js 401 200
check todo.css 401 200
for denied in sql/install.sql lang/en-US.ini config.php config.sample.php package.json \
        package-lock.json scripts/vendor.sh session.php todo-core.php lang.php queries/db.php \
        queries/tags.php queries/reactivate-temp.php .htaccess nginx.conf.sample; do
    check "$denied" 403 403
done
for hidden in .git/HEAD node_modules/jquery/dist/jquery.js tests/lib.js; do
    check "$hidden" 401 404
done
headers=$(curl -s -u alice:secret -D - -o /dev/null "$URL/todo.css")
echo "$headers" | grep -qi '^X-Frame-Options: DENY' || { echo "FAIL missing X-Frame-Options"; FAIL=1; }
echo "$headers" | grep -qi '^X-Content-Type-Options: nosniff' || { echo "FAIL missing nosniff"; FAIL=1; }
exit $FAIL
