# UI plan: simpler UI, better mobile, dark mode, one icon system

Status: investigation and plan only, nothing is implemented. Based on a read of `index.php`,
`statistics.php`, `todo.css`, `js/*.js`, `tests/ui.test.js` in this repo and of the dark mode of
`codeling/w2wiki` (merge of its PR #100: `index.css`, `src/templates/theme-switch.php`,
`wiki.js`, `functions.php`, `w2-icons/*.svg`, `tests/Browser/dark-mode.spec.js`).
The app could not be run here (no MariaDB in the sandbox), so the findings on usability come from the
code, not from screenshots. Items marked "verify" need a look in a browser.

## Decisions taken (by the owner)

1. Theme choice is kept in a **cookie** (`todo_theme`), rendered by the server as `data-theme`.
2. **Full layout redesign** (D4 below), not the smaller variant.
3. The icons live in a **new repo `codeling/webicons`**, used by both todo and w2wiki as a git subtree
   (like `webauth/` from `php-webauth`).
4. The theme button is on the main page **and on the statistics page**.

What these change in the plan is in sections 3 and 5. (Done: the repo exists.) It was a blocker because the coding session which wrote this plan can
only reach `codeling/todo` and `codeling/w2wiki` and may not create repositories, so `codeling/webicons`
has to be created by the owner (empty, MIT, default branch `main`); then it can be added to the session
and filled. Until then step 0 can only be prepared as files in a scratch directory.

## Progress

* Step 0: `codeling/webicons` has 30 icons, `check.js`, `preview.html`, README (convention), CI. w2wiki uses it
  (PR #105). The icons were drawn new in one outline style (lines of 1.25), because the origin of the old
  w2wiki icons is not recorded; only the three `theme-*` circles are the old ones.
* Step 1: the colors of `todo.css` are custom properties (todo #47, merged; w2wiki #105 merged).
* Step 2: todo uses the icons of `webicons/` (subtree): `iconSvg()`/`iconButton()` in `todo-core.php`, `icon()`/`iconButton()`
  in `js/html.js`, buttons are `<button>`s with an inline SVG, the data-URI backgrounds are gone, `tests/icons.test.js`
  checks the files and that every icon the code uses exists. Layout unchanged (compared in screenshots against the
  version before). "Restore" (undelete) is the `restore` icon (a counter-clockwise arrow with a clock), not the old
  bin with an arrow; the save buttons are `check` instead of the pencil. Two-tone icons (note, undelete) are one color.

## 1. Findings

### Structure and usability

| # | Finding | Where |
|---|---------|-------|
| U1 | The lists (the main way to organise) and the tags are in the sidebar, which below 950px is **below** the table, so on a phone they are out of sight. The current list is not marked anywhere. The lists are `<li>` with a click handler: no keyboard, no screen reader. | `index.php`, `render.js` `renderLists` |
| U2 | The header holds five unrelated things (title, "Working...", tag filter, "Empty trash", "Statistics"). "Empty trash" is a destructive action shown permanently at top level, even with an empty trash. | `index.php` |
| U3 | A row has up to four icon buttons (edit, do today, delete/restore, reactivate). On narrow screens the edit and do-today buttons are hidden, so **"do today" cannot be used on a phone** at all, and the interaction model depends on a width (tap = edit below 575px, click on the pencil above). | `todo.css`, `render.js`, `state.js` |
| U4 | The "Save" button of the edit dialog and of the tag dialog is a **pencil** (`editButton`): the same icon as "edit". The add button is an icon without text. | `index.php` |
| U5 | The add field has no placeholder, and the useful `tag1, tag2: title` syntax is not discoverable. Enter does not seem to add the entry: there is no key handler, the form has no submit button and three fields, so implicit submission is off (verify). | `index.php`, `actions.js` `enter` |
| U6 | Feedback goes through a 6pt "log" in the sidebar and through blocking `alert()`/`confirm()`. Errors are easy to miss on a phone or hit modal boxes. | `log.js`, `actions.js` |
| U7 | `<input type="button">` with `alt` (invalid, `alt` is for `type=image`); the refresh button has the untranslated `alt="refresh"` and no label; the add button has no `aria-label`. | `index.php` |
| U8 | Font sizes are in pt (6, 8, 9), icons 20px (32px on narrow screens), row height 34px: small for touch and not scalable with the browser's text size. | `todo.css` |
| U9 | Every row creates a **Tagify instance** for its read-only tags and the whole table is rebuilt on each change (`renderTable`). That is the heaviest part of the UI on a phone, and Tagify's DOM is the hardest thing to theme. The tags in the sidebar are another Tagify; a tap opens the tag editor, not a filter. | `render.js` `showReadOnlyTags`, `fillTagList` |
| U10 | **jQuery UI is used only for `.dialog()`** (the `ui-autocomplete` rules in `todo.css` are dead: no `.autocomplete(` call). It brings ~250 KB of JS, a base theme with hard-coded light colors, an overlay hack and the resize/position code in `dialogs.js`. | `dialogs.js`, `actions.js:286`, `todo.css` |
| U11 | The progress bar is red for "open" and green for "done": open work is shown as an error, and red/green is the pair that colour-blind users cannot tell apart. | `todo.css` |

### Colours and icons (what dark mode has to deal with)

* About 30 hard-coded colours in `todo.css` (`#F8F8F8`, `#EEE`, `black` borders, `#777`, `#D45`, `#0A0`, ...),
  none of them a variable. `statistics.php` charts use `fill: blue / white / black`.
* All 12 icons are CSS `background-image: url('data:image/svg+xml;...fill=%23444')` with the colour
  baked into the data URI. A background image cannot take `currentColor`, so it cannot follow a theme:
  in dark mode the dark-grey `#444` icons would be nearly invisible. This is the real blocker, and why
  the icon work has to come before (or with) the colours.
* Third-party CSS: jQuery UI's base theme (light only), Tagify (fully driven by `--tag-*`,
  `--tags-*`, `--tagify-dd-*` custom properties, so themable without forking).
* `todo.svg` (favicon) is black strokes: invisible on a dark tab strip.
* CSP is `default-src 'self'; style-src 'self'; img-src 'self' data:`. No inline scripts or styles: the
  theme must be applied by an external script or server-rendered, never by an inline `<script>`.

## 2. How w2wiki does dark mode (what to reuse)

* `:root { color-scheme: light dark }`, forced by `:root[data-theme="light"|"dark"]`.
* Every colour is a custom property with `light-dark(lightValue, darkValue)`; no duplicated dark
  stylesheet. Needs Chrome 123 / Firefox 120 / Safari 17.5.
* One button in the toolbar cycles system -> light -> dark. Cookie `w2_theme`, rendered by the server
  as `data-theme` on `<html>` (so there is no flash of the wrong theme); `wiki.js` applies the choice
  at once and saves it with `fetch`. A form POST is the no-JS fallback.
* Icons: `w2-icons/*.svg`, 16x16 viewBox, shapes in `<g id="i" fill="currentColor">`, used as
  `<svg class="icon icon-NAME" viewBox="0 0 16 16" role="img" aria-label=".."><title>..</title><use href="w2-icons/NAME.svg#i"/></svg>`
  (`iconSvg()` in `functions.php`). The colour comes from `svg.icon { color: var(--icon-fg) }`
  and variants (`--bar-fg`, `--danger`).
* Theme icons `theme-auto/light/dark.svg`: the same circle as outline, half filled, filled.
  The three are all in the button and CSS shows the one that fits `:root`.
* Tests: contrast checks (`expectReadable`, `barContrasts`) and a toggle test.

## 3. Decisions (options and recommendation)

### D1. Icon system - recommended: same convention as w2wiki, as inline `<svg><use>`

| Option | + | - |
|---|---|---|
| **A. `<svg><use href="icons/x.svg#i">` + `currentColor`** (w2wiki) | Follows the theme and any state colour via CSS `color`; accessible name via `<title>`/`aria-label`; one file per icon, cacheable; allowed by the CSP (same origin); identical to w2wiki, so files and helper are shared | Buttons must become `<button>` (an `<input type=button>` cannot contain an `<svg>`); two-tone icons must become one colour (+ `opacity`) |
| B. CSS `mask-image: url(icons/x.svg)` + `background-color: currentColor` | Keeps `<input type=button>` and the CSS-only markup | Mask needs `img-src` (fine), no `<title>`, no per-part colour, mask-image prefix quirks on older Safari |
| C. Keep data URIs, add a second `@media (prefers-color-scheme: dark)` set | Smallest edit | Does not support the forced light/dark toggle, doubles the CSS, every colour change is edited twice. Rejected. |

Go with A. Rules for the files (written into a short `icons/README.md` in both repos):
16x16 viewBox, shape in `<g id="i" fill="currentColor">`, **no hard-coded colour**. State colours are
set by CSS on the svg (`.icon-delete { color: var(--danger) }`, add `var(--ok)`), as w2wiki already does
for `icon-delete`. Note that `w2-icons/delete.svg` and `close.svg` hard-code `#da4453`; make that
`currentColor` + a CSS class (small change in w2wiki) so the two apps follow one rule.
A secondary tone is `opacity=".5"`, not a second colour.

Inventory (todo has 12 icons; 32x32 viewBox today, to be redrawn/scaled to 16x16):

| todo icon | w2wiki file to reuse | action |
|---|---|---|
| delete (bin) | `delete.svg` (bin) | **reuse** (replaces the todo one) |
| edit (pencil) | `edit.svg` | **reuse** |
| theme auto/light/dark | `theme-*.svg` | **reuse** |
| add (plus in circle), save/check, close/cancel | `new.svg` is page+plus, `close.svg` is boxed x | new: `add`, `save` (check mark); `close` reuse |
| restore (bin + arrow), do-today (calendar + star), refresh, repeat (also used for reactivate and the "recurring" marker), merge, warning (overdue), note | - | new in todo |
| menu (three dots), list (stack), tag, filter | `list.svg` maybe | new, needed by the layout below |

**Shared repo `codeling/webicons` (decided).** Both apps pull it in as a git subtree, as they already do
for `webauth/` (`git subtree add --prefix=webicons https://github.com/codeling/webicons main --squash`, later
`git subtree pull`). Layout of the repo:

```
icons/            the SVG files (one namespace for both apps; each app ships all of them, they are tiny)
README.md         the convention (16x16 viewBox, <g id="i" fill="currentColor">, no other colours,
                  secondary tone = opacity, name = what it means, not how it looks) and the usage snippet
check.js          dependency-free node script: every file is well-formed, has viewBox="0 0 16 16" and
                  <g id="i">, no fill/stroke/style/script/href other than currentColor/none, no
                  duplicates; run by .github/workflows
preview.html      all icons in light/dark/forced themes, for looking at a change
LICENSE           MIT, plus a note on the origin of each icon (see below)
```

The subtree prefix is `webicons/` in both apps (so licence, README and `check.js` come along and the files
are `webicons/icons/*.svg`). For w2wiki that meant replacing `w2-icons/*.svg` (the folder keeps the app
icon `w2-icon.png`, which is not part of the set). The helpers stay in each app (5 lines each): `iconSvg()` in PHP for both, and
`icon(name, label)` in `js/html.js` of todo for the buttons which the rows build. Each app has a CI step
that runs `webicons/check.js webicons/icons`, so a subtree update that breaks the convention fails there too.

**Check before publishing**: the older w2wiki icons (`edit.svg`, `delete.svg`, ...) have no origin or
licence note; `edit.svg` has the numeric style of an icon set drawn in Inkscape, possibly Breeze (LGPL).
The owner has to confirm that all of them are free to publish under MIT, otherwise they are redrawn
in step 0. The todo icons are the owner's own.

### D2. Dark mode - recommended: w2wiki's mechanism, cookie persistence

* **Mechanism**: `light-dark()` custom properties (see section 4 for the token list), `color-scheme`,
  `data-theme` on `<html>`, `<meta name="color-scheme" content="light dark">`.
* **Persistence** - options:
  1. *Cookie `todo_theme` + server renders `data-theme`* (w2wiki). No flash, works on
     `statistics.php` without any script, one more tiny endpoint. **Recommended.**
  2. `localStorage` + a blocking external `theme-init.js` in `<head>`: no server change, but the
     other pages need the same script and a first paint can flash if the script is deferred.
  3. Store it in the database (`settings` table): shared across devices, but todo has no user concept
     yet (`todoUserId()` is a TODO) and it needs a request before the first paint.
* **Control**: the same single cycle button as w2wiki (auto -> light -> dark), same three icons, same
  CSS trick (all three in the button, CSS shows the one for `:root`). Touch devices show no tooltip, so
  in the narrow layout the button sits in the "..." menu with the current mode as text
  ("Colour scheme: System") instead of an icon only. Alternative: a three-button segmented control
  (more discoverable, 3 targets instead of 1; costs a different markup than w2wiki, so not preferred).
* **Endpoint**: `queries/theme.php`, POST with the CSRF header like the other endpoints
  (`requirePostWithCsrf()`), validates the value against `['auto','light','dark']`, sets the cookie
  (`SameSite=Lax`, path of the app, 1 year, `Secure` when HTTPS), answers JSON. `tests/deny-lists.test.js`
  requires every endpoint to be called by the client JS, which `js/theme.js` does. **The statistics page
  gets the same button (decided).** It has no script today, so it loads `js/theme.js` (a small classic
  script, no jQuery, allowed by the CSP as an external file) and gets the CSRF token through the same
  `<meta name="csrf-token">` as `index.php`. The button is in the header next to the link "To ToDo-List";
  one `partials` include (`theme-button.php`) renders it for both pages so the markup exists once. The
  server reads the cookie in both pages, so the choice applies there without a script as well; only
  *changing* it needs JavaScript (todo is a JavaScript application anyway, so no form fallback).
* **Browser chrome**: `<meta name="theme-color">` for light and dark (`media` attribute), updated by
  `theme.js` when the user forces a theme; `todo.svg` gets an internal
  `@media (prefers-color-scheme: dark)` so the favicon is visible on dark tab strips.

### D3. Dialogs - recommended: native `<dialog>` and drop jQuery UI

jQuery UI only provides `.dialog()` (U10). A native `<dialog>` with `showModal()` gives focus
trapping, Escape, `::backdrop`, and is styled with the same tokens (the base theme of jQuery UI would
otherwise need ~25 overrides for dark mode). On narrow screens make it a full-height sheet
(`height: 100dvh`, sticky footer with Save/Cancel) which also removes `dialogWidth()` and
`keepDialogsInWindow()`. Remove `jquery-ui` from `package.json`, `scripts/vendor.sh`, `index.php`,
`vendor/`, README and the overlay hack in `todo.css`. jQuery 4 itself can stay.
Cost: `tests/ui.test.js` presses Escape and checks `#modify_dialog`/`#tag_dialog` visibility - these
keep working if the `<dialog>` carries those ids; update the two places that use `.dialog('close')`.

### D4. Layout - recommended: lists as rows/cards, one interaction model, fewer controls

1. **Row = card/list item, not a table**: checkbox | title (2 lines max) | due; second line: tag
   chips, note/repeat/overdue icons. Start date and effort move to the edit dialog (they are already
   hidden on phones). Dropping the `<table>` removes the width-dependent column hiding.
2. **One interaction model for all widths**: tap/click on the row opens the edit dialog (this works
   with mouse, touch and keyboard via a real `<button>`/focusable row). The row has the checkbox and
   at most one more control: a "..." button (or on hover-devices the trash icon). **Do today, delete,
   restore, reactivate** move into the dialog footer and the "..." menu, so they are available on
   phones too (fixes U3). The `narrowScreenQuery` matchMedia in JS is removed.
3. **Lists first**: a list switcher at the top as a `<select>` (or tab bar when <= 4 lists) with real
   `<button>`s and `aria-current`; the sidebar is gone on narrow screens and a slim column on wide ones
   (U1). The tag list becomes a row of plain chip buttons; **tapping a chip filters** (the tag editor
   moves to the "..." menu of a chip or the dialog), replacing both Tagify instances of rows and
   sidebar with `<span class="tag">`; Tagify stays only in the three edit inputs (U9).
4. **Header**: title, list switcher, filter, "..." menu containing Empty trash (only when the trash
   is not empty), Statistics, Log, Colour scheme. "Working..." becomes a thin progress line.
5. **Quick add** as a sticky bottom bar on phones (thumb reach, stays visible while scrolling):
   text input with placeholder (`Title - or "tags: title"`), `enterkeyhint="done"`, Enter adds (U5),
   a "+" button, and the due date as the existing calendar-icon trick. `viewport-fit=cover` and
   `padding-bottom: env(safe-area-inset-bottom)`; for the keyboard use `100dvh`.
6. **Feedback**: replace `alert()` with a toast in an `aria-live="polite"` region (undo for trash and
   complete, which also removes most `confirm()` need); keep `confirm()` only for empty trash. The
   log moves behind the "..." menu.
7. **Sizing**: rem instead of pt, 44px minimum touch targets (the 24px of WCAG 2.5.8 is the floor, not
   the goal), `touch-action: manipulation`, 16px inputs (already done, keep), the progress bar in one
   neutral accent with `title`/text "7 of 12 done" (U11).
8. **Mobile extras** (cheap): `<link rel="manifest" crossorigin="use-credentials">` + 192/512px PNG
   icons + `apple-touch-icon` so the page can be added to the home screen. The `crossorigin`
   attribute matters: the manifest request is sent without credentials by default, which the HTTP
   Basic auth in front of the app would answer with 401. No service worker (every response is
   `no-store` with a CSRF token on purpose).
9. **Accessibility basics on the way**: `<button type="button">` with `aria-label`, labels for the
   inputs, visible focus ring from `--focus`, `lang` already set.

(The smaller variant, keeping the table, was offered and **not chosen**: the full redesign above is the plan.)
The statistics page is part of it: same header (title, theme button, back link), charts keep their own
horizontal scroll box, and the chart colours come from the tokens.

## 4. Colour tokens (draft, to be checked with a contrast test)

Reuse the w2wiki values where the role is the same, so both apps look related.

| token | light | dark | replaces |
|---|---|---|---|
| `--page-bg` | `#eeeeee` (was `#F8F8F8`) | `#1c1c1e` | body |
| `--surface` | `#e4e4e4` | `#2a2a2d` | `#EEE` rows, header boxes |
| `--page-fg` | `#000` | `#e4e4e4` | text |
| `--muted` | `#666` (was `#777`, about 4.2:1 on the old background) | `#a0a0a5` | completed/deleted rows, dates |
| `--border` | `#777` (was black) | `#888` | table, progress, boxes |
| `--icon-fg` | `#0f0f0f` | `#f0f0f0` | all icons (was `#444`) |
| `--ok` | `#0a7a0a` | `#4cc764` | add icon, done bar, checkbox accent (`#0A0` is too bright for text on light) |
| `--danger` | `#da4453` | `#ff6b7a` | delete, overdue (`#D45`, about 4:1 as small text) |
| `--accent` | `#4466cc` | `#8ab4ff` | focus, links, chart bars (`blue`) |
| `--backdrop` | `rgba(0,0,0,.4)` | `rgba(0,0,0,.65)` | modal overlay (now `.003`: the overlay is invisible today, so modals do not look modal) |
| Tagify | `--tag-bg`, `--tags-border-color`, `--input-color`, `--tag-text-color`, `--tagify-dd-bg-color`, ... set from the tokens above | | |

## 5. Implementation plan (PRs, in this order, each green on its own)

Each step ships with tests; the repo's tests are Playwright (`tests/ui.test.js`, `statistics.test.js`)
and need MariaDB, so they run in CI. Port the colour helpers `contrasts`/`expectReadable` of
w2wiki's `tests/Browser/helpers.js` for the dark tests.

0. **`codeling/webicons` repo** (needs the repo to exist, see "Decisions taken"). Fill it with the files
   w2wiki has today (after the provenance check), the new todo icons drawn on the 16px grid, the
   README convention, `check.js`, `preview.html`, CI. Then in w2wiki: `git subtree add --prefix=icons`,
   remove `w2-icons/`, fix the paths, drop the hard-coded `#da4453` in `delete.svg`/`close.svg` for
   `currentColor` + CSS class, add the test that runs `check.js`; this PR can be reviewed and merged
   on its own and must keep w2wiki's dark-mode tests green.
1. **Tokens, no visible change.** Move every colour of `todo.css` and `statistics.php` into `:root`
   custom properties (light values only), pt -> rem, remove dead `ui-autocomplete` rules. Pure refactor;
   the existing tests are the safety net.
2. **Icons.** `git subtree add --prefix=webicons` of `codeling/webicons` (step 0 has all of them), `iconSvg()` in
   `todo-core.php`, `icon()` in `js/html.js`, convert the `<input type=button>` buttons in `index.php`
   and `actionButton()` in `render.js` to `<button class="iconBtn">` with `<svg><use>`, delete the data-URI
   rules. Test: `webicons/check.js` runs in CI; every button has an accessible name.
   Update `.dockerignore`/deny lists if needed (`webicons/icons/` is public static, so no).
3. **Dark mode.** `color-scheme` + dark values of all tokens, Tagify variables, `queries/theme.php`,
   `js/theme.js`, `data-theme` rendered in `index.php` and `statistics.php`, button with the three
   theme icons copied from w2wiki, `theme-color` meta, favicon, chart colours, lang strings
   (`COLOR_SCHEME`, `SYSTEM`, `LIGHT`, `DARK` in `en-US.ini`/`de-DE.ini`). jQuery UI's dialog is still
   there: add the few overrides (`.ui-dialog`, `.ui-widget-content`, `.ui-dialog-titlebar`) or do
   step 4 first. Tests: contrast of text/rows/dialog/tags/charts in both schemes, toggle cycles and
   survives a reload, invalid value rejected (400), CSRF required (403), no CSP violation (the UI tests
   already record them).
4. **Native dialogs, remove jQuery UI** (D3), with the sheet layout on narrow screens.
5. **Layout and mobile** (D4), in this order: list switcher + chips with filter (replaces row Tagify),
   row/card layout + one interaction model + "..." menu, quick-add bar + Enter + placeholder, toasts,
   manifest. Update `ui.test.js` where it reads `.tagify__tag` in rows (lines ~113, 164) and the narrow
   test (line ~230), and add narrow-viewport tests (no horizontal scroll at 320px, targets >= 44px,
   "do today" reachable on a phone).
6. **Afterwards**: w2wiki picks up icons that todo added (`git subtree pull`), if it wants them.

Order rationale: 1 and 2 are the prerequisites of 3 and are safe on their own; 4 before or with 3
avoids theming a library that is removed anyway; 5 is the biggest and the only one with a visible
redesign, so it comes last and can be cut down (see the smaller variant above).

## 6. Risks and open questions

* `light-dark()` needs Chrome 123 / Firefox 120 / Safari 17.5 (spring 2024); older browsers show the
  light values only (w2wiki accepts that; check which browsers the users of todo have).
* The existing tests depend on Tagify in rows and on `#todoTable`; D4.1/D4.3 mean rewriting parts of
  `ui.test.js` - the biggest hidden cost.
* Whether custom properties of the page are visible inside a `<use>`d file (they should inherit into
  the shadow tree) is not needed by this plan, which colours via `color`/`currentColor`; a two-colour
  icon would need it - do a 10-line Playwright spike before relying on it.
* Open for the owner: create `codeling/webicons` (and confirm the licence of the older w2wiki icons);
  that is the only thing that blocks step 0. Steps 1, 3-5 do not depend on it except through the icon
  files, so step 1 (tokens) can start at once.
* A subtree makes the two apps depend on one icon set: a change of an icon shows in both after the next
  `subtree pull`. That is the point, but a rename or a removal needs both apps changed together; the
  rule is to only add icons and never rename one that is in use.
