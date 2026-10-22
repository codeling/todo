<?php
// SPDX-License-Identifier: MIT

namespace WebAuth\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use WebAuth\Ip;

final class IpTest extends TestCase
{
	public static function ipAddresses(): array
	{
		return [
			// address, allowlist entry, expected
			'same address' => ['10.0.0.1', '10.0.0.1', true],
			'address with the same beginning' => ['10.0.0.123', '10.0.0.1', false],
			'address which begins like the entry' => ['10.0.0.1', '10.0.0.10', false],
			'inside a /24' => ['192.168.1.77', '192.168.1.0/24', true],
			'outside a /24' => ['192.168.10.1', '192.168.1.0/24', false],
			'first address of a /24' => ['192.168.1.0', '192.168.1.0/24', true],
			'last address of a /24' => ['192.168.1.255', '192.168.1.0/24', true],
			'inside a /8' => ['10.1.2.3', '10.0.0.0/8', true],
			'outside a /8' => ['11.1.2.3', '10.0.0.0/8', false],
			'inside a /12' => ['172.16.5.1', '172.16.0.0/12', true],
			'last address inside a /12' => ['172.31.255.255', '172.16.0.0/12', true],
			'first address outside a /12' => ['172.32.0.1', '172.16.0.0/12', false],
			'/32 is a single address' => ['1.2.3.4', '1.2.3.4/32', true],
			'/32 does not match a neighbour' => ['1.2.3.5', '1.2.3.4/32', false],
			'/0 matches everything' => ['1.2.3.4', '0.0.0.0/0', true],
			'/25 boundary inside' => ['192.168.1.127', '192.168.1.0/25', true],
			'/25 boundary outside' => ['192.168.1.128', '192.168.1.0/25', false],
			'prefix with dot' => ['192.168.1.5', '192.168.1.', true],
			'prefix with dot, other network' => ['192.168.10.5', '192.168.1.', false],
			'prefix with dots does not match a longer number' => ['10.00.1.1', '10.0.', false],
			'entry with spaces' => ['10.0.0.1', ' 10.0.0.1 ', true],
			'ipv6 same address' => ['::1', '::1', true],
			'ipv6 different address' => ['::2', '::1', false],
			'ipv6 in a /8' => ['fd00::1', 'fd00::/8', true],
			'ipv6 outside a /8' => ['fe80::1', 'fd00::/8', false],
			'ipv6 in a /32' => ['2001:db8::1', '2001:db8::/32', true],
			'ipv6 outside a /32' => ['2001:db9::1', '2001:db8::/32', false],
			'ipv6 /33 boundary' => ['2001:db8:8000::1', '2001:db8::/33', false],
			'ipv6 prefix' => ['fe80::1234', 'fe80:', true],
			'ipv4 address vs ipv6 range' => ['10.0.0.1', '::/0', false],
			'ipv6 address vs ipv4 range' => ['::1', '0.0.0.0/0', false],
			'mask too long for ipv4' => ['1.2.3.4', '1.2.3.4/33', false],
			'negative mask' => ['1.2.3.4', '1.2.3.4/-1', false],
			'mask which is not a number' => ['1.2.3.4', '1.2.3.0/abc', false],
			'empty mask' => ['1.2.3.4', '1.2.3.4/', false],
			'garbage entry' => ['1.2.3.4', 'junk', false],
			'empty entry' => ['1.2.3.4', '', false],
			'garbage address' => ['junk', '1.2.3.4', false],
		];
	}

	#[DataProvider('ipAddresses')]
	public function testMatches(string $ip, string $allowed, bool $expected): void
	{
		$this->assertSame($expected, Ip::matches($ip, $allowed));
	}

	public function testIsInList(): void
	{
		$list = ['10.0.0.1', '192.168.1.0/24', 'fd00::/8'];
		$this->assertTrue(Ip::isInList('10.0.0.1', $list));
		$this->assertTrue(Ip::isInList('192.168.1.200', $list));
		$this->assertTrue(Ip::isInList('fd00::5', $list));
		$this->assertFalse(Ip::isInList('10.0.0.2', $list));
		$this->assertFalse(Ip::isInList('10.0.0.1', []));
	}
}
