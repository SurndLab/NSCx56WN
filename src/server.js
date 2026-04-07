const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const { URL } = require('node:url');
const {
  buildPageBody,
  buildSiteData,
  getRelatedPages,
  searchPages,
} = require('./content-service');
const {
  renderArticlePage,
  renderFolderPage,
  renderHomePage,
  renderNotFoundPage,
  renderSearchPage,
  renderTagIndexPage,
  renderTagPage,
} = require('./templates');

const projectRoot = path.resolve(__dirname, '..');
const defaultModuleName = process.env.DEFAULT_MODULE_NAME || '56_module_c';
const port = Number(process.env.PORT || 3000);
const publicRoot = path.join(projectRoot, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function isValidModuleName(value) {
  return /^[A-Za-z0-9]+_module_c$/.test(value || '');
}

let cachedSite = null;

async function loadSiteData() {
  if (cachedSite) {
    return cachedSite;
  }

  try {
    cachedSite = await buildSiteData(projectRoot);
    return cachedSite;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      await fs.mkdir(path.join(projectRoot, 'contentpages'), { recursive: true });
      cachedSite = await buildSiteData(projectRoot);
      return cachedSite;
    }

    throw error;
  }
}

function sendHtml(response, statusCode, body) {
  const buffer = Buffer.from(body, 'utf8');
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': buffer.byteLength,
  });
  response.end(buffer);
}

function sendRedirect(response, location) {
  response.writeHead(302, { ...SECURITY_HEADERS, 'Location': location });
  response.end();
}

function sendText(response, statusCode, message) {
  const buffer = Buffer.from(message, 'utf8');
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': buffer.byteLength,
  });
  response.end(buffer);
}

async function serveFile(response, absolutePath) {
  let stats;

  try {
    stats = await fs.stat(absolutePath);
  } catch {
    return false;
  }

  if (!stats.isFile()) {
    return false;
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  response.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': contentType,
    'Content-Length': stats.size,
  });

  createReadStream(absolutePath).pipe(response);

  return true;
}

const server = http.createServer(async (request, response) => {
  try {
    const reqUrl = new URL(request.url, 'http://localhost');
    const pathname = reqUrl.pathname;
    const segments = pathname.split('/').filter(Boolean);

    // Root redirect
    if (!segments.length) {
      return sendRedirect(response, `/${defaultModuleName}/`);
    }

    // Static files: /static/*
    if (segments[0] === 'static') {
      const relativePath = segments.slice(1).join(path.sep);
      const filePath = path.resolve(publicRoot, relativePath);

      if (!filePath.startsWith(publicRoot + path.sep) && filePath !== publicRoot) {
        return sendText(response, 400, 'Invalid path.');
      }

      const served = await serveFile(response, filePath);

      if (!served) {
        return sendText(response, 404, 'File not found.');
      }

      return;
    }

    const moduleName = segments[0];

    if (!isValidModuleName(moduleName)) {
      return sendHtml(
        response,
        404,
        renderNotFoundPage({
          moduleName: defaultModuleName,
          title: 'Page not found',
          message: 'The requested route is not available.',
        })
      );
    }

    // /:module/assets/images/*
    if (segments[1] === 'assets' && segments[2] === 'images') {
      const site = await loadSiteData();
      const imagesRoot = path.join(site.contentRoot, 'images');
      const relativePath = segments
        .slice(3)
        .map((segment) => decodeURIComponent(segment))
        .join(path.sep);
      const filePath = path.resolve(imagesRoot, relativePath);

      if (!filePath.startsWith(imagesRoot + path.sep) && filePath !== imagesRoot) {
        return sendText(response, 400, 'Invalid image path.');
      }

      const served = await serveFile(response, filePath);

      if (!served) {
        return sendText(response, 404, 'Image not found.');
      }

      return;
    }

    // /:module/ (home)
    if (!segments[1]) {
      const site = await loadSiteData();
      const folder = site.folderIndex.get('') || { folders: [], pages: [] };

      return sendHtml(
        response,
        200,
        renderHomePage({ moduleName, folder, latestPages: site.latestPages })
      );
    }

    // /:module/search
    if (segments[1] === 'search' && !segments[2]) {
      const query = String(reqUrl.searchParams.get('q') || '').trim();
      const site = await loadSiteData();
      const results = searchPages(site.visiblePages, query);

      return sendHtml(response, 200, renderSearchPage({ moduleName, query, pages: results }));
    }

    // /:module/tags
    if (segments[1] === 'tags' && !segments[2]) {
      const site = await loadSiteData();

      return sendHtml(response, 200, renderTagIndexPage({ moduleName, tags: site.tags }));
    }

    // /:module/tags/:tag
    if (segments[1] === 'tags' && segments[2]) {
      const tag = decodeURIComponent(segments[2]);
      const site = await loadSiteData();
      const pages = site.tags.get(tag) || [];

      return sendHtml(response, 200, renderTagPage({ moduleName, tag, pages }));
    }

    // /:module/events (redirect to home)
    if (segments[1] === 'events' && !segments[2]) {
      return sendRedirect(response, `/${moduleName}/`);
    }

    // /:module/events/*
    if (segments[1] === 'events' && segments[2]) {
      const site = await loadSiteData();
      const routeKey = segments.slice(2).join('/');

      if (site.pageMap.has(routeKey)) {
        const page = site.pageMap.get(routeKey);
        const bodyHtml = buildPageBody(page, moduleName);
        const relatedPages = getRelatedPages(page, site.visiblePages);

        return sendHtml(
          response,
          200,
          renderArticlePage({ moduleName, page, bodyHtml, relatedPages })
        );
      }

      if (site.folderIndex.has(routeKey)) {
        return sendHtml(
          response,
          200,
          renderFolderPage({ moduleName, folder: site.folderIndex.get(routeKey), relativeDir: routeKey })
        );
      }

      return sendHtml(
        response,
        404,
        renderNotFoundPage({
          moduleName,
          title: 'Content not found',
          message: 'The requested page or folder does not exist.',
        })
      );
    }

    // Fallback 404
    return sendHtml(
      response,
      404,
      renderNotFoundPage({
        moduleName,
        title: 'Page not found',
        message: 'The requested route is not available.',
      })
    );
  } catch (error) {
    console.error(error);
    sendText(response, 500, 'Internal server error.');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Module C server running at http://127.0.0.1:${port}/${defaultModuleName}/`);
});