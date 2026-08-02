const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Specific static files served before the SPA fallback.
const STATIC_ROUTES = {
  '/listening-test.html': path.join(__dirname, 'listening-test.html'),
};

http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  const staticFile = STATIC_ROUTES[urlPath];
  if (staticFile) {
    fs.readFile(staticFile, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
    return;
  }

  // SPA fallback — serve index.html for all other routes
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`HEAL running on port ${PORT}`);
});
