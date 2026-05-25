import server from '../dist/server/server.js';

export default async function handler(req, res) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  
  // Reconstruct the original path since Vercel's rewrite modifies req.url to /api/index.js
  let path = req.headers['x-matched-path'] || req.url;
  const queryIndex = req.url.indexOf('?');
  if (req.headers['x-matched-path'] && queryIndex !== -1) {
    path = req.headers['x-matched-path'] + req.url.slice(queryIndex);
  }
  
  const url = `${protocol}://${host}${path}`;
  console.log(`[Vercel SSR] Incoming URL: ${req.url} -> Resolved URL: ${url} (Matched Path: ${req.headers['x-matched-path'] || 'none'})`);
  
  let body = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    body = Buffer.concat(buffers);
  }
  
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }
  
  const webRequest = new Request(url, {
    method: req.method,
    headers: headers,
    body: body,
    // Node Request might not support duplex on Request, but let's add it if body exists
    duplex: body ? 'half' : undefined
  });
  
  try {
    const webResponse = await server.fetch(webRequest, {}, {});
    
    res.statusCode = webResponse.status;
    
    webResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    const responseBody = await webResponse.arrayBuffer();
    res.end(Buffer.from(responseBody));
  } catch (err) {
    console.error("Error in serverless handler:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
