<?php
// SPDX-License-Identifier: MIT

namespace WebAuth;

/**
 * Tokens protecting state-changing requests against cross-site request forgery. The app keeps the
 * token in its session (under a key of its choice) and sends it along with its forms or requests
 * (as a form field or a header).
 */
final class Csrf
{
	/** A new random token (64 hexadecimal characters) */
	public static function newToken(): string
	{
		return bin2hex(random_bytes(32));
	}

	/**
	 * Whether the token sent with the request ($given, any type, as it comes from the request) is the
	 * expected one (from the session; a missing or empty token never matches)
	 */
	public static function isValid(mixed $expected, mixed $given): bool
	{
		return is_string($expected) && $expected !== '' && is_string($given) && hash_equals($expected, $given);
	}
}
