<?php
// SPDX-License-Identifier: MIT

namespace WebAuth;

final class Https
{
	/**
	 * Whether the request ($server is $_SERVER) came in over HTTPS, as reported by the web server.
	 *
	 * The X-Forwarded-Proto header is only believed with $trustForwardedProto, because any client can
	 * send it: only set that if the app can be reached solely through a proxy which terminates TLS and
	 * always overwrites the header. Otherwise let the web server set HTTPS for the requests of that
	 * proxy (see README.md).
	 */
	public static function isRequest(array $server, bool $trustForwardedProto = false): bool
	{
		if (!empty($server['HTTPS']) && is_string($server['HTTPS']) && strtolower($server['HTTPS']) !== 'off') {
			return true;
		}
		return $trustForwardedProto && isset($server['HTTP_X_FORWARDED_PROTO']) && is_string($server['HTTP_X_FORWARDED_PROTO'])
			&& strtolower(trim($server['HTTP_X_FORWARDED_PROTO'])) === 'https';
	}
}
