#!/bin/sh
# Checks the container image (Dockerfile) with a throwaway MariaDB container: HTTPS and
# authentication, hidden files, the database connection, the migration script.
#   sh tests/container.sh [image]      (default: builds the image from this checkout as todo:test)
# Needs docker (or set DOCKER=podman).
set -eu
DOCKER=${DOCKER:-docker}
REPO=$(cd "$(dirname "$0")/.." && pwd)
IMAGE=${1:-}
ID=todo-test-$$
PORT=${CONTAINER_TEST_PORT:-8091}
FAIL=0
cleanup() { $DOCKER rm -f $ID-db $ID-app $ID-untrusted >/dev/null 2>&1 || true; $DOCKER network rm $ID >/dev/null 2>&1 || true; }
trap cleanup EXIT

if [ -z "$IMAGE" ]; then
    IMAGE=todo:test
    $DOCKER build -q -t "$IMAGE" "$REPO" >/dev/null
fi

$DOCKER network create $ID >/dev/null
$DOCKER run -d --name $ID-db --network $ID \
    -e MARIADB_DATABASE=todo -e MARIADB_USER=todo -e MARIADB_PASSWORD=db-secret -e MARIADB_RANDOM_ROOT_PASSWORD=1 \
    -v "$REPO/sql/install.sql:/docker-entrypoint-initdb.d/install.sql:ro" mariadb:10.11 >/dev/null
# the init script runs on a temporary server first, so wait for the real one
for i in $(seq 1 60); do
    $DOCKER exec $ID-db healthcheck.sh --connect --innodb_initialized >/dev/null 2>&1 &&
        $DOCKER exec $ID-db mariadb -utodo -pdb-secret todo -e 'SELECT 1 FROM settings' >/dev/null 2>&1 && break
    sleep 2
done

# the settings of the readme: read-only root file system, no capabilities
run_app() { # name, port, extra arguments...
    name=$1; port=$2; shift 2
    $DOCKER run -d --name "$name" --network $ID -p 127.0.0.1:$port:8080 \
        --read-only --tmpfs /tmp \
        --cap-drop ALL --security-opt no-new-privileges:true \
        -e TODO_DB_HOST=$ID-db -e TODO_DB_PASSWORD=db-secret -e TODO_USER=alice -e TODO_PASSWORD='pa$$ w"ord' \
        "$@" "$IMAGE" >/dev/null
    for i in $(seq 1 30); do
        curl -s -o /dev/null "http://127.0.0.1:$port/todo.css" && return 0
        sleep 1
    done
    echo "FAIL: $name did not start"; $DOCKER logs "$name"; exit 1
}
run_app $ID-app $PORT -e TODO_TRUST_FORWARDED_PROTO=true
run_app $ID-untrusted $((PORT + 1))

URL=http://127.0.0.1:$PORT
check() { # description, expected status, curl arguments...
    desc=$1; expected=$2; shift 2
    code=$(curl -s -o /dev/null -w '%{http_code}' "$@")
    if [ "$code" = "$expected" ]; then echo "ok   $desc ($code)"; else echo "FAIL $desc: got $code, expected $expected"; FAIL=1; fi
}
TLS='X-Forwarded-Proto: https'
AUTH='alice:pa$$ w"ord'
check "plain HTTP is rejected before asking for a password" 403 "$URL/index.php"
check "plain HTTP with credentials" 403 -u "$AUTH" "$URL/index.php"
check "HTTPS without credentials" 401 -H "$TLS" "$URL/index.php"
check "HTTPS with wrong password" 401 -H "$TLS" -u alice:wrong "$URL/index.php"
check "HTTPS with credentials" 200 -H "$TLS" -u "$AUTH" "$URL/index.php"
check "data query (database connection)" 200 -H "$TLS" -u "$AUTH" "$URL/queries/query-lists.php"
check "static file" 200 -H "$TLS" -u "$AUTH" "$URL/vendor/jquery/jquery.min.js"
for hidden in scripts/migrate.php tests/lib.js docker/entrypoint.sh; do
    check "$hidden is not served" 404 -H "$TLS" -u "$AUTH" "$URL/$hidden"
done
for denied in sql/install.sql config.php config.sample.php package.json queries/db.php session.php .htaccess README.md; do
    check "$denied is not served" 403 -H "$TLS" -u "$AUTH" "$URL/$denied"
done
check "X-Forwarded-Proto is not believed without TODO_TRUST_FORWARDED_PROTO" 403 \
    -H "$TLS" -u "$AUTH" "http://127.0.0.1:$((PORT + 1))/index.php"

if [ "$($DOCKER exec $ID-app id -u)" != 0 ]; then echo "ok   runs as an unprivileged user"; else echo "FAIL runs as root"; FAIL=1; fi
# (docker exec shows the environment the container was created with, not the one of the server)
if $DOCKER exec $ID-app cat /proc/1/environ | tr '\0' '\n' | grep -q 'db-secret\|pa\$\$'; then echo "FAIL passwords in the environment"; FAIL=1; else echo "ok   no passwords in the environment"; fi
if $DOCKER exec $ID-app grep -q 'db-secret' /tmp/todo/config.php; then echo "ok   config.php generated"; else echo "FAIL config.php"; FAIL=1; fi

# one-off commands do not need the web interface user
if $DOCKER run --rm --network $ID --read-only --tmpfs /tmp -e TODO_DB_HOST=$ID-db -e TODO_DB_PASSWORD=db-secret "$IMAGE" \
        php scripts/migrate.php --status | grep -qi 'up to date\|no pending\|version'; then
    echo "ok   migrate.php --status"
else
    echo "FAIL migrate.php --status"; FAIL=1
fi
# no user configured
if $DOCKER run --rm --read-only --tmpfs /tmp "$IMAGE" >/dev/null 2>&1; then echo "FAIL started without a user"; FAIL=1; else echo "ok   refuses to start without a user"; fi
exit $FAIL
