<?php
// SPDX-License-Identifier: MIT

namespace WebAuth\Tests;

use PHPUnit\Framework\TestCase;
use WebAuth\Csrf;

final class CsrfTest extends TestCase
{
	public function testNewTokensAreRandom(): void
	{
		$token = Csrf::newToken();
		$this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $token);
		$this->assertNotSame($token, Csrf::newToken());
	}

	public function testIsValid(): void
	{
		$token = str_repeat('ab', 32);
		$this->assertTrue(Csrf::isValid($token, $token));
		$this->assertFalse(Csrf::isValid($token, str_repeat('ab', 31)));
		$this->assertFalse(Csrf::isValid($token, ''));
		$this->assertFalse(Csrf::isValid($token, null));
		$this->assertFalse(Csrf::isValid($token, [$token]));
	}

	public function testMissingExpectedTokenNeverMatches(): void
	{
		$this->assertFalse(Csrf::isValid(null, ''));
		$this->assertFalse(Csrf::isValid('', ''));
		$this->assertFalse(Csrf::isValid(null, null));
		$this->assertFalse(Csrf::isValid(['x'], 'x'));
	}
}
