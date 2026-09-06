// Single-use loopback form: passes a secret to the approved VPS over SSH stdin.
// No credentials in URLs, logs, command-line arguments or local files.
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const nonce = crypto.randomBytes(32).toString('hex');
const origin = 'http://127.0.0.1:43127';
let used = false;
const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  if (req.headers.host !== '127.0.0.1:43127' || used) { res.writeHead(403); res.end('Closed'); return; }
  if (req.method === 'GET' && req.url === '/') {
    res.end(`<h1>Одноразовый перенос токена на ваш VPS</h1><p>Токен не сохраняется локально и не выводится в журнал.</p><form method="POST" action="/import"><input type="hidden" name="nonce" value="${nonce}"><label>Токен Яндекс.Вебмастера <input type="password" name="token" autocomplete="off" required></label><button>Сохранить на VPS</button></form>`);
    return;
  }
  if (req.method !== 'POST' || req.url !== '/import' || req.headers.origin !== origin) { res.writeHead(403); res.end('Rejected'); return; }
  let body = '';
  req.on('data', chunk => { body += chunk; if (body.length > 4096) req.destroy(); });
  req.on('end', () => {
    const values = new URLSearchParams(body);
    const token = values.get('token') || '';
    if (values.get('nonce') !== nonce || !/^[A-Za-z0-9_-]{30,1024}$/.test(token)) { res.writeHead(400); res.end('Invalid import'); return; }
    used = true;
    const ssh = spawn('ssh', ['-o','BatchMode=yes','-o','ConnectTimeout=20','root@5.129.248.119','python3 /tmp/masterok-import-yandex-token.py'], {stdio:['pipe','ignore','ignore']});
    ssh.stdin.on('error', () => {});
    ssh.stdin.end(token);
    const limit = setTimeout(() => ssh.kill(), 45000);
    ssh.on('error', () => { clearTimeout(limit); res.writeHead(502); res.end('Ошибка SSH. Токен не выводился.'); server.close(); });
    ssh.on('close', code => { clearTimeout(limit); res.writeHead(code === 0 ? 200 : 502); res.end(code === 0 ? '<h1>Токен сохранён на VPS</h1><p>Локальная форма закрыта.</p>' : '<h1>Импорт не подтверждён</h1><p>Токен не выводился. Нужна проверка файла на сервере.</p>'); server.close(); });
  });
});
server.listen(43127, '127.0.0.1', () => console.log('One-time token form listening on loopback port 43127'));
setTimeout(() => server.close(), 300000).unref();
