# Simple To Do List: PHP + Apache. Build: docker build -t todo .   (see "Container" in README.md)
# The container speaks plain HTTP on port 8080 and runs as an unprivileged user, so it also works
# with rootless Docker / Podman. The application only runs over HTTPS with HTTP authentication:
# put a reverse proxy which terminates TLS in front of it.
FROM php:8.5.12-apache@sha256:7cd25eb48f9763dfeabe8fda3939897aca2001802fadeafa1b602f26c735ef96

RUN docker-php-ext-install mysqli \
    && a2enmod headers \
    && apt-get update \
    && apt-get install -y --no-install-recommends apache2-utils \
    && rm -rf /var/lib/apt/lists/*

COPY docker/apache.conf /etc/apache2/conf-available/todo.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/todo.ini
COPY docker/entrypoint.sh /usr/local/bin/todo-entrypoint
COPY . /var/www/html/

# - Apache listens on 8080 and writes its pid/lock files to /tmp/apache2, so that an unprivileged user can
# - the access rules are the ones of .htaccess, which only needs the real path of the password file
# - /tmp/todo holds the generated config.php and password file (see docker/entrypoint.sh); with a
#   read-only root file system only /tmp needs to be writable
RUN a2enconf todo \
    && sed -i 's/^Listen 80$/Listen 8080/' /etc/apache2/ports.conf \
    && sed -i 's/:80>/:8080>/' /etc/apache2/sites-available/000-default.conf \
    && sed -i 's#/path/outside/webroot/.htpasswd#/tmp/todo/htpasswd#' /var/www/html/.htaccess \
    && rm -rf /var/www/html/docker \
    && chmod +x /usr/local/bin/todo-entrypoint

ENV TODO_CONFIG=/tmp/todo/config.php \
    APACHE_RUN_DIR=/tmp/apache2 \
    APACHE_LOCK_DIR=/tmp/apache2 \
    APACHE_PID_FILE=/tmp/apache2/apache2.pid
USER www-data
EXPOSE 8080
ENTRYPOINT ["todo-entrypoint"]
CMD ["apache2-foreground"]
