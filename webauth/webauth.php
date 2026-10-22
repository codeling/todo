<?php
// SPDX-License-Identifier: MIT
/*
 * php-webauth: authentication building blocks for small PHP web apps without a framework.
 *
 * Include this file once, it only defines the classes in the WebAuth namespace (nothing
 * happens when it is loaded):
 *
 *     require_once __DIR__ . '/webauth/webauth.php';
 *     $user = WebAuth\ServerAuth::guard();   // stops with 403 unless HTTPS and authenticated
 *
 * See README.md for all parts. With Composer, the classes are autoloaded instead.
 */

require_once __DIR__ . '/src/Https.php';
require_once __DIR__ . '/src/Ip.php';
require_once __DIR__ . '/src/ClientAddress.php';
require_once __DIR__ . '/src/ServerAuth.php';
require_once __DIR__ . '/src/Csrf.php';
require_once __DIR__ . '/src/Session.php';
require_once __DIR__ . '/src/Password.php';
require_once __DIR__ . '/src/LoginThrottle.php';
