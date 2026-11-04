const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// The icons are the files of webicons/icons/ (a subtree of codeling/webicons), shown as inline SVG which
// uses the file (iconSvg() and iconButton() in todo-core.php, icon() in js/html.js). No server or database needed.
const ROOT = path.join(__dirname, '..');
const ICONS = path.join(ROOT, 'webicons', 'icons');

function read(file) {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

test('the icon files follow the convention of webicons (no colors of their own, one <g id="i">)', () => {
    // throws (and shows what is wrong) if check.js exits with an error
    const out = execFileSync('node', ['webicons/check.js', 'webicons/icons'], { cwd: ROOT, encoding: 'utf8' });
    assert.match(out, /icons ok/);
});

// the names of the icons which the code asks for
function usedIcons() {
    const names = new Set();
    const add = (text, pattern) => {
        for (const m of text.matchAll(pattern)) names.add(m[1]);
    };
    for (const file of ['index.php', 'statistics.php', 'todo-core.php']) {
        const php = read(file);
        add(php, /iconSvg\(["']([a-z0-9-]+)["']/g);
        // iconButton("id", "class", "icon", label)
        add(php, /iconButton\(\s*"[^"]*",\s*"[^"]*",\s*"([a-z0-9-]+)"/g);
    }
    for (const file of fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js'))) {
        const js = read(path.join('js', file));
        add(js, /\bicon\('([a-z0-9-]+)'/g);
        // actionButton(spanClass, id, buttonClass, iconName, label)
        add(js, /actionButton\([^;]*?, '([a-z0-9-]+)', \$T\(/g);
    }
    // icons which CSS draws as a mask
    add(read('todo.css'), /webicons\/icons\/([a-z0-9-]+)\.svg/g);
    return [...names].sort();
}

test('every icon which the code uses is a file of webicons/icons', () => {
    const used = usedIcons();
    // (so that a pattern which no longer matches does not make the test pass without looking at anything)
    assert.ok(used.length >= 10, 'found the icons: ' + used.join(', '));
    const files = new Set(fs.readdirSync(ICONS).map((f) => f.replace(/\.svg$/, '')));
    for (const name of used) {
        assert.ok(files.has(name), `icon "${name}" is used but webicons/icons/${name}.svg does not exist`);
    }
});

test('icons are not drawn in the style sheet any more (a background image cannot follow the color scheme)', () => {
    assert.doesNotMatch(read('todo.css'), /data:image\/svg/);
});
