const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ENTITIES[c]);

/** 1 stays a full-width feature; 2-4 map to named grids; beyond that, "many". */
function rosterCount(n) {
  if (n <= 1) return "1";
  return n <= 4 ? String(n) : "many";
}

function head({ site, title, description, canonical, og, noindex }) {
  return `  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}">
${noindex ? '  <meta name="robots" content="noindex, follow">\n' : ""}  <meta name="theme-color" content="#f4f0e6">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(site.name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(site.domain + og.url)}">
  <meta property="og:image:width" content="${og.width}">
  <meta property="og:image:height" content="${og.height}">
  <meta property="og:image:alt" content="${esc(site.displayName)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(site.domain + og.url)}">

  <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">

  <link rel="preload" href="/fonts/big-shoulders-display-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">`;
}

function artist(entry, single) {
  const photo = entry.photoAsset
    ? `      <picture>
        <source type="image/webp" srcset="${esc(entry.photoAsset.webpSrcset)}" sizes="${single ? "(min-width: 1100px) 1100px, 100vw" : "(min-width: 700px) 33vw, 100vw"}">
        <img class="artist__photo" src="${esc(entry.photoAsset.src)}" srcset="${esc(entry.photoAsset.jpgSrcset)}" sizes="${single ? "(min-width: 1100px) 1100px, 100vw" : "(min-width: 700px) 33vw, 100vw"}" width="${entry.photoAsset.width}" height="${entry.photoAsset.height}" alt="${esc(entry.photoAlt || entry.name)}" loading="lazy" decoding="async">
      </picture>\n`
    : "";

  const live = (entry.links || []).filter((l) => l.url && l.url.trim());
  const links = live.length
    ? `      <ul class="artist__links">
${live
  .map(
    (l) =>
      `        <li><a href="${esc(l.url)}" rel="noopener"${/^https?:/i.test(l.url) ? ' target="_blank"' : ""}>${esc(l.label)}<span class="visually-hidden"> — ${esc(entry.name)}</span></a></li>`,
  )
  .join("\n")}
      </ul>\n`
    : "";

  return `    <article class="artist">
${photo}      <h3 class="artist__name">${esc(entry.name)}</h3>
      <p class="artist__descriptor">${esc(entry.descriptor)}</p>
${links}    </article>`;
}

function jsonLd(site) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    alternateName: site.displayName,
    url: site.domain,
    logo: `${site.domain}/img/logo.png`,
    email: site.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Los Angeles",
      addressRegion: "CA",
      addressCountry: "US",
    },
    founder: { "@type": "Person", name: "Jesse Giddings" },
  });
}

export function homePage({ site, roster, logo, og }) {
  const hasRoster = roster.length > 0;
  const single = roster.length === 1;

  // No roster is a valid state, not an empty shell: the section and its nav
  // link drop out entirely rather than rendering an empty heading.
  const rosterSection = hasRoster
    ? `
    <section id="roster" class="section" aria-labelledby="roster-label">
      <div class="shell">
        <h2 class="section-label" id="roster-label">Roster</h2>
        <div class="roster" data-count="${rosterCount(roster.length)}">
${roster.map((a) => artist(a, single)).join("\n")}
        </div>
      </div>
    </section>
`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
${head({ site, title: site.title, description: site.description, canonical: `${site.domain}/`, og })}
  <script type="application/ld+json">${jsonLd(site)}</script>
</head>
<body>
  <header class="masthead">
    <div class="shell">
      <nav aria-label="Sections">
        <ul class="nav">
${hasRoster ? '          <li><a href="#roster">Roster</a></li>\n' : ""}          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main id="main">
    <h1 class="visually-hidden">${esc(site.displayName)} — ${esc(site.tagline.replace(/ · /g, ", "))}</h1>

    <section class="hero shell">
      <picture>
        <source type="image/webp" srcset="${esc(logo.webp)}">
        <img class="hero__logo" src="${esc(logo.png)}" width="${logo.width}" height="${logo.height}" alt="${esc(site.displayName)}" fetchpriority="high" decoding="async">
      </picture>
      <p class="hero__tagline">${esc(site.tagline)}</p>
    </section>
${rosterSection}
    <section id="about" class="section" aria-labelledby="about-label">
      <div class="shell">
        <h2 class="section-label" id="about-label">About</h2>
        <div class="prose">
${site.about.map((p) => `          <p>${esc(p)}</p>`).join("\n")}
        </div>
      </div>
    </section>

    <section id="contact" class="section" aria-labelledby="contact-label">
      <div class="shell">
        <h2 class="section-label" id="contact-label">Contact</h2>
        <a class="contact__email" href="mailto:${esc(site.email)}">${esc(site.email)}</a>
        <p class="contact__note">${esc(site.contactNote)}</p>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="shell">
      <p class="footer__mark">${esc(site.displayName)}</p>
      <p class="footer__legal">© ${site.copyrightYear} ${esc(site.name)}. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>
`;
}

export function pressPage({ site, og }) {
  return `<!doctype html>
<html lang="en">
<head>
${head({
  site,
  title: `Press — ${site.name}`,
  description: `Press and artist materials from ${site.name}.`,
  canonical: `${site.domain}/press`,
  og,
  noindex: true,
})}
</head>
<body>
  <main class="stub shell">
    <h1 class="stub__title">Press</h1>
    <p class="stub__body">Press materials and artist assets are available on request. Write to <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>.</p>
    <a class="stub__back" href="/">Back to ${esc(site.displayName)}</a>
  </main>
</body>
</html>
`;
}
