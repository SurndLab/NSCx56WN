const fs = require('fs/promises');
const path = require('path');
const cheerio = require('cheerio');

const ROOT_CANDIDATES = ['contentpages', 'content-pages'];
const PAGE_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)\.(html|txt)$/i;
const IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp|svg)$/i;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeRelativePath(value = '') {
  return value.split(path.sep).join('/').replace(/^\/+|\/+$/g, '');
}

async function resolveContentRoot(projectRoot) {
  for (const candidate of ROOT_CANDIDATES) {
    const absolutePath = path.join(projectRoot, candidate);

    try {
      const stats = await fs.stat(absolutePath);

      if (stats.isDirectory()) {
        return absolutePath;
      }
    } catch {
      continue;
    }
  }

  return path.join(projectRoot, ROOT_CANDIDATES[0]);
}

function parseBoolean(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function parseFrontMatter(rawContent) {
  const normalized = rawContent.replace(/\r\n/g, '\n');

  if (!normalized.startsWith('---\n')) {
    return {
      attributes: {},
      body: normalized,
    };
  }

  const boundary = normalized.indexOf('\n---\n', 4);

  if (boundary === -1) {
    return {
      attributes: {},
      body: normalized,
    };
  }

  const frontMatterBlock = normalized.slice(4, boundary);
  const body = normalized.slice(boundary + 5);
  const attributes = {};

  for (const line of frontMatterBlock.split('\n')) {
    const separatorIndex = line.indexOf(':');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key) {
      attributes[key] = value;
    }
  }

  return {
    attributes,
    body,
  };
}

function filenameToTitle(filename) {
  const match = filename.match(PAGE_FILE_PATTERN);
  const slug = match ? match[2] : filename.replace(/\.[^.]+$/, '');
  return slug.replace(/-/g, ' ').toUpperCase();
}

function extractHtmlH1(html) {
  const $ = cheerio.load(html);
  const heading = $('h1').first().text().trim();
  return heading || null;
}

function normalizeTags(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeImageReference(reference) {
  return String(reference || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/^images\//i, '')
    .replace(/\\/g, '/');
}

function buildModuleBase(moduleName) {
  return `/${moduleName}`;
}

function buildPageUrl(moduleName, routeKey) {
  const suffix = routeKey ? `/${routeKey}` : '';
  return `${buildModuleBase(moduleName)}/events${suffix}`;
}

function buildFolderUrl(moduleName, relativeDir) {
  if (!relativeDir) {
    return `${buildModuleBase(moduleName)}/`;
  }

  return `${buildModuleBase(moduleName)}/events/${relativeDir}`;
}

function buildTagUrl(moduleName, tag) {
  return `${buildModuleBase(moduleName)}/tags/${encodeURIComponent(tag)}`;
}

function buildImageUrl(moduleName, reference) {
  const normalized = normalizeImageReference(reference);
  const encoded = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${buildModuleBase(moduleName)}/assets/images/${encoded}`;
}

function inferCoverReference(filename) {
  const basename = filename.replace(/\.[^.]+$/, '');
  return `${basename}.jpg`;
}

function stripHtml(html) {
  return cheerio.load(html).text().replace(/\s+/g, ' ').trim();
}

function buildSummary(frontMatterSummary, fallbackText) {
  if (frontMatterSummary) {
    return String(frontMatterSummary).trim();
  }

  return fallbackText.replace(/\s+/g, ' ').trim().slice(0, 180);
}

function enhanceHtmlContent(html, moduleName) {
  const $ = cheerio.load(`<div class="article-body">${html}</div>`, null, false);

  $('img').each((_, element) => {
    const image = $(element);
    const source = image.attr('src');

    if (source && !/^(https?:)?\/\//i.test(source) && !source.startsWith('data:')) {
      image.attr('src', buildImageUrl(moduleName, source));
    }

    image.addClass('article-image');

    if (!image.attr('alt')) {
      image.attr('alt', 'Article image');
    }
  });

  $('p')
    .filter((_, element) => $(element).text().trim())
    .first()
    .addClass('dropcap');

  return $('.article-body').html() || '';
}

function renderQuoteBlock(lines) {
  if (!lines.length) {
    return '';
  }

  const inner = lines
    .filter((line) => line.trim())
    .map((line) => `<p>${escapeHtml(line.trim())}</p>`)
    .join('');

  return `<blockquote class="quote-block">${inner}</blockquote>`;
}

function renderTextContent(body, moduleName) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const parts = [];
  const quoteLines = [];
  let inQuote = false;
  let firstParagraphApplied = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '[quote]') {
      inQuote = true;
      quoteLines.length = 0;
      continue;
    }

    if (line === '[/quote]') {
      inQuote = false;
      parts.push(renderQuoteBlock(quoteLines));
      quoteLines.length = 0;
      continue;
    }

    if (inQuote) {
      quoteLines.push(rawLine);
      continue;
    }

    if (!line) {
      continue;
    }

    if (!/\s/.test(line) && IMAGE_PATTERN.test(line)) {
      parts.push(
        `<img class="article-image" src="${buildImageUrl(moduleName, line)}" alt="Article image">`
      );
      continue;
    }

    const className = firstParagraphApplied ? '' : ' class="dropcap"';
    parts.push(`<p${className}>${escapeHtml(line)}</p>`);
    firstParagraphApplied = true;
  }

  if (quoteLines.length) {
    parts.push(renderQuoteBlock(quoteLines));
  }

  return parts.join('\n');
}

function buildSearchTokens(query) {
  return String(query || '')
    .split('/')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function matchesSearch(page, tokens) {
  if (!tokens.length) {
    return true;
  }

  const haystack = [page.title, page.summary, page.searchText].join(' ').toLowerCase();
  return tokens.some((token) => haystack.includes(token));
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

async function parsePageFile(absolutePath, relativeDir) {
  const filename = path.basename(absolutePath);
  const match = filename.match(PAGE_FILE_PATTERN);

  if (!match) {
    return null;
  }

  const [, date, slug, extension] = match;
  const rawContent = await fs.readFile(absolutePath, 'utf8');
  const { attributes, body } = parseFrontMatter(rawContent);
  const htmlHeading = extension.toLowerCase() === 'html' ? extractHtmlH1(body) : null;
  const title = attributes.title || htmlHeading || filenameToTitle(filename);
  const searchText =
    extension.toLowerCase() === 'html'
      ? stripHtml(body)
      : body.replace(/\[\/quote\]/g, ' ').replace(/\s+/g, ' ').trim();
  const summary = buildSummary(attributes.summary, searchText || title);
  const eventDate = new Date(`${date}T00:00:00`);
  const now = new Date();
  const isFuture = Number.isNaN(eventDate.getTime()) || eventDate > now;
  const draft = parseBoolean(attributes.draft);
  const featured = parseBoolean(attributes.featured);
  const routeKey = normalizeRelativePath(path.posix.join(relativeDir, `${date}-${slug}`));

  return {
    absolutePath,
    relativeDir,
    routeKey,
    slug: `${date}-${slug}`,
    filename,
    date,
    extension: extension.toLowerCase(),
    title,
    summary,
    author: attributes.author || 'Anonymous author',
    tags: normalizeTags(attributes.tags),
    draft,
    featured,
    body,
    coverReference: normalizeImageReference(attributes.cover || inferCoverReference(filename)),
    isListable: !draft && !isFuture,
    searchText,
  };
}

async function buildSiteData(projectRoot) {
  const contentRoot = await resolveContentRoot(projectRoot);
  const folderIndex = new Map();
  const pageMap = new Map();
  const allPages = [];

  folderIndex.set('', {
    relativeDir: '',
    folders: [],
    pages: [],
  });

  async function walk(relativeDir = '') {
    const absoluteDir = path.join(contentRoot, relativeDir);
    const entries = await fs.readdir(absoluteDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === 'images') {
          continue;
        }

        const childRelativeDir = normalizeRelativePath(path.join(relativeDir, entry.name));

        folderIndex.get(relativeDir).folders.push({
          name: entry.name,
          relativeDir: childRelativeDir,
        });

        folderIndex.set(childRelativeDir, {
          relativeDir: childRelativeDir,
          folders: [],
          pages: [],
        });

        await walk(childRelativeDir);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const page = await parsePageFile(path.join(absoluteDir, entry.name), relativeDir);

      if (!page) {
        continue;
      }

      allPages.push(page);
      pageMap.set(page.routeKey, page);

      if (page.isListable) {
        folderIndex.get(relativeDir).pages.push(page);
      }
    }
  }

  await walk('');

  for (const value of folderIndex.values()) {
    value.folders.sort((left, right) => left.name.localeCompare(right.name));
    value.pages.sort((left, right) => right.slug.localeCompare(left.slug));
  }

  const visiblePages = allPages
    .filter((page) => page.isListable)
    .sort((left, right) => right.date.localeCompare(left.date));

  const tags = new Map();

  for (const page of visiblePages) {
    for (const tag of page.tags) {
      if (!tags.has(tag)) {
        tags.set(tag, []);
      }

      tags.get(tag).push(page);
    }
  }

  return {
    contentRoot,
    folderIndex,
    pageMap,
    allPages,
    visiblePages,
    latestPages: visiblePages.slice(0, 5),
    tags,
  };
}

function renderPageBody(page, moduleName) {
  if (page.extension === 'html') {
    return enhanceHtmlContent(page.body, moduleName);
  }

  return renderTextContent(page.body, moduleName);
}

function getRelatedPages(page, visiblePages) {
  const tagSet = new Set(page.tags.map((tag) => tag.toLowerCase()));
  const candidates = visiblePages.filter((candidate) => {
    if (candidate.routeKey === page.routeKey) {
      return false;
    }

    return candidate.tags.some((tag) => tagSet.has(tag.toLowerCase()));
  });

  return shuffle(candidates).slice(0, 3);
}

function searchPages(visiblePages, query) {
  const tokens = buildSearchTokens(query);

  if (!tokens.length) {
    return [];
  }

  return visiblePages.filter((page) => matchesSearch(page, tokens));
}

module.exports = {
  buildFolderUrl,
  buildImageUrl,
  buildModuleBase,
  buildPageBody: renderPageBody,
  buildPageUrl,
  buildSiteData,
  buildTagUrl,
  escapeHtml,
  getRelatedPages,
  searchPages,
};