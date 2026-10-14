<?php
# This is an example configuration file
# for Simple Todo List
#
# It lists all the available settings,
# with descriptions and exemplary values.
#
# For the actual program to work, a file
# named config.php is required with the
# configuration values required for your
# setup.
#
# Please note that you need to adapt
# these values to your specific setup
#
# Security: the application has no login of
# its own. Only deploy it behind HTTP
# authentication and over HTTPS, see
# .htaccess (Apache) or nginx.conf.sample.
# Requests the web server did not authenticate
# (no REMOTE_USER) are rejected, so a missing
# or ignored web server configuration does not
# leave your data open. Keep this file outside
# of the web root if your setup allows it: set
# the environment variable TODO_CONFIG to its
# path (SetEnv in Apache, env[TODO_CONFIG] in
# the php-fpm pool, fastcgi_param in nginx).
# See README.md for more on deployment.
#
########################################
# database connection settings:

# the database connection host.
$db_host     = "localhost";
# the database user
$db_user     = "todo";
# the database password
$db_password = "";
# the database name
$db_database = "todo";

# TLS for the connection: only needed if the database is on
# another host (not on this machine). true uses the defaults
# of the client library, or list the files and options:
# $db_ssl = true;
# $db_ssl = array(
#     'ca' => '/etc/ssl/certs/db-ca.pem',  # certificate authority of the server
#     # 'cert' => '...', 'key' => '...',   # client certificate, if the server asks for it
#     # 'verify_server_cert' => false,     # default true; false is not secure!
# );

########################################
# language settings:
# the preferred language:
$language    = "en-US";
# note: the file with the name $language.ini from lang
# folder will be used to translate all strings

########################################
# HTTPS and authentication checks (see basic-auth/README.md):
# requests which did not arrive over HTTPS are rejected.
# only set this to false for local development or tests,
# never on a public server:
# $require_https = false;
#
# requests the web server did not authenticate are rejected.
# only set this to false if the application is
# protected in some other way than by HTTP
# authentication of the web server (e.g. network
# access control), and never on a public server.
# $require_http_auth = false;

########################################
# TLS-terminating proxy:
# only set this to true if the web server can only
# be reached through a proxy which terminates TLS and
# always overwrites the X-Forwarded-Proto header. Then
# it counts as HTTPS (see $require_https above) and the
# session cookie gets the "Secure" attribute.
# Otherwise clients could send the header themselves.
# $trust_forwarded_proto = true;
