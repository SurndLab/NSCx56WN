const {
  buildFolderUrl,
  buildPageUrl,
  buildTagUrl,
  buildImageUrl,
  escapeHtml,
} = require('./content-service');

function renderLayout({ title, moduleName, heroTitle, heroIntro, content, searchQuery = '' }) {
  const moduleBase = `/${moduleName}`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="/static/styles.css">
    <script defer src="/static/app.js"></script>
  </head>
  <body>
    <div class="page-loader" data-page-loader aria-hidden="true">
      <div class="page-loader__spinner"></div>
      <p>Loading exhibition pages...</p>
    </div>

    <div class="page-shell">
      <header class="site-header">
        <div class="site-header__bar">
          <a class="site-header__brand" href="${moduleBase}/">
            <span class="site-header__eyebrow">Nangang Exhibition Center</span>
            <strong>Module C Content Portal</strong>
          </a>

          <nav class="site-header__nav" aria-label="Primary">
            <a href="${moduleBase}/">Home</a>
            <a href="${moduleBase}/tags">Tags</a>
          </nav>
        </div>

        <section class="hero-panel">
          <div>
            <p class="hero-panel__eyebrow">Server-rendered Node.js project</p>
            <h1>${escapeHtml(heroTitle)}</h1>
            <p>${escapeHtml(heroIntro)}</p>
          </div>

          <form class="search-form" action="${moduleBase}/search" method="get" role="search">
            <label class="search-form__label" for="site-search">Search pages</label>
            <div class="search-form__row">
              <input
                id="site-search"
                name="q"
                type="search"
                value="${escapeHtml(searchQuery)}"
                placeholder="Taipei/Expo"
                aria-describedby="search-help"
              >
              <button type="submit">Search</button>
            </div>
            <p id="search-help">Use <strong>/</strong> between keywords. Search is case-insensitive.</p>
          </form>
        </section>
      </header>

      <main class="page-content">
        ${content}
      </main>
    </div>
  </body>
</html>`;
}

function renderFolderCards(folders, moduleName) {
  if (!folders.length) {
    return '<p class="empty-state">No subfolders in this directory.</p>';
  }

  return `<div class="card-grid">${folders
    .map(
      (folder) => `<article class="folder-card">
        <p class="folder-card__icon" aria-hidden="true">Folder</p>
        <h3><a href="${buildFolderUrl(moduleName, folder.relativeDir)}">${escapeHtml(folder.name)}</a></h3>
        <p>Browse nested pages and folders inside ${escapeHtml(folder.name)}.</p>
      </article>`
    )
    .join('')}</div>`;
}

function renderPageCards(pages, moduleName) {
  if (!pages.length) {
    return '<p class="empty-state">No pages available in this section.</p>';
  }

  return `<div class="card-grid">${pages
    .map((page) => {
      const featured = page.featured ? '<span class="featured-mark" aria-label="Featured article">Star</span>' : '';
      return `<article class="page-card">
        <p class="page-card__meta">${escapeHtml(page.date)} • ${escapeHtml(page.author)}</p>
        <h3>${featured}<a href="${buildPageUrl(moduleName, page.routeKey)}">${escapeHtml(page.title)}</a></h3>
        <p><a href="${buildPageUrl(moduleName, page.routeKey)}">${escapeHtml(page.summary)}</a></p>
      </article>`;
    })
    .join('')}</div>`;
}

function renderBreadcrumbs(moduleName, crumbs) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${crumbs
    .map((crumb) => {
      if (!crumb.href) {
        return `<span aria-current="page">${escapeHtml(crumb.label)}</span>`;
      }

      return `<a href="${crumb.href}">${escapeHtml(crumb.label)}</a>`;
    })
    .join('<span class="breadcrumbs__divider" aria-hidden="true">/</span>')}</nav>`;
}

function renderHomePage({ moduleName, folder, latestPages }) {
  const content = `
    <section class="panel-section">
      <div class="section-heading">
        <div>
          <p class="section-heading__eyebrow">Root directory</p>
          <h2>Browse folders</h2>
        </div>
      </div>
      ${renderFolderCards(folder.folders, moduleName)}
    </section>

    <section class="panel-section">
      <div class="section-heading">
        <div>
          <p class="section-heading__eyebrow">Root pages</p>
          <h2>Published articles</h2>
        </div>
      </div>
      ${renderPageCards(folder.pages, moduleName)}
    </section>

    <section class="panel-section panel-section--accent">
      <div class="section-heading">
        <div>
          <p class="section-heading__eyebrow">Newest five</p>
          <h2>Latest articles</h2>
        </div>
      </div>
      ${renderPageCards(latestPages, moduleName)}
    </section>
  `;

  return renderLayout({
    title: 'Module C Home',
    moduleName,
    heroTitle: 'Content pages, tags, and search in one server-rendered project',
    heroIntro:
      'The homepage lists root folders, published root pages, and the latest five articles sorted from newest to oldest.',
    content,
  });
}

function renderFolderPage({ moduleName, folder, relativeDir }) {
  const segments = relativeDir.split('/').filter(Boolean);
  const crumbs = [
    { label: 'Home', href: `/${moduleName}/` },
    ...segments.map((segment, index) => ({
      label: segment,
      href:
        index === segments.length - 1
          ? null
          : buildFolderUrl(moduleName, segments.slice(0, index + 1).join('/')),
    })),
  ];

  const content = `
    ${renderBreadcrumbs(moduleName, crumbs)}

    <section class="panel-section">
      <div class="section-heading">
        <div>
          <p class="section-heading__eyebrow">Directory listing</p>
          <h2>${escapeHtml(relativeDir || 'Root')}</h2>
        </div>
      </div>
      ${renderFolderCards(folder.folders, moduleName)}
    </section>

    <section class="panel-section">
      <div class="section-heading">
        <div>
          <p class="section-heading__eyebrow">Published pages</p>
          <h2>Articles in this folder</h2>
        </div>
      </div>
      ${renderPageCards(folder.pages, moduleName)}
    </section>
  `;

  return renderLayout({
    title: `${relativeDir || 'Root'} | Module C`,
    moduleName,
    heroTitle: relativeDir || 'Root directory',
    heroIntro: 'Folders are sorted alphabetically. Pages are sorted in reverse alphabetical order by filename.',
    content,
  });
}

function renderTagIndexPage({ moduleName, tags }) {
  const items = [...tags.keys()].sort((left, right) => left.localeCompare(right));
  const content = `
    <section class="panel-section">
      <div class="section-heading">
        <div>
          <p class="section-heading__eyebrow">Tag index</p>
          <h2>All published tags</h2>
        </div>
      </div>

      ${
        items.length
          ? `<div class="tag-cloud">${items
              .map((tag) => `<a class="tag-pill" href="${buildTagUrl(moduleName, tag)}">${escapeHtml(tag)}</a>`)
              .join('')}</div>`
          : '<p class="empty-state">No tags available yet.</p>'
      }
    </section>
  `;

  return renderLayout({
    title: 'Tags | Module C',
    moduleName,
    heroTitle: 'Browse tags',
    heroIntro: 'Draft pages are excluded from tag lists and tag result pages.',
    content,
  });
}

function renderTagPage({ moduleName, tag, pages }) {
  const content = `
    <section class="panel-section">
      <div class="section-heading">
        <div>
          <p class="section-heading__eyebrow">Tag results</p>
          <h2>${escapeHtml(tag)}</h2>
        </div>
      </div>
      ${renderPageCards(pages, moduleName)}
    </section>
  `;

  return renderLayout({
    title: `${tag} | Tags`,
    moduleName,
    heroTitle: `Tagged with ${tag}`,
    heroIntro: 'This page lists every published article that contains the selected tag.',
    content,
  });
}

function renderSearchPage({ moduleName, query, pages }) {
  const content = `
    <section class="panel-section">
      <div class="section-heading">
        <div>
          <p class="section-heading__eyebrow">Search results</p>
          <h2>${escapeHtml(query || 'Search')}</h2>
        </div>
      </div>

      ${pages.length ? renderPageCards(pages, moduleName) : '<p class="empty-state">No articles found.</p>'}
    </section>
  `;

  return renderLayout({
    title: `Search | ${query}`,
    moduleName,
    heroTitle: 'Search titles and article content',
    heroIntro: 'The search engine uses case-insensitive OR matching for keywords separated by a slash.',
    content,
    searchQuery: query,
  });
}

function renderArticlePage({ moduleName, page, bodyHtml, relatedPages }) {
  const folderSegments = page.relativeDir.split('/').filter(Boolean);
  const crumbs = [{ label: 'Home', href: `/${moduleName}/` }];

  for (let index = 0; index < folderSegments.length; index += 1) {
    crumbs.push({
      label: folderSegments[index],
      href: buildFolderUrl(moduleName, folderSegments.slice(0, index + 1).join('/')),
    });
  }

  crumbs.push({ label: page.slug, href: null });

  const tagsMarkup = page.tags.length
    ? page.tags
        .map((tag) => `<a class="tag-pill" href="${buildTagUrl(moduleName, tag)}">${escapeHtml(tag)}</a>`)
        .join('')
    : '<span class="muted-text">No tags</span>';

  const featuredBadge = page.featured ? '<p class="article-featured">Featured article</p>' : '';
  const draftStatus = page.draft ? '<p class="article-draft">Draft: true</p>' : '';
  const relatedMarkup = relatedPages.length
    ? renderPageCards(relatedPages, moduleName)
    : '<p class="empty-state">No related articles found.</p>';

  const content = `
    ${renderBreadcrumbs(moduleName, crumbs)}

    <article class="article-layout">
      <div class="article-main">
        <img class="article-cover" src="${buildImageUrl(moduleName, page.coverReference)}" alt="${escapeHtml(page.title)} cover image">
        <header class="article-header">
          <h2>${escapeHtml(page.title)}</h2>
        </header>
        <section class="article-body rich-copy">
          ${bodyHtml}
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <div>
              <p class="section-heading__eyebrow">Related</p>
              <h3>Related articles</h3>
            </div>
          </div>
          ${relatedMarkup}
        </section>
      </div>

      <aside class="meta-panel">
        ${featuredBadge}
        <h3>Article notes</h3>
        <dl>
          <div>
            <dt>Date</dt>
            <dd>${escapeHtml(page.date)}</dd>
          </div>
          <div>
            <dt>Author</dt>
            <dd>${escapeHtml(page.author)}</dd>
          </div>
          <div>
            <dt>Tags</dt>
            <dd class="meta-panel__tags">${tagsMarkup}</dd>
          </div>
        </dl>
        ${draftStatus}
      </aside>
    </article>
  `;

  return renderLayout({
    title: `${page.title} | Module C`,
    moduleName,
    heroTitle: page.title,
    heroIntro: page.summary,
    content,
  });
}

function renderNotFoundPage({ moduleName, title, message }) {
  const content = `
    <section class="panel-section">
      <div class="section-heading">
        <div>
          <p class="section-heading__eyebrow">Not found</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
      </div>
      <p class="empty-state">${escapeHtml(message)}</p>
    </section>
  `;

  return renderLayout({
    title,
    moduleName,
    heroTitle: title,
    heroIntro: message,
    content,
  });
}

module.exports = {
  renderArticlePage,
  renderFolderPage,
  renderHomePage,
  renderNotFoundPage,
  renderSearchPage,
  renderTagIndexPage,
  renderTagPage,
};