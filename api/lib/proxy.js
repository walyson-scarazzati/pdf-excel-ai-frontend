const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function buildTargetUrl(base, path, reqUrl) {
  const cleanBase = base.replace(/\/+$/, '');
  const upstreamBase = new URL(cleanBase);
  const normalizedBasePath = upstreamBase.pathname.replace(/\/+$/, '');
  const upstreamPrefix = normalizedBasePath && normalizedBasePath !== '/' ? normalizedBasePath : '/api';
  const queryIndex = reqUrl.indexOf('?');
  const query = queryIndex >= 0 ? reqUrl.slice(queryIndex) : '';
  const normalizedPath = path.replace(/^\/+/, '');
  return `${upstreamBase.origin}${upstreamPrefix}/${normalizedPath}${query}`;
}

async function proxyToPath(req, res, path) {
  const base = process.env.BACKEND_URL;
  if (!base) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'BACKEND_URL nao definida' }));
    return;
  }

  try {
    const targetUrl = buildTargetUrl(base, path, req.url || '');

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      const key = k.toLowerCase();
      if (key === 'host' || key === 'content-length' || HOP_BY_HOP.has(key)) {
        continue;
      }
      headers[k] = v;
    }

    const method = req.method || 'GET';
    const hasBody = method !== 'GET' && method !== 'HEAD';
    const body = hasBody ? await readRawBody(req) : undefined;

    const upstream = await fetch(targetUrl, { method, headers, body });

    res.statusCode = upstream.status;
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const data = Buffer.from(await upstream.arrayBuffer());
    res.end(data);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Falha no proxy',
        detail: err && err.message ? err.message : String(err)
      })
    );
  }
}

module.exports = { proxyToPath };
