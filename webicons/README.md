# webicons

The icons of the web applications [todo](https://github.com/codeling/todo) and
[w2wiki](https://github.com/codeling/w2wiki): one set, drawn once, which follows the color scheme
(light, dark, or the one the visitor chose) because it has no colors of its own.

Open `preview.html` through a web server (`python3 -m http.server`, then `/preview.html`) to see all
icons in both schemes and two sizes.

## Using the icons

An app includes this repository as a git subtree with the prefix `webicons/` (so the licence, this
document and `check.js` come along, and the files are `webicons/icons/*.svg`):

```sh
git subtree add  --prefix=webicons https://github.com/codeling/webicons main --squash
git subtree pull --prefix=webicons https://github.com/codeling/webicons main --squash
```

and serves `webicons/icons/`. A page shows an icon as an inline `<svg>` which uses the shape in the
file (the file is loaded once and cached, the color is that of the text where the icon stands):

```html
<svg class="icon icon-delete" viewBox="0 0 16 16" role="img" aria-label="Delete">
  <title>Delete</title><use href="webicons/icons/delete.svg#i"/>
</svg>
```

```css
svg.icon { width: 1.25em; height: 1.25em; vertical-align: middle; color: var(--icon-fg); }
svg.icon-delete { color: var(--danger); }
```

* The label is the name for assistive technology and the tooltip. Use `aria-hidden="true"` and no
  `<title>` if the text is next to the icon.
* The `<use>` reference must be on the same origin as the page, which is the case if the app serves the
  files itself (it also works with a Content-Security-Policy of `default-src 'self'`).
* A file can also be a CSS `mask` (`mask: url(webicons/icons/internet.svg) center / contain no-repeat;
  background-color: currentColor`), for a mark which is drawn by CSS, such as the one after a link.

## The convention

`check.js` tests all of it (`node check.js`, run by the workflow of this repository, and in the tests of
the apps with `node webicons/check.js webicons/icons`).

1. `viewBox="0 0 16 16"`, a drawing inside 2..14 with lines of 1.25 (`stroke-linecap` and
   `stroke-linejoin` round), the same style for all icons.
2. The shape is in one `<g id="i">`: that is what `<use href="file.svg#i">` refers to.
3. **No colors.** `fill` and `stroke` are `currentColor` or `none`; no `style`, `class`, `url()`,
   hex or named colors, no scripts. The app sets the color with CSS (`color`) on the `<svg>`, also for a
   state (danger, success). A second tone is `opacity`, not a second color.
4. The name says what the icon means, not what it looks like (`delete`, not `bin`): lower case words
   joined by `-`. **Add icons, never rename or remove one which an app may use**: both apps get the
   change with their next `git subtree pull`.
5. After adding a file run `node preview.js` (`check.js` fails if `preview.html` does not list it).

## License

MIT, see `LICENSE`. The icons were drawn for this repository (they do not copy those of an icon set),
except that the three `theme-*` icons are the circles of w2wiki.
