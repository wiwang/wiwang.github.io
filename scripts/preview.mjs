import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("out");
if (!fs.existsSync(root)) {
  console.error("Run npm run build first.");
  process.exit(1);
}
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};
http
  .createServer((req, res) => {
    let requested;
    try {
      requested = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }
    let file = path.resolve(root, `.${requested}`);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    let status = 200;
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      status = 404;
      file = path.join(root, "404.html");
    }
    res.writeHead(status, {
      "Content-Type": `${types[path.extname(file)] ?? "application/octet-stream"}${[".html", ".css", ".js", ".xml", ".txt"].includes(path.extname(file)) ? "; charset=utf-8" : ""}`,
    });
    if (req.method === "HEAD") res.end();
    else fs.createReadStream(file).pipe(res);
  })
  .listen(3000, "127.0.0.1", () =>
    console.log("Static production preview: http://127.0.0.1:3000"),
  );
