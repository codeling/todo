<?php
// SPDX-License-Identifier: MIT

namespace WebAuth\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use WebAuth\Https;
use WebAuth\Session;

final class HttpsTest extends TestCase
{
	public static function serverVariables(): array
	{
		return [
			'HTTPS on' => [['HTTPS' => 'on'], true],
			'HTTPS 1' => [['HTTPS' => '1'], true],
			'HTTPS off' => [['HTTPS' => 'off'], false],
			'HTTPS OFF' => [['HTTPS' => 'OFF'], false],
			'HTTPS empty' => [['HTTPS' => ''], false],
			'HTTPS unset' => [[], false],
			'X-Forwarded-Proto is not trusted' => [['HTTP_X_FORWARDED_PROTO' => 'https'], false],
			'X-Forwarded-Ssl is not trusted' => [['HTTP_X_FORWARDED_SSL' => 'on'], false],
			'forwarded header does not override HTTPS off' => [['HTTPS' => 'off', 'HTTP_X_FORWARDED_PROTO' => 'https'], false],
			'port 443 alone is not HTTPS' => [['SERVER_PORT' => '443'], false],
		];
	}

	#[DataProvider('serverVariables')]
	public function testIsRequest(array $server, bool $https): void
	{
		$this->assertSame($https, Https::isRequest($server));
	}

	public function testForwardedProtoIsOnlyBelievedWhenTrusted(): void
	{
		$this->assertTrue(Https::isRequest(['HTTP_X_FORWARDED_PROTO' => 'https'], true));
		$this->assertTrue(Https::isRequest(['HTTP_X_FORWARDED_PROTO' => ' HTTPS '], true));
		$this->assertFalse(Https::isRequest(['HTTP_X_FORWARDED_PROTO' => 'http'], true));
		$this->assertFalse(Https::isRequest(['HTTP_X_FORWARDED_PROTO' => 'https, http'], true));
		$this->assertFalse(Https::isRequest(['HTTP_X_FORWARDED_PROTO' => 'https'], false));
		$this->assertTrue(Https::isRequest(['HTTPS' => 'on', 'HTTP_X_FORWARDED_PROTO' => 'http'], true), 'the web server knows best');
	}

	#[DataProvider('serverVariables')]
	public function testSessionCookieIsSecureOnlyOverHttps(array $server, bool $secure): void
	{
		$params = Session::cookieParams($server);
		$this->assertSame($secure, $params['secure']);
		$this->assertTrue($params['httponly']);
		$this->assertSame('Lax', $params['samesite']);
		$this->assertSame('/', $params['path']);
		$this->assertSame(0, $params['lifetime']);
	}

	public function testSessionCookieOptions(): void
	{
		$params = Session::cookieParams(['HTTP_X_FORWARDED_PROTO' => 'https'], 3600, 'Strict', true);
		$this->assertTrue($params['secure']);
		$this->assertSame('Strict', $params['samesite']);
		$this->assertSame(3600, $params['lifetime']);
	}
}
