const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Files which must not be committed (passwords, configuration, database dumps) must not be
// copied into the container image either: every pattern of .gitignore has to be in .dockerignore.
// Patterns of .dockerignore only match relative to the root (unlike .gitignore without a slash),
// so "x" or "**/x" there both count; a trailing or leading slash makes no difference.
const ROOT = path.join(__dirname, '..');

function patterns(file) {
    return fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n')
        .map((l) => l.trim())
        .filter((l) => l !== '' && !l.startsWith('#'))
        .map((l) => l.replace(/^\/+|\/+$/g, ''));
}

test('every pattern of .gitignore is in .dockerignore', () => {
    const docker = new Set(patterns('.dockerignore'));
    const missing = patterns('.gitignore').filter((p) => !docker.has(p) && !docker.has('**/' + p));
    assert.deepEqual(missing, [], 'missing in .dockerignore');
});
