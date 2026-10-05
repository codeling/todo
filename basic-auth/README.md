# basic-auth

Drop-in guard for small PHP web apps which have no login of their own and are only meant
to be used behind HTTP Basic authentication over HTTPS.

Two parts that belong together:

1. **The web server** asks for the password and serves only over HTTPS:
   `htaccess.sample` (Apache) or `nginx.conf.sample` (nginx).
2. **`basic-auth.php`** is the safety net behind it. It stops every request which did not
   arrive over HTTPS or which the web server did not authenticate, so a missing or ignored
   web server setting (a disabled `AllowOverride`, a copied config without the auth lines,
   ...) does not leave the app open.

## Installing in another app

1. Copy this directory into the app, e.g. as `basic-auth/`.
2. Adapt the web server config from the sample (user file, location) and create the
   password file with `htpasswd -c <file> <user>`. For Apache, the sample goes into the
   app's `.htaccess`; for nginx into the server configuration. Keep the
   `fastcgi_param REMOTE_USER $remote_user;` line in nginx.
3. Include the guard at the top of **every** PHP file that can be requested directly:

   ```php
   require_once __DIR__ . '/basic-auth/basic-auth.php';
   $user = basicAuthRequire();   // stops with 403 unless HTTPS and authenticated
   ```

   `$user` is the name of the authenticated user, in case the app wants to use it.

## Options

`basicAuthRequire(array(...))` takes optional settings:

| option                  | default        | meaning |
|-------------------------|----------------|---------|
| `require_https`         | `true`         | reject requests which did not arrive over HTTPS |
| `require_auth`          | `true`         | reject requests without an authenticated user |
| `trust_forwarded_proto` | `true`         | accept `X-Forwarded-Proto: https` as HTTPS (proxy which terminates TLS) |
| `hsts`                  | `true`         | send `Strict-Transport-Security` on HTTPS requests |
| `log_prefix`            | `'basic-auth'` | prefix of the error log messages |
| `messages`              | English texts  | `array('https' => ..., 'auth' => ...)`, shown to the client as plain text |

Turn `require_https` / `require_auth` off only for local development or tests (e.g. with
PHP's built-in server, which does no authentication and no TLS), for instance from a setting
in the app's config file.

`basicAuthIsHttps()` and `basicAuthUser()` can be used on their own, e.g. to set the
`secure` flag of a session cookie.

## Notes

- Only `REMOTE_USER` (or `REDIRECT_REMOTE_USER`, set after an internal redirect) counts as
  authenticated. The web server sets it after checking the credentials; a client cannot
  forge it with an `Authorization` header. The guard itself does not check passwords.
- `trust_forwarded_proto` only affects the HTTPS check. Set it to `false` if the app can be
  reached without a proxy you control in front, and make the proxy set `HTTPS` instead,
  e.g. with `fastcgi_param HTTPS on;` for requests it terminated TLS for.
- Don't make this directory reachable from the web: the samples already deny it.
- Not covered: users and authorization within the app, rate limiting of password guesses.
