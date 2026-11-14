/**
 * Lightweight Local HTTP Server for Practical 11
 * 
 * ES6 modules require HTTP/HTTPS protocol due to browser CORS policies.
 * This server uses native Node.js standard libraries (no npm packages required).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
    let reqUrl = req.url.split("?")[0];
    let safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, "");
    if (safePath === "/" || safePath === "\\") {
        safePath = "/index.html";
    }

    const filePath = path.join(__dirname, safePath);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("404: File Not Found");
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        res.writeHead(200, {
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*"
        });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`Practical 11 server running at: http://localhost:${PORT}/`);
    console.log(`Press Ctrl+C to stop.`);
});

