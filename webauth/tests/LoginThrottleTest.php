<?php
// SPDX-License-Identifier: MIT

namespace WebAuth\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use WebAuth\ClientAddress;
use WebAuth\LoginThrottle;

/** Throttling of failed logins, and finding out the address of the client */
final class LoginThrottleTest extends TestCase
{
	private string $folder;
	private const LIMITS = [
		'maxFailures' => 3,
		'lockoutSeconds' => 60,
		'lockoutMaxSeconds' => 300,
		'globalMaxFailures' => 0,
		'globalWindowSeconds' => 3600,
	];

	protected function setUp(): void
	{
		$this->folder = sys_get_temp_dir() . '/webauth-throttle-test-' . bin2hex(random_bytes(6));
	}

	protected function tearDown(): void
	{
		foreach (glob($this->folder . '/*') ?: [] as $file) {
			unlink($file);
		}
		@rmdir($this->folder);
	}

	private function attempt(string $client, int $now, array $limits = self::LIMITS): int
	{
		return LoginThrottle::start($this->folder, $client, $now, $limits);
	}

	public function testClientIsLockedOutAfterTheAllowedFailures(): void
	{
		$this->assertSame(0, $this->attempt('a', 1000));
		$this->assertSame(0, $this->attempt('a', 1001));
		$this->assertSame(0, $this->attempt('a', 1002), 'the third attempt is still checked (it starts the lockout)');
		$this->assertSame(60, $this->attempt('a', 1002));
		$this->assertSame(30, $this->attempt('a', 1032));
	}

	public function testRefusedAttemptsDoNotExtendTheLockout(): void
	{
		for ($i = 0; $i < 3; $i++) {
			$this->attempt('a', 1000);
		}
		for ($i = 1; $i < 50; $i++) {
			$this->assertGreaterThan(0, $this->attempt('a', 1000 + $i));
		}
		$this->assertSame(0, $this->attempt('a', 1060));
	}

	public function testLockoutDoublesUpToTheMaximum(): void
	{
		$now = 1000;
		for ($i = 0; $i < 3; $i++) {
			$this->assertSame(0, $this->attempt('a', $now));
		}
		foreach ([60, 120, 240, 300, 300] as $seconds) {   // 480 and 960 are limited to 300
			$this->assertSame($seconds, $this->attempt('a', $now), 'locked out for the whole time');
			$now += $seconds;
			$this->assertSame(0, $this->attempt('a', $now), 'the attempt after the lockout is checked (and starts the next one)');
		}
	}

	public function testOtherClientsAreNotAffected(): void
	{
		for ($i = 0; $i < 3; $i++) {
			$this->attempt('a', 1000);
		}
		$this->assertGreaterThan(0, $this->attempt('a', 1001));
		$this->assertSame(0, $this->attempt('b', 1001));
	}

	public function testSuccessResetsTheCount(): void
	{
		$this->attempt('a', 1000);
		$this->attempt('a', 1001);
		LoginThrottle::succeeded($this->folder, 'a', self::LIMITS);
		$this->assertSame(0, $this->attempt('a', 1002));
		$this->assertSame(0, $this->attempt('a', 1003));
		$this->assertSame(0, $this->attempt('a', 1004), 'only two failures have been counted before');
		$this->assertGreaterThan(0, $this->attempt('a', 1005));
	}

	public function testFailuresAreForgottenAfterAQuietTime(): void
	{
		$this->attempt('a', 1000);
		$this->attempt('a', 1001);
		$this->assertSame(0, $this->attempt('a', 1001 + 301), 'the earlier failures are forgotten: this is the first one again');
		$this->assertSame(0, $this->attempt('a', 1304));
		$this->assertSame(0, $this->attempt('a', 1305), 'the third failure since the quiet time');
		$this->assertGreaterThan(0, $this->attempt('a', 1306));
	}

	public function testThrottlingCanBeTurnedOff(): void
	{
		$limits = ['maxFailures' => 0] + self::LIMITS;
		for ($i = 0; $i < 20; $i++) {
			$this->assertSame(0, $this->attempt('a', 1000, $limits));
		}
		$this->assertDirectoryDoesNotExist($this->folder);
	}

	public function testGlobalLimitStopsAllClientsUntilTheWindowEnds(): void
	{
		$limits = ['maxFailures' => 100, 'globalMaxFailures' => 4] + self::LIMITS;
		for ($i = 0; $i < 4; $i++) {
			$this->assertSame(0, $this->attempt("client$i", 1000 + $i, $limits));
		}
		$this->assertSame(3596, $this->attempt('someone else', 1004, $limits));
		$this->assertSame(0, $this->attempt('someone else', 1000 + 3600, $limits), 'a new window');
	}

	public function testAttemptRefusedByTheGlobalLimitDoesNotCountForTheClient(): void
	{
		$limits = ['maxFailures' => 2, 'globalMaxFailures' => 2, 'globalWindowSeconds' => 100] + self::LIMITS;
		$this->assertSame(0, $this->attempt('a', 1000, $limits));
		$this->assertSame(0, $this->attempt('b', 1001, $limits));
		$this->assertSame(98, $this->attempt('b', 1002, $limits), 'refused for the rest of the window');
		// only one of b's attempts has been made, so the second one (now) starts b's first lockout
		$this->assertSame(0, $this->attempt('b', 1100, $limits));
		$this->assertSame(60, $this->attempt('b', 1100, $limits));
	}

	public function testSuccessGivesTheAttemptBackToTheGlobalCount(): void
	{
		$limits = ['maxFailures' => 100, 'globalMaxFailures' => 2] + self::LIMITS;
		for ($i = 0; $i < 10; $i++) {
			$this->assertSame(0, $this->attempt('a', 1000 + $i, $limits));
			LoginThrottle::succeeded($this->folder, 'a', $limits);
		}
		$this->assertSame(0, $this->attempt('b', 1100, $limits));
	}

	public function testUnusableFolderIsReported(): void
	{
		$file = $this->folder . '-file';
		file_put_contents($file, 'x');
		try {
			$this->assertSame(-1, LoginThrottle::start($file . '/sub', 'a', 1000, self::LIMITS));
		} finally {
			unlink($file);
		}
	}

	public function testOldRecordsArePruned(): void
	{
		$this->attempt('a', 1000);
		$this->attempt('b', 1000);
		$files = glob($this->folder . '/*.json');
		$this->assertCount(2, $files);
		touch($files[0], 1000);
		LoginThrottle::prune($this->folder, 5000, 1000);
		$this->assertCount(1, glob($this->folder . '/*.json'));
	}

	public function testRecordsAreInTheFolderOnly(): void
	{
		$this->attempt('../../evil', 1000);
		$this->assertCount(1, glob($this->folder . '/*.json'));
		$this->assertSame(1, preg_match('/^[0-9a-f]{64}\.json$/', basename(glob($this->folder . '/*.json')[0])));
	}

	public function testDefaultFolderDependsOnTheInstallation(): void
	{
		$a = LoginThrottle::defaultFolder('app-login', '/var/www/a');
		$this->assertSame($a, LoginThrottle::defaultFolder('app-login', '/var/www/a'));
		$this->assertNotSame($a, LoginThrottle::defaultFolder('app-login', '/var/www/b'));
		$this->assertStringStartsWith(rtrim(sys_get_temp_dir(), '/') . '/app-login-', $a);
	}

	public static function clients(): array
	{
		$proxy = ['10.0.0.1'];
		return [
			'plain address' => [['REMOTE_ADDR' => '203.0.113.5'], [], '203.0.113.5'],
			'forwarded header is ignored without trusted proxies' => [['REMOTE_ADDR' => '203.0.113.5', 'HTTP_X_FORWARDED_FOR' => '1.2.3.4'], [], '203.0.113.5'],
			'forwarded header is ignored from other addresses' => [['REMOTE_ADDR' => '203.0.113.5', 'HTTP_X_FORWARDED_FOR' => '1.2.3.4'], $proxy, '203.0.113.5'],
			'forwarded header of a trusted proxy' => [['REMOTE_ADDR' => '10.0.0.1', 'HTTP_X_FORWARDED_FOR' => '198.51.100.7'], $proxy, '198.51.100.7'],
			'trusted proxy without the header' => [['REMOTE_ADDR' => '10.0.0.1'], $proxy, '10.0.0.1'],
			'the client can add addresses in front, the proxy adds the real one' => [['REMOTE_ADDR' => '10.0.0.1', 'HTTP_X_FORWARDED_FOR' => '6.6.6.6, 198.51.100.7'], $proxy, '198.51.100.7'],
			'chain of trusted proxies' => [['REMOTE_ADDR' => '10.0.0.1', 'HTTP_X_FORWARDED_FOR' => '198.51.100.7, 10.0.0.2'], ['10.0.0.0/24'], '198.51.100.7'],
			'garbage in the header' => [['REMOTE_ADDR' => '10.0.0.1', 'HTTP_X_FORWARDED_FOR' => 'junk'], $proxy, '10.0.0.1'],
			'garbage after a valid address' => [['REMOTE_ADDR' => '10.0.0.1', 'HTTP_X_FORWARDED_FOR' => 'junk, 10.0.0.2'], ['10.0.0.0/24'], '10.0.0.2'],
			'ipv6 is shortened to its /64' => [['REMOTE_ADDR' => '2001:db8:1:2:aaaa:bbbb:cccc:dddd'], [], '2001:db8:1:2::/64'],
			'the same /64' => [['REMOTE_ADDR' => '2001:db8:1:2:1::1'], [], '2001:db8:1:2::/64'],
			'forwarded ipv6' => [['REMOTE_ADDR' => '10.0.0.1', 'HTTP_X_FORWARDED_FOR' => '2001:db8:1:2:aaaa::1'], $proxy, '2001:db8:1:2::/64'],
			'missing address' => [[], [], ''],
		];
	}

	#[DataProvider('clients')]
	public function testClientAddress(array $server, array $trustedProxies, string $expected): void
	{
		$this->assertSame($expected, ClientAddress::get($server, $trustedProxies));
	}
}
