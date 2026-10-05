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
# of the web root if your setup allows it.
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
