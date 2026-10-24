<?php
// SPDX-License-Identifier: MIT

namespace WebAuth;

final class Ip
{
	/**
	 * Whether the given IP address matches an entry of an allowlist, which is either a single address
	 * (e.g. "192.168.1.10"), a CIDR range (e.g. "192.168.1.0/24" or "fd00::/8"), or an address prefix
	 * ending in "." or ":" (e.g. "10.0.")
	 */
	public static function matches(string $ip, string $allowed): bool
	{
		$allowed = trim($allowed);
		if (str_ends_with($allowed, '.') || str_ends_with($allowed, ':')) {
			return str_starts_with($ip, $allowed);
		}
		$parts = explode('/', $allowed, 2);
		$ipBin = @inet_pton($ip);
		$netBin = @inet_pton($parts[0]);
		if ($ipBin === false || $netBin === false || strlen($ipBin) !== strlen($netBin)) {
			return false;
		}
		$maxBits = strlen($ipBin) * 8;
		$bits = (count($parts) > 1) ? $parts[1] : (string)$maxBits;
		if (!ctype_digit($bits) || (int)$bits > $maxBits) {
			return false;
		}
		$bits = (int)$bits;
		$bytes = intdiv($bits, 8);
		if (substr($ipBin, 0, $bytes) !== substr($netBin, 0, $bytes)) {
			return false;
		}
		$remaining = $bits % 8;
		if ($remaining === 0) {
			return true;
		}
		$mask = (0xFF << (8 - $remaining)) & 0xFF;
		return (ord($ipBin[$bytes]) & $mask) === (ord($netBin[$bytes]) & $mask);
	}

	/**
	 * Whether the given IP address matches any entry of the list (see matches())
	 *
	 * @param string[] $list
	 */
	public static function isInList(string $ip, array $list): bool
	{
		foreach ($list as $allowed) {
			if (self::matches($ip, (string)$allowed)) {
				return true;
			}
		}
		return false;
	}
}
