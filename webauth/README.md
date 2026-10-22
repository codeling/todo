# php-webauth

Authentication building blocks for small PHP web apps without a framework, shared by
[W2](https://github.com/codeling/w2wiki) and [todo](https://github.com/codeling/todo).
No dependencies, PHP 8.1+, one `require_once`.

| class | what it does |
|-------|--------------|
| `WebAuth\ServerAuth` | guard for apps which leave the login to the web server (HTTP Basic authentication, or a reverse proxy with single sign-on): rejects requests not made over HTTPS or without `REMOTE_USER` |
| `WebAuth\Https` | whether a request came in over HTTPS (`X-Forwarded-Proto` only when explicitly trusted) |
| `WebAuth\Session` | parameters of the session cookie (`Secure` over HTTPS, `HttpOnly`, `SameSite`) |
| `WebAuth\Csrf` | tokens against cross-site request forgery |
| `WebAuth\Ip` | IP allowlists: single addresses, CIDR ranges (IPv4 and IPv6), prefixes like `10.0.` |
| `WebAuth\ClientAddress` | the address of the client, behind trusted reverse proxies (`X-Forwarded-For`) |
| `WebAuth\Password` | check a single password against a `password_hash()` hash (or a plain or legacy SHA-1 value) |
| `WebAuth\LoginThrottle` | throttling of failed logins per client and overall, with records in a folder |

## Including it in an app

As a [git subtree](https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging#_subtree_merge) in the
folder `webauth/`. The files then are a normal part of the app's repository, so clones, downloaded
archives and container builds contain them without further steps:

```sh
git subtree add  --prefix=webauth https://github.com/codeling/php-webauth.git main --squash
# later, to update:
git subtree pull --prefix=webauth https://github.com/codeling/php-webauth.git main --squash
```

Change the library in this repository, not in the copies: a change made in an app's copy is
overwritten by the next `subtree pull` (unless it is sent back with `git subtree push`).

Then, in the app:

```php
require_once __DIR__ . '/webauth/webauth.php';
```

With Composer, require `codeling/php-webauth` (as a `vcs` repository); the classes are autoloaded.

**Don't make the folder reachable from the web.** Its `.htaccess` denies everything for Apache;
for nginx add `location ^~ /webauth/ { deny all; }` (with the path of the app).

## Authentication by the web server

The app has no login of its own (or an optional one) and relies on the web server.

1. **The web server** asks for the password and serves only over HTTPS: see
   `samples/htaccess.sample` (Apache) or `samples/nginx.conf.sample` (nginx). Instead of Basic
   authentication, a reverse proxy with single sign-on (e.g. Authelia, authentik, oauth2-proxy) can
   authenticate the user, as long as the web server in front of PHP turns that into `REMOTE_USER`.
2. **`ServerAuth::guard()`** is the safety net behind it. Call it at the top of **every** PHP file
   that can be requested directly. It stops every request which did not arrive over HTTPS or which
   the web server did not authenticate. So a missing or ignored web server setting (a disabled
   `AllowOverride`, a copied config without the auth lines, ...) does not leave the app open.

```php
$user = WebAuth\ServerAuth::guard();   // stops with 403 unless HTTPS and authenticated
```

`$user` is the name of the authenticated user, in case the app wants to use it.
`ServerAuth::user($_SERVER)` returns it without any checks.

| option                  | default        | meaning |
|-------------------------|----------------|---------|
| `require_https`         | `true`         | reject requests which did not arrive over HTTPS |
| `require_auth`          | `true`         | reject requests without an authenticated user |
| `trust_forwarded_proto` | `false`        | accept `X-Forwarded-Proto: https` as HTTPS, see below |
| `hsts`                  | `true`         | send `Strict-Transport-Security` on HTTPS requests |
| `log_prefix`            | `'webauth'`    | prefix of the error log messages |
| `messages`              | English texts  | `['https' => ..., 'auth' => ...]`, shown to the client as plain text |

Turn `require_https` / `require_auth` off only for local development or tests (e.g. with PHP's
built-in server, which does no authentication and no TLS), for instance from a setting in the app's
config file.

Notes:

- Only `REMOTE_USER` (or `REDIRECT_REMOTE_USER`, set after an internal redirect) counts as
  authenticated. The web server sets it after checking the credentials; a client cannot forge it with
  an `Authorization` header or a header such as `Remote-User`. The guard itself does not check
  passwords.
- Behind a proxy which terminates TLS, the app sees plain HTTP. Preferably let the web server set
  `HTTPS` for the requests of that proxy only (`SetEnvIfExpr` in Apache, see `samples/htaccess.sample`;
  `fastcgi_param HTTPS on;` in nginx). Alternatively set `trust_forwarded_proto` to `true`, but only if
  the app can be reached solely through a proxy which always overwrites `X-Forwarded-Proto`: any client
  can send that header itself. It only affects the HTTPS check, never the authentication.
- Rejected requests are written to the error log at most once per minute, so scanners cannot fill it.
- Basic authentication has no limit for wrong passwords: use fail2ban, `mod_evasive` or `limit_req`
  in nginx (see the samples).

## A login of the app's own

For apps which ask for a password themselves (one password, no user accounts), as W2 does:

```php
session_set_cookie_params(WebAuth\Session::cookieParams($_SERVER, 30 * 86400));
ini_set('session.use_strict_mode', '1');
session_start();
$_SESSION['csrf_token'] ??= WebAuth\Csrf::newToken();

if (isset($_POST['password'])) {
    $folder = WebAuth\LoginThrottle::defaultFolder('myapp-login', __DIR__);
    $client = WebAuth\ClientAddress::get($_SERVER, $trustedProxies);
    $limits = WebAuth\LoginThrottle::DEFAULT_LIMITS;
    if (!WebAuth\Csrf::isValid($_SESSION['csrf_token'], $_POST['csrf_token'] ?? null)) {
        // session expired: show the form again
    } elseif (($wait = WebAuth\LoginThrottle::start($folder, $client, time(), $limits)) !== 0) {
        // -1: the folder can't be used (log it, answer 503); otherwise 429 with Retry-After: $wait
    } elseif (WebAuth\Password::verify($_POST['password'], PASSWORD_HASH)) {
        WebAuth\LoginThrottle::succeeded($folder, $client, $limits);
        session_regenerate_id(true);   // prevent session fixation
        $_SESSION['logged_in'] = true;
        $_SESSION['csrf_token'] = WebAuth\Csrf::newToken();
    }
}
```

- `Password::verify($password, $hash, $plain = '')` checks against a `password_hash()` hash, or, if
  the hash is empty, against a plain text password. Unsalted SHA-1 hashes are still accepted but
  deprecated (`Password::isLegacyHash()`): offer the user a `password_hash()` hash after a successful
  login.
- `LoginThrottle::start()` counts every attempt right away, so parallel requests cannot make more
  guesses than allowed. A client is locked out after `maxFailures` failures, for `lockoutSeconds`,
  doubling up to `lockoutMaxSeconds`. Across all clients, `globalMaxFailures` failures are allowed per
  `globalWindowSeconds`. See the comments in `src/LoginThrottle.php`.
- `ClientAddress::get()` only believes `X-Forwarded-For` for requests from `$trustedProxies` (entries
  like for `Ip::matches()`), and shortens IPv6 addresses to their /64.
- `Ip::isInList($_SERVER['REMOTE_ADDR'], $allowedIPs)` for an allowlist of addresses.

## Tests

```sh
composer install
vendor/bin/phpunit
```

`ServerAuthTest` runs a small app on PHP's built-in web server, with a router that sets `REMOTE_USER`
and `HTTPS` like a web server would.

## Alternatives considered

The library is small on purpose. These were looked at, and not used as dependencies:

- **symfony/http-foundation** (`IpUtils`, trusted proxies), **symfony/rate-limiter**,
  **symfony/security-csrf**: correct and well maintained, but they bring a framework stack
  (security-csrf needs security-core, rate-limiter needs lock and a cache). That is out of proportion
  for apps which consist of a few PHP files, and it forces Composer on apps which don't use it.
- **mlocati/ip-lib**, **s1lentium/iptools**: good IP range libraries. But W2's allowlists also accept
  prefixes like `10.0.`, and the range check here takes 30 lines.
- **laminas/laminas-authentication** (HTTP adapter), **delight-im/auth**, **jasny/auth**: built for
  user databases or frameworks. Too much for "one password" or "the web server did it".
- **paragonie/csp-builder**, **bepsvpt/secure-headers**: security headers are not part of this library,
  since every app has its own Content-Security-Policy.

## License

MIT, see `LICENSE`. Parts come from W2 (`auth_functions.php`) and todo (`basic-auth/`).
