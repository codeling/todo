<?php
// SPDX-License-Identifier: MIT

namespace WebAuth\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use WebAuth\Password;

final class PasswordTest extends TestCase
{
	public static function passwordConfigurations(): array
	{
		$bcrypt = password_hash('hunter2', PASSWORD_BCRYPT, ['cost' => 4]);
		return [
			// password, hash setting, plain password setting, expected
			'bcrypt hash, right password' => ['hunter2', $bcrypt, '', true],
			'bcrypt hash, wrong password' => ['hunter3', $bcrypt, '', false],
			'bcrypt hash, plain password setting is ignored' => ['secret', $bcrypt, 'secret', false],
			'argon2 style hash is recognized' => ['x', '$argon2id$v=19$m=1,t=1,p=1$c29tZXNhbHQ$aGFzaA', '', false],
			'sha1 hash, right password' => ['legacy', sha1('legacy'), '', true],
			'sha1 hash in capitals' => ['legacy', strtoupper(sha1('legacy')), '', true],
			'sha1 hash, wrong password' => ['legacyx', sha1('legacy'), '', false],
			'sha1 hash, hash itself as password' => [sha1('legacy'), sha1('legacy'), '', false],
			'magic hash collision (both 0e...)' => ['aaK1STfY', sha1('aaroZmOk'), '', false],
			'magic hash, right password' => ['aaroZmOk', sha1('aaroZmOk'), '', true],
			'plain password, right' => ['correct horse', '', 'correct horse', true],
			'plain password, wrong' => ['correct horsf', '', 'correct horse', false],
			'plain password, different case' => ['Correct Horse', '', 'correct horse', false],
			'nothing configured' => ['anything', '', '', false],
			'empty password with empty hash' => ['', '', '', false],
			'empty password with hash' => ['', sha1(''), '', false],
			'empty password with plain password' => ['', '', 'x', false],
		];
	}

	#[DataProvider('passwordConfigurations')]
	public function testVerify(string $password, string $hash, string $plain, bool $expected): void
	{
		$this->assertSame($expected, Password::verify($password, $hash, $plain));
	}

	public static function hashes(): array
	{
		return [
			'bcrypt' => [password_hash('x', PASSWORD_BCRYPT, ['cost' => 4]), false],
			'default algorithm' => [password_hash('x', PASSWORD_DEFAULT), false],
			'argon2id' => [defined('PASSWORD_ARGON2ID') ? password_hash('x', PASSWORD_ARGON2ID) : '$2y$04$' . str_repeat('a', 53), false],
			'sha1' => [sha1('x'), true],
			'sha1 in capitals' => [strtoupper(sha1('x')), true],
			'no hash' => ['', false],
		];
	}

	#[DataProvider('hashes')]
	public function testLegacyHashesAreRecognized(string $hash, bool $legacy): void
	{
		$this->assertSame($legacy, Password::isLegacyHash($hash));
	}

	public function testPasswordsWhichAreNotStringsAreRefused(): void
	{
		$this->assertFalse(Password::verify(null, '', 'x'));
		$this->assertFalse(Password::verify(['x'], '', 'x'));
		$this->assertFalse(Password::verify(true, '', '1'));
		$this->assertFalse(Password::verify(1, '', '1'));
	}
}
