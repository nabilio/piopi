import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');
const distDir = resolve(projectRoot, 'dist');
const port = Number.parseInt(process.env.PORT ?? '', 10) || 3001;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
};

async function loadFile(filePath) {
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return null;
    }
    return { stats };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

const indexHtmlPath = join(distDir, 'index.html');

async function ensureIndexHtml() {
  const indexInfo = await loadFile(indexHtmlPath);
  if (!indexInfo) {
    throw new Error(
      `Le dossier dist est introuvable. Lancez "npm run build" avant d'exécuter scripts/serve-dist.mjs.`
    );
  }
}

function getMimeType(pathname) {
  return mimeTypes[extname(pathname).toLowerCase()] ?? 'application/octet-stream';
}

function sanitizePath(requestPath) {
  const decoded = decodeURI(requestPath);
  const normalized = normalize(decoded).replace(/\\+/g, '/');
  if (normalized.includes('..')) {
    return '/';
  }
  if (!normalized.startsWith('/')) {
    return `/${normalized}`;
  }
  return normalized;
}

async function handleRequest(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  let pathname = sanitizePath(url.pathname);

  if (pathname.endsWith('/')) {
    pathname = `${pathname}index.html`;
  }

  let filePath = resolve(distDir, `.${pathname}`);
  if (!filePath.startsWith(distDir)) {
    pathname = '/index.html';
    filePath = indexHtmlPath;
  }

  const fileInfo = await loadFile(filePath);

  if (!fileInfo) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const html = await readFile(indexHtmlPath, 'utf8');
    res.end(html);
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', getMimeType(filePath));
  res.setHeader('Content-Length', fileInfo.stats.size);
  createReadStream(filePath).pipe(res);
}

async function startServer() {
  await ensureIndexHtml();
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error('Erreur pendant la réponse HTTP:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Erreur interne du serveur');
    });
  });

  server.listen(port, () => {
    console.log(`Serveur statique démarré sur http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
