// Base64URL 编码
function base64url(input: string | ArrayBuffer): string {
  const str = typeof input === 'string'
    ? btoa(input)
    : btoa(String.fromCharCode(...new Uint8Array(input)));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// 使用 HMAC-SHA256 签名
async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64url(signature);
}

// 创建 JWT
export async function createJWT(payload: any, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ...payload,
    iat: now,
    exp: now + 86400,
    jti: crypto.randomUUID()
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(claims));
  const signature = await hmacSign(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// 验证 JWT
export async function verifyJWT(token: string, secret: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // 验证 HMAC 签名
  const expectedSignature = await hmacSign(`${encodedHeader}.${encodedPayload}`, secret);
  if (signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }

  // 验证 header
  const header = JSON.parse(atob(encodedHeader.replace(/-/g, '+').replace(/_/g, '/')));
  if (header.alg !== 'HS256') {
    throw new Error('Invalid algorithm');
  }

  // 验证 payload
  const claims = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));
  if (claims.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return claims;
}
