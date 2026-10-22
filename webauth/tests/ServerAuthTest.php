<?php
// SPDX-License-Identifier: MIT

namespace WebAuth\Tests;

use PHPUnit\Framework\TestCase;
use WebAuth\ServerAuth;

/**
 * The guard in a small app on PHP's built-in web server, with a router which sets $_SERVER like a web
 * server would: the request header X-Test-User sets REMOTE_USER (or the variable named by
 * X-Test-User-Key), X-Test-Https sets HTTPS.
 */
final class ServerAuthTest extends TestCase
{
	private const AUTHED = ['X-Test-Https' => 'on', 'X-Test-User' => 'alice'];

	private static string $dir;
	/** @var resource */
	private static $process;
	private static int $port;

	public static function setUpBeforeClass(): void
	{
		self::$dir = sys_get_temp_dir() . '/webauth-test-' . bin2hex(random_bytes(6));
		mkdir(self::$dir);
		$library = var_export(dirname(__DIR__) . '/webauth.php', true);
		file_put_contents(self::$dir . '/router.php', <<<'PHP'
<?php
if (isset($_SERVER['HTTP_X_TEST_USER'])) { $_SERVER[$_SERVER['HTTP_X_TEST_USER_KEY'] ?? 'REMOTE_USER'] = $_SERVER['HTTP_X_TEST_USER']; }
if (isset($_SERVER['HTTP_X_TEST_HTTPS'])) { $_SERVER['HTTPS'] = $_SERVER['HTTP_X_TEST_HTTPS']; }
return false;
PHP);
		file_put_contents(self::$dir . '/app.php', <<<PHP
<?php
require_once $library;
\$user = WebAuth\ServerAuth::guard(isset(\$_GET['trust']) ? ['trust_forwarded_proto' => true] : []);
echo 'hello ' . \$user;
PHP);
		file_put_contents(self::$dir . '/custom.php', <<<PHP
<?php
require_once $library;
\$user = WebAuth\ServerAuth::guard(['require_https' => isset(\$_GET['https']), 'require_auth' => isset(\$_GET['auth']),
	'messages' => ['https' => 'nur HTTPS', 'auth' => 'nicht angemeldet']]);
echo 'hello ' . var_export(\$user, true);
PHP);
		$socket = stream_socket_server('tcp://127.0.0.1:0');
		self::$port = (int)substr(strrchr((string)stream_socket_get_name($socket, false), ':'), 1);
		fclose($socket);
		self::$process = proc_open(
			[PHP_BINARY, '-S', '127.0.0.1:' . self::$port, '-t', self::$dir, self::$dir . '/router.php'],
			[0 => ['file', '/dev/null', 'r'], 1 => ['file', '/dev/null', 'a'], 2 => ['file', '/dev/null', 'a']],
			$pipes
		);
		for ($i = 0; $i < 100; $i++) {
			$connection = @fsockopen('127.0.0.1', self::$port, $errno, $error, 0.2);
			if ($connection) {
				fclose($connection);
				return;
			}
			usleep(100000);
		}
		throw new \RuntimeException('PHP built-in web server did not start');
	}

	public static function tearDownAfterClass(): void
	{
		proc_terminate(self::$process);
		proc_close(self::$process);
		foreach (glob(self::$dir . '/*') ?: [] as $file) {
			unlink($file);
		}
		rmdir(self::$dir);
	}

	/** @return array{int, string, array<string, string>} status, body and headers (lower case names) */
	private function get(string $path, array $headers = []): array
	{
		$lines = [];
		foreach ($headers as $name => $value) {
			$lines[] = "$name: $value";
		}
		$context = stream_context_create(['http' => ['header' => $lines, 'ignore_errors' => true, 'timeout' => 10]]);
		// (the headers from the stream: $http_response_header is deprecated as of PHP 8.5)
		$stream = fopen('http://127.0.0.1:' . self::$port . $path, 'r', false, $context);
		$this->assertIsResource($stream);
		$body = (string)stream_get_contents($stream);
		$rawHeaders = stream_get_meta_data($stream)['wrapper_data'];
		fclose($stream);
		$responseHeaders = [];
		$status = 0;
		foreach ($rawHeaders as $line) {
			if (preg_match('#^HTTP/\S+ (\d+)#', $line, $match)) {
				$status = (int)$match[1];
			} elseif (str_contains($line, ':')) {
				[$name, $value] = explode(':', $line, 2);
				$responseHeaders[strtolower($name)] = trim($value);
			}
		}
		return [$status, $body, $responseHeaders];
	}

	public function testHttpsWithAnAuthenticatedUserIsLetThrough(): void
	{
		[$status, $body, $headers] = $this->get('/app.php', self::AUTHED);
		$this->assertSame(200, $status);
		$this->assertSame('hello alice', $body);
		$this->assertMatchesRegularExpression('/max-age=\d+/', $headers['strict-transport-security'] ?? '');
	}

	public function testPlainHttpIsRejectedEvenWithAnAuthenticatedUser(): void
	{
		foreach ([['X-Test-User' => 'alice'], ['X-Test-Https' => 'off', 'X-Test-User' => 'alice']] as $requestHeaders) {
			[$status, $body, $headers] = $this->get('/app.php', $requestHeaders);
			$this->assertSame(403, $status);
			$this->assertStringContainsString('only available over HTTPS', $body);
			$this->assertArrayNotHasKey('strict-transport-security', $headers);
			$this->assertSame('no-store', $headers['cache-control'] ?? '');
		}
	}

	public function testHttpsWithoutAnAuthenticatedUserIsRejected(): void
	{
		[$status, $body] = $this->get('/app.php', ['X-Test-Https' => 'on']);
		$this->assertSame(403, $status);
		$this->assertStringContainsString('did not authenticate', $body);
	}

	public function testAuthorizationOrForgedHeadersDoNotCountAsAuthenticated(): void
	{
		[$status] = $this->get('/app.php', [
			'X-Test-Https' => 'on',
			'Authorization' => 'Basic ' . base64_encode('alice:secret'),
			'X-Remote-User' => 'alice',
			'Remote-User' => 'alice',
		]);
		$this->assertSame(403, $status);
	}

	public function testRedirectRemoteUserCountsAsAuthenticated(): void
	{
		[$status, $body] = $this->get('/app.php', self::AUTHED + ['X-Test-User-Key' => 'REDIRECT_REMOTE_USER']);
		$this->assertSame(200, $status);
		$this->assertSame('hello alice', $body);
	}

	public function testForwardedProtoIsOnlyBelievedWhenTrusted(): void
	{
		$headers = ['X-Forwarded-Proto' => 'https', 'X-Test-User' => 'alice'];
		$this->assertSame(403, $this->get('/app.php', $headers)[0]);
		$this->assertSame(200, $this->get('/app.php?trust=1', $headers)[0]);
		$this->assertSame(200, $this->get('/app.php?trust=1', ['X-Forwarded-Proto' => 'HTTPS '] + $headers)[0]);
		$this->assertSame(403, $this->get('/app.php?trust=1', ['X-Forwarded-Proto' => 'http'] + $headers)[0]);
		$this->assertSame(403, $this->get('/app.php?trust=1', ['X-Test-User' => 'alice'])[0]);
	}

	public function testOptionsSwitchTheChecksOff(): void
	{
		[$status, $body] = $this->get('/custom.php');
		$this->assertSame(200, $status);
		$this->assertSame('hello NULL', $body);
		$this->assertSame("hello 'alice'", $this->get('/custom.php', ['X-Test-User' => 'alice'])[1]);
	}

	public function testOptionsReplaceTheMessages(): void
	{
		$this->assertSame([403, 'nur HTTPS'], array_slice($this->get('/custom.php?https'), 0, 2));
		$this->assertSame([403, 'nicht angemeldet'], array_slice($this->get('/custom.php?https&auth', ['X-Test-Https' => 'on']), 0, 2));
		$this->assertSame(200, $this->get('/custom.php?https&auth', self::AUTHED)[0]);
	}

	public function testUser(): void
	{
		$this->assertSame('alice', ServerAuth::user(['REMOTE_USER' => 'alice']));
		$this->assertSame('bob', ServerAuth::user(['REDIRECT_REMOTE_USER' => 'bob']));
		$this->assertSame('alice', ServerAuth::user(['REMOTE_USER' => 'alice', 'REDIRECT_REMOTE_USER' => 'bob']));
		$this->assertNull(ServerAuth::user([]));
		$this->assertNull(ServerAuth::user(['REMOTE_USER' => '']));
		$this->assertNull(ServerAuth::user(['PHP_AUTH_USER' => 'alice', 'HTTP_REMOTE_USER' => 'alice']));
	}

	public function testGuardReturnsTheUserWhenTheRequirementsAreMet(): void
	{
		$this->assertSame('alice', ServerAuth::guard(['hsts' => false], ['HTTPS' => 'on', 'REMOTE_USER' => 'alice']));
		$this->assertNull(ServerAuth::guard(['require_https' => false, 'require_auth' => false], []));
	}
}
