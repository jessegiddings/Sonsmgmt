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

## Adding an artist

Append an object to `data/roster.json`, drop the photo in `assets/artists/`,
and rebuild. Nothing else changes.

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

## Deploying

Vercel, zero extra configuration — `vercel.json` sets the build command and
output directory.

`vercel.json` also carries the 301 from `sonsmanagement.com` (and both `www`
hosts) to `sonsmgmt.com`. Those domains still have to be added to the Vercel
project for the redirect to fire; adding them is what routes the traffic in.

## Before launch

Still outstanding:

- [ ] Jessy Fury photo → `assets/artists/jessy-fury.jpg`
- [ ] Final URLs for official site, Instagram, YouTube, TikTok → `data/roster.json`
- [ ] Confirm `jesse@sonsmgmt.com` is live, or swap the interim address in `data/site.json`
- [ ] Approve the About copy in `data/site.json`
- [ ] Higher-resolution logo export or vector redraw
- [ ] Domains added in Vercel; `sonsmanagement.com` redirect verified
- [ ] OG card checked in iMessage, Slack and Gmail
- [ ] Mobile pass on a real phone

Copy deliberately avoids stating a representation relationship. The roster is
framed as a list of names, which is factual regardless of where the management
agreement stands.
