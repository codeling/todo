<?php
// SPDX-License-Identifier: MIT

namespace WebAuth;

/**
 * Guard for apps (or parts of apps) which leave the authentication to the web server, e.g. HTTP Basic
 * authentication, or a reverse proxy with single sign-on that passes the user on as REMOTE_USER.
 *
 * The web server does the actual authentication (see samples/). This is the safety net behind it: it
 * refuses to run the app if a request did not arrive over HTTPS, or if the web server did not
 * authenticate it, so that a missing or ignored web server setting does not leave all data open or the
 * password travelling in cleartext.
 *
 * Only REMOTE_USER is trusted for the authentication: the web server sets it after it has checked the
 * credentials, a client cannot forge it with an Authorization header.
 */
final class ServerAuth
{
	public const DEFAULT_OPTIONS = [
		// reject requests which did not arrive over HTTPS
		'require_https' => true,
		// reject requests without an authenticated user
		'require_auth' => true,
		// treat "X-Forwarded-Proto: https" as HTTPS, see Https::isRequest(); only the HTTPS check
		// depends on this, never the authentication
		'trust_forwarded_proto' => false,
		// send Strict-Transport-Security on HTTPS requests
		'hsts' => true,
		// prefix of the messages written to the error log
		'log_prefix' => 'webauth',
	];

	public const DEFAULT_MESSAGES = [
		'https' => 'Access denied: this application is only available over HTTPS.',
		'auth' => 'Access denied: the web server did not authenticate you. Protect the application with HTTP authentication.',
	];

	/**
	 * Name of the user the web server authenticated ($server is $_SERVER), or null
	 */
	public static function user(array $server): ?string
	{
		// REDIRECT_REMOTE_USER: after an internal redirect (e.g. Apache ErrorDocument, rewrites)
		foreach (['REMOTE_USER', 'REDIRECT_REMOTE_USER'] as $key) {
			if (!empty($server[$key]) && is_string($server[$key])) {
				return $server[$key];
			}
		}
		return null;
	}

	/**
	 * Stops the request with 403 unless the requirements are met, returns the authenticated user name
	 * (null if authentication is not required and there is none).
	 *
	 * @param array $options see DEFAULT_OPTIONS; "messages": texts shown to the client (plain text),
	 *                       like DEFAULT_MESSAGES, to translate or adapt them
	 * @param array|null $server $_SERVER if not given
	 */
	public static function guard(array $options = [], ?array $server = null): ?string
	{
		$server ??= $_SERVER;
		$o = array_merge(self::DEFAULT_OPTIONS, $options);
		$messages = array_merge(self::DEFAULT_MESSAGES, $options['messages'] ?? []);

		// HTTPS first, so that credentials are never even requested over plain HTTP
		if ($o['require_https']) {
			if (!Https::isRequest($server, (bool)$o['trust_forwarded_proto'])) {
				self::deny($messages['https'], $o['log_prefix'] . ': request over plain HTTP rejected');
			}
			if ($o['hsts'] && !headers_sent()) {
				header('Strict-Transport-Security: max-age=31536000');
			}
		}
		$user = self::user($server);
		if ($o['require_auth'] && $user === null) {
			self::deny($messages['auth'], $o['log_prefix'] . ': request without authenticated user rejected');
		}
		return $user;
	}

	/**
	 * error_log, but not more than once per minute: rejected requests (e.g. of scanners, if the
	 * authentication of the web server is not set up) must not fill the log
	 */
	private static function log(string $message): void
	{
		$marker = rtrim(sys_get_temp_dir(), '/\\') . '/webauth-log-' . md5(__DIR__);
		$last = @filemtime($marker);
		if ($last !== false && time() - $last < 60) {
			return;
		}
		@touch($marker);
		error_log($message);
	}

	private static function deny(string $message, string $logMessage): never
	{
		self::log($logMessage);
		if (!headers_sent()) {
			http_response_code(403);
			header('Content-Type: text/plain; charset=utf-8');
			header('Cache-Control: no-store');
		}
		echo $message;
		exit;
	}
}
