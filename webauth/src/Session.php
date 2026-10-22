<?php
// SPDX-License-Identifier: MIT

namespace WebAuth;

final class Session
{
	/**
	 * Parameters of the session cookie for a request ($server is $_SERVER), for session_set_cookie_params():
	 * only sent over HTTPS if the request came in over HTTPS, not readable by scripts.
	 *
	 * @param int $lifetime seconds, 0: until the browser is closed
	 * @param string $sameSite "Lax" or "Strict"
	 * @param bool $trustForwardedProto see Https::isRequest()
	 */
	public static function cookieParams(array $server, int $lifetime = 0, string $sameSite = 'Lax', bool $trustForwardedProto = false): array
	{
		return [
			'lifetime' => $lifetime,
			'path' => '/',
			'secure' => Https::isRequest($server, $trustForwardedProto),
			'httponly' => true,
			'samesite' => $sameSite,
		];
	}
}
