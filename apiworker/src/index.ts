import { Hono } from 'hono';
import { createJWT, verifyJWT } from './jwt';

interface Env {
  MAIL_STORAGE: DurableObjectNamespace;
  JWT_SECRET: string;
  DOMAIN: string;
}

const app = new Hono<{ Bindings: Env }>();
const getDomain = (env: Env) => env.DOMAIN || 'example.com';

// GET / - API 说明页面
app.get('/', (c) => {
  const domain = getDomain(c.env);
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Razmail API</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23667eea;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23764ba2;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='6' fill='url(%23grad)'/%3E%3Cpath d='M 10 11 L 10 21 M 10 11 L 16 11 Q 19 11 19 14 Q 19 15.5 17.5 16 L 19 21 M 16 16 L 10 16' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    .logo { width: 80px; height: 80px; margin: 0 auto 20px; display: block; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 10px; text-align: center; }
    h2 { margin-top: 30px; color: #333; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    .endpoint { background: #e8f4f8; padding: 10px; border-left: 4px solid #0066cc; margin: 10px 0; }
  </style>
</head>
<body>
  <svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="100" cy="100" r="90" fill="url(#grad)"/>
    <path d="M 60 70 L 60 130 M 60 70 L 90 70 Q 110 70 110 90 Q 110 100 100 105 L 110 130 M 90 105 L 60 105"
          stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="130" cy="80" r="6" fill="white" opacity="0.8"/>
    <circle cx="140" cy="100" r="4" fill="white" opacity="0.6"/>
  </svg>
  <h1>📧 Razmail API</h1>
  <p>临时邮箱服务 API，邮件保留 24 小时后自动删除。</p>

  <h2>API 端点</h2>

  <div class="endpoint">
    <h3>POST /get-mail</h3>
    <p>创建临时邮箱地址</p>
    <p><strong>请求：</strong></p>
    <pre><code>{
  "mail": "myname"  // 可选，自定义邮箱前缀
}</code></pre>
    <p><strong>响应：</strong></p>
    <pre><code>{
  "mail": "myname@${domain}",
  "key": "eyJhbGc..."
}</code></pre>
  </div>

  <div class="endpoint">
    <h3>POST /read-mail</h3>
    <p>读取邮件内容</p>
    <p><strong>请求：</strong></p>
    <pre><code>{
  "key": "eyJhbGc...",
  "mail": "myname@${domain}"
}</code></pre>
    <p><strong>响应（无邮件）：</strong></p>
    <pre><code>{ "status": "empty" }</code></pre>
    <p><strong>响应（有邮件）：</strong></p>
    <pre><code>{
  "status": "received",
  "from": "sender@example.com",
  "to": "myname@${domain}",
  "headers": { "subject": "...", ... },
  "raw": "原始邮件内容",
  "receivedAt": 1234567890
}</code></pre>
  </div>

  <div class="endpoint">
    <h3>GET /check</h3>
    <p>健康检查</p>
    <p><strong>响应：</strong> <code>healthy</code></p>
  </div>

  <h2>使用示例</h2>
  <pre><code># 创建邮箱
curl -X POST https://mail.${domain}/get-mail \\
  -H "Content-Type: application/json" \\
  -d '{"mail":"test"}'

# 读取邮件
curl -X POST https://mail.${domain}/read-mail \\
  -H "Content-Type: application/json" \\
  -d '{"key":"YOUR_KEY","mail":"test@${domain}"}'</code></pre>

  <h2>注意事项</h2>
  <ul>
    <li>邮件保留 24 小时后自动删除</li>
    <li>每个地址只保存最新收到的邮件</li>
    <li>JWT Token 有效期 24 小时</li>
  </ul>
</body>
</html>`;
  return c.html(html);
});

// 生成安全的随机邮箱 ID
function generateSecureRandomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// POST /get-mail - 创建临时邮箱
app.post('/get-mail', async (c) => {
  const domain = getDomain(c.env);
  const body = await c.req.json().catch(() => ({}));

  let mailId: string;
  if (body.mail) {
    mailId = body.mail.replace(/@.*$/, '');
    if (!/^[a-zA-Z0-9._-]+$/.test(mailId)) {
      return c.json({ error: 'Invalid mail format' }, 400);
    }
  } else {
    mailId = generateSecureRandomId();
  }

  const mail = `${mailId}@${domain}`;
  const key = await createJWT({ mail }, c.env.JWT_SECRET);
  return c.json({ mail, key });
});

// POST /read-mail - 读取邮件
app.post('/read-mail', async (c) => {
  try {
    const { key, mail } = await c.req.json();
    const payload = await verifyJWT(key, c.env.JWT_SECRET);

    if (payload.mail !== mail) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    // 使用 Durable Object 读取
    const id = c.env.MAIL_STORAGE.idFromName(mail);
    const stub = c.env.MAIL_STORAGE.get(id);
    const response = await stub.fetch(`https://fake-host/?mail=${encodeURIComponent(mail)}`);
    const data = await response.text();

    if (!data || data === '{"status":"empty"}') {
      return c.json({ status: 'empty' });
    }

    const emailData = JSON.parse(data);
    return c.json({ status: 'received', ...emailData });
  } catch (error) {
    return c.json({ error: 'Invalid request' }, 400);
  }
});

// GET /check - 健康检查
app.get('/check', (c) => c.text('healthy'));

export default app;
