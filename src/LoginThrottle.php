<?php
// SPDX-License-Identifier: MIT

namespace WebAuth;

/**
 * Throttling of failed logins, with records in a folder (no database needed). Use it like this:
 *
 *     $client = ClientAddress::get($_SERVER, $trustedProxies);
 *     $wait = LoginThrottle::start($folder, $client, time(), $limits);
 *     if ($wait < 0) { ... the folder can't be used: log it, answer 503 ... }
 *     elseif ($wait > 0) { ... answer 429 with "Retry-After: $wait", don't check the password ... }
 *     elseif (Password::verify(...)) { LoginThrottle::succeeded($folder, $client, $limits); ... }
 *
 * The limits are an array like DEFAULT_LIMITS, see start().
 */
final class LoginThrottle
{
	public const DEFAULT_LIMITS = [
		'maxFailures' => 5,
		'lockoutSeconds' => 60,
		'lockoutMaxSeconds' => 3600,
		'globalMaxFailures' => 100,
		'globalWindowSeconds' => 3600,
	];

	/**
	 * A folder for the records in the temporary folder of the system, one per installation of an app
	 * (not served by the web server, and outside of the app's data)
	 *
	 * @param string $name short name of the app, e.g. "w2-login"
	 * @param string $installation something that identifies the installation, e.g. the folder of the app
	 */
	public static function defaultFolder(string $name, string $installation): string
	{
		return rtrim(sys_get_temp_dir(), '/\\') . '/' . $name . '-' . substr(hash('sha256', $installation), 0, 16);
	}

	/**
	 * Read, change and write back one record of the throttle folder while holding a lock on its file,
	 * so that parallel requests can't both see the old state. $update gets the record (an array, empty
	 * if there is none) and returns the new record (empty to delete it).
	 *
	 * @return bool false if the folder or file can't be used
	 */
	public static function update(string $folder, string $name, callable $update): bool
	{
		if (!is_dir($folder) && !@mkdir($folder, 0700, true) && !is_dir($folder)) {
			return false;
		}
		$file = @fopen($folder . '/' . hash('sha256', 'login|' . $name) . '.json', 'c+');
		if ($file === false) {
			return false;
		}
		if (!flock($file, LOCK_EX)) {
			fclose($file);
			return false;
		}
		$record = json_decode((string)stream_get_contents($file), true);
		$record = $update(is_array($record) ? $record : []);
		ftruncate($file, 0);
		rewind($file);
		if ($record) {
			fwrite($file, (string)json_encode($record));
		}
		fflush($file);
		flock($file, LOCK_UN);
		fclose($file);
		return true;
	}

	/**
	 * Delete the records which are not needed any more (their lockout is over for a while, see start())
	 */
	public static function prune(string $folder, int $now, int $maxAge): void
	{
		foreach (glob($folder . '/*.json') ?: [] as $file) {
			$modified = @filemtime($file);
			if ($modified !== false && $now - $modified > $maxAge) {
				@unlink($file);
			}
		}
	}

	/**
	 * Call before checking a password. Every attempt is counted right away (a correct password takes it
	 * back with succeeded()), so parallel requests can't make more guesses than allowed. Returns 0 if
	 * the password may be checked, otherwise the number of seconds until the next attempt is possible,
	 * or -1 if the records can't be used. Attempts during a lockout are refused without checking the
	 * password and don't extend the lockout.
	 *
	 * Per client ($clientKey, see ClientAddress::get()): after the first "maxFailures" failures, the
	 * client is locked out for "lockoutSeconds", which double with every further failure up to
	 * "lockoutMaxSeconds". The count is forgotten after a quiet time as long as the longest lockout.
	 * Across all clients, "globalMaxFailures" failures are allowed per "globalWindowSeconds", which
	 * limits what an attacker with many addresses can do (and lets nobody log in for the rest of the
	 * window, since the password can't be checked). A "maxFailures" of 0 turns the throttling off, a
	 * "globalMaxFailures" of 0 the limit across all clients.
	 */
	public static function start(string $folder, string $clientKey, int $now, array $limits): int
	{
		if ($limits['maxFailures'] <= 0) {
			return 0;
		}
		$wait = 0;
		$stored = self::update($folder, 'client|' . $clientKey, function ($record) use (&$wait, $now, $limits) {
			$count = (int)($record['count'] ?? 0);
			$blockedUntil = (int)($record['blockedUntil'] ?? 0);
			$last = (int)($record['last'] ?? 0);
			if ($count > 0 && $now > max($blockedUntil, $last) + $limits['lockoutMaxSeconds']) {
				$count = 0;
				$blockedUntil = 0;
			}
			if ($blockedUntil > $now) {
				$wait = $blockedUntil - $now;
				return ['count' => $count, 'blockedUntil' => $blockedUntil, 'last' => $last];
			}
			$count++;
			if ($count >= $limits['maxFailures']) {
				$step = min($count - $limits['maxFailures'], 30);
				$blockedUntil = $now + min($limits['lockoutSeconds'] * (2 ** $step), $limits['lockoutMaxSeconds']);
			}
			return ['count' => $count, 'blockedUntil' => $blockedUntil, 'last' => $now];
		});
		if ($stored && $wait === 0 && $limits['globalMaxFailures'] > 0) {
			$stored = self::update($folder, 'global', function ($record) use (&$wait, $now, $limits) {
				$start = (int)($record['start'] ?? 0);
				$count = (int)($record['count'] ?? 0);
				if ($start === 0 || $now >= $start + $limits['globalWindowSeconds']) {
					$start = $now;
					$count = 0;
				}
				if ($count >= $limits['globalMaxFailures']) {
					$wait = $start + $limits['globalWindowSeconds'] - $now;
				} else {
					$count++;
				}
				return ['start' => $start, 'count' => $count];
			});
			if ($stored && $wait > 0) {
				// this attempt doesn't happen: give it back to the client
				self::update($folder, 'client|' . $clientKey, function ($record) {
					$record['count'] = max(0, (int)($record['count'] ?? 1) - 1);
					$record['blockedUntil'] = 0;
					return $record['count'] > 0 ? $record : [];
				});
			}
		}
		if (!$stored) {
			return -1;
		}
		if (mt_rand(1, 100) === 1) {
			self::prune($folder, $now, 2 * $limits['lockoutMaxSeconds'] + $limits['globalWindowSeconds']);
		}
		return $wait;
	}

	/**
	 * Call after a correct password: forget the failures of the client (and take the attempt back from
	 * the count over all clients)
	 */
	public static function succeeded(string $folder, string $clientKey, array $limits): void
	{
		if ($limits['maxFailures'] <= 0) {
			return;
		}
		self::update($folder, 'client|' . $clientKey, fn($record) => []);
		if ($limits['globalMaxFailures'] > 0) {
			self::update($folder, 'global', function ($record) {
				$record['count'] = max(0, (int)($record['count'] ?? 1) - 1);
				return $record;
			});
		}
	}
}
