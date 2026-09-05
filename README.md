# SONS MGMT

The company site for Sons Mgmt — artist management, Los Angeles.

One page (`/`) plus a press stub (`/press`). Static HTML and CSS, no client-side
JavaScript, no CMS. A small Node build renders the pages from `data/` and cuts
every image rendition from the source logo.

```
data/site.json      copy, contact details, meta
data/roster.json    the roster — one object per artist
assets/             source assets (logo, artist photos) — highest res available
src/styles.css      the whole stylesheet
src/templates.mjs   page markup
scripts/build.mjs   renders dist/
scripts/images.mjs  logo knockout, OG card, favicons, photo derivatives
public/             copied to dist/ verbatim (self-hosted fonts)
```

## Running it

```sh
npm install
npm run build     # → dist/
npm run dev       # build, then serve dist/ at http://localhost:4321
```

The build prints a "Before launch" list of anything still missing — absent
artist photos, links without URLs, a logo too small to stay crisp.

## The roster

`data/roster.json` is currently an empty array, so the roster section and its
nav link do not render at all — the page is logo, About, Contact. That is a
supported state, not a placeholder: nothing renders empty.

To bring the roster back, append an object, drop the photo in
`assets/artists/`, and rebuild. Nothing else changes.

```json
{
  "slug": "artist-name",
  "name": "Artist Name",
  "descriptor": "One line, lowercase, no hype.",
  "photo": "artists/artist-name.jpg",
  "links": [{ "label": "Spotify", "url": "https://..." }]
}
```

Layout follows the count on its own: one artist is a full-width feature, two or
more break into an even grid (2 → two columns, 3 → three, 4+ → auto-fit), and
everything collapses to a single column on phones. Links whose `url` is empty
are omitted rather than rendered dead, so placeholders are safe to leave in.

## The logo

`assets/logo.jpg` is the supplied scan: black brush ink on cream paper, baked
in. The build knocks the paper out to transparency — luminance drives alpha,
which preserves every soft brush edge — and repaints the strokes in brand ink.
That is why the mark sits on `--paper` with no visible rectangle, and why the
page's own grain shows through it.

Every rendition comes from that one knockout: the hero (`WebP` + `PNG`), the
1200×630 link-preview card, and the favicons, which are cropped to the brush
"S" by reading the ink profile rather than by fixed ratios.

**To replace the logo:** drop a new file in `assets/` named `logo.svg`, `.png`,
`.jpg` or `.webp` and rebuild. SVG wins if present. No code change.

> The current scan gives a mark 559px wide after trimming. That is fine on
> phones and slightly soft on high-density desktop displays. A larger export —
> or a vector redraw as `assets/logo.svg` — is a drop-in improvement.

To override the automatic favicon crop, add `assets/favicon-source.png` (a
square, hand-cropped "S"); the build uses it instead.

## The painted email lockup

`assets/email-lockup.png` (`.jpg`/`.webp` also accepted) is optional artwork:
the contact address hand-painted in the same brush hand as the logo. When it
is present the build knocks its paper out to transparency exactly as it does
the logo, and the contact section renders it as an image wrapped in a
`mailto:` link, with the address as its `alt` text so screen readers announce
it correctly. A live-text copy of the address sits underneath — an image
cannot be selected, and people copy email addresses — set to select in full
on a single click.

With no artwork present the section falls back to the address set as type.
Both states are supported; the build reports which one it used.

If the address in `data/site.json` ever changes, the artwork has to be
repainted to match. The build cannot check that they agree.

## Deploying

Vercel, zero extra configuration — `vercel.json` sets the build command and
output directory.

**Domain canonicalisation lives in Vercel's domain settings, not in
`vercel.json`.** Which host is primary, `www` vs apex, and the 301 from
`sonsmanagement.com` are all configured per-domain in the Vercel dashboard.

Do not add host-based `redirects` to `vercel.json` as well. Vercel applies its
domain redirect *and* the config redirect, so a rule pointing `www` → apex
while the dashboard points apex → `www` produces an infinite loop: the HTML
may still serve from edge cache while every stylesheet, font and image fails,
which renders as an unstyled page with a broken logo.

Whichever host is primary must match `domain` in `data/site.json`, since that
value generates the `canonical` and `og:url` tags.

## Before launch

Still outstanding:

- [ ] Confirm `jesse@sonsmgmt.com` is live, or swap the interim address in `data/site.json`
- [ ] Approve the About copy in `data/site.json`
- [ ] Higher-resolution logo export or vector redraw
- [ ] Domains added in Vercel; `sonsmanagement.com` redirect verified
- [ ] OG card checked in iMessage, Slack and Gmail
- [ ] Mobile pass on a real phone

The site names no artists and makes no representation claims, so nothing in
the copy depends on where a management agreement stands.
