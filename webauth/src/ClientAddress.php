<?php
// SPDX-License-Identifier: MIT

namespace WebAuth;

final class ClientAddress
{
	/**
	 * The address of the client ($server is $_SERVER), e.g. for throttling logins: the address the web
	 * server sees, or, if that is one of the trusted proxies, the last address in the X-Forwarded-For
	 * header which does not belong to a trusted proxy. The header is ignored for requests from other
	 * addresses, because any client can send it.
	 * IPv6 addresses are shortened to their /64 network, since one client usually controls a whole /64
	 * and could otherwise use a new address for every attempt.
	 *
	 * @param string[] $trustedProxies entries like for an allowlist, see Ip::matches()
	 */
	public static function get(array $server, array $trustedProxies = []): string
	{
		$ip = (string)($server['REMOTE_ADDR'] ?? '');
		if ($trustedProxies && Ip::isInList($ip, $trustedProxies) && !empty($server['HTTP_X_FORWARDED_FOR'])) {
			foreach (array_reverse(explode(',', (string)$server['HTTP_X_FORWARDED_FOR'])) as $forwarded) {
				$forwarded = trim($forwarded);
				if (filter_var($forwarded, FILTER_VALIDATE_IP) === false) {
					break;   // not an address: don't trust the rest of the chain
				}
				$ip = $forwarded;
				if (!Ip::isInList($forwarded, $trustedProxies)) {
					break;
				}
			}
		}
		$binary = @inet_pton($ip);
		if ($binary !== false && strlen($binary) === 16) {
			$ip = inet_ntop(substr($binary, 0, 8) . str_repeat("\0", 8)) . '/64';
		}
		return $ip;
	}
}
