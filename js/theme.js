// The button which changes the color scheme: the system's, light, dark, and again (a classic script without
// dependencies, because the statistics page has no other script; index.php and statistics.php load it).
// The choice is written to the root element at once (todo.css draws the page from data-theme) and kept
// in the cookie todo_theme by queries/theme.php, which the server uses to draw the next page right from the start.
(function () {
    'use strict';
    const modes = ['auto', 'light', 'dark'];
    const root = document.documentElement;
    const metas = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
    // the colors of the address bar for the two schemes of the system (the pages have them for both)
    const barColors = {};
    for (const meta of metas) {
        barColors[/dark/.test(meta.media) ? 'dark' : 'light'] = meta.content;
    }

    function currentMode() {
        return modes.includes(root.dataset.theme) ? root.dataset.theme : 'auto';
    }

    // shows the mode: the root element, the label of the buttons, the color of the address bar of a phone
    function show(mode) {
        if (mode === 'auto') {
            delete root.dataset.theme;
        } else {
            root.dataset.theme = mode;
        }
        for (const button of document.querySelectorAll('.themeswitch')) {
            const label = button.getAttribute('data-label-' + mode);
            if (label) {
                button.title = label;
                button.setAttribute('aria-label', label);
            }
        }
        // a chosen scheme is also the one of the address bar, whatever the system has
        for (const meta of metas) {
            const scheme = /dark/.test(meta.media) ? 'dark' : 'light';
            meta.content = mode === 'auto' ? barColors[scheme] : barColors[mode];
        }
    }

    // one request after the other, so that the last click is the choice which is kept
    let saving = Promise.resolve();
    function save(mode, previous) {
        const token = document.querySelector('meta[name="csrf-token"]');
        saving = saving.then(function () {
            return fetch('queries/theme.php', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRF-Token': token ? token.content : '' },
                body: 'mode=' + encodeURIComponent(mode)
            });
        }).then(function (response) {
            if (!response.ok) {
                throw new Error('status ' + response.status);
            }
        }).catch(function () {
            // not kept (no connection, or the token is no longer valid): back to what the server knows
            show(previous);
        });
    }

    document.addEventListener('click', function (event) {
        if (!(event.target instanceof Element) || !event.target.closest('.themeswitch')) {
            return;
        }
        const previous = currentMode();
        const mode = modes[(modes.indexOf(previous) + 1) % modes.length];
        show(mode);
        save(mode, previous);
    });

    show(currentMode());
})();
