<?php
// SPDX-License-Identifier: MIT

namespace WebAuth;

/** Checks of a single password for apps with a login of their own (no user accounts) */
final class Password
{
	/**
	 * Check the given password (any type, as it comes from the request) against $hash (created with
	 * PHP's password_hash, or a deprecated unsalted SHA-1 hash, see isLegacyHash()), or, if $hash is
	 * empty, against the plain text password $plain. An empty password, or nothing configured, never
	 * matches.
	 */
	public static function verify(mixed $password, string $hash, string $plain = ''): bool
	{
		if (!is_string($password) || $password === '') {
			return false;
		}
		if ($hash !== '') {
			if (!self::isLegacyHash($hash)) {
				return password_verify($password, $hash);
			}
			// deprecated, see isLegacyHash()
			return hash_equals(strtolower($hash), sha1($password));
		}
		return $plain !== '' && hash_equals($plain, $password);
	}

	/**
	 * Whether the given hash is a legacy unsalted SHA-1 hash (as opposed to a hash created with PHP's
	 * password_hash). These are quick to guess for anybody who gets to see the hash: apps should ask
	 * for a password_hash() hash instead (e.g. offer it after a successful login).
	 */
	public static function isLegacyHash(string $hash): bool
	{
		return $hash !== '' && password_get_info($hash)['algoName'] === 'unknown';
	}
}
