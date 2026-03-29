/**
 * Custom Next.js standalone server.
 * Serves public/ static files (including /admin/) that the default
 * standalone server.js does not handle automatically.
 */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const path = require("path");
const fs = require("fs");

const dev = false;
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const MIME_TYPES = {
  ".html": "text/html",
  ".yml": "text/yaml",
  ".yaml": "text/yaml",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".xml": "text/xml",
  ".txt": "text/plain",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    let { pathname } = parsedUrl;

    // Try serving from public/ directory first
    const publicPath = path.join(__dirname, "public", pathname);

    // If path ends with / try index.html
    if (pathname.endsWith("/")) {
      const indexPath = path.join(publicPath, "index.html");
      if (fs.existsSync(indexPath)) {
        const ext = ".html";
        res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
        fs.createReadStream(indexPath).pipe(res);
        return;
      }
    }

    // Try exact file match
    if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
      const ext = path.extname(publicPath).toLowerCase();
      res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
      fs.createReadStream(publicPath).pipe(res);
      return;
    }

    // Default Next.js handler
    handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
