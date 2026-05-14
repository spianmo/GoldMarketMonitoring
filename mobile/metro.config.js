const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const https = require('https');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

/**
 * Dev-only reverse proxy for the czbank gold-price endpoint, so the browser
 * (expo start --web) can hit it without CORS pre-flight failures. Native
 * iOS/Android targets do NOT go through this — they call the upstream URL
 * directly in src/services/fetcher.ts.
 *
 * Route: POST /__proxy/czbank/WebBank   → POST https://perbank.czbank.com/PERBANK/WebBank
 *        (body and Content-Type forwarded as-is; response bytes piped back; CORS headers appended)
 */
const PROXY_PATH = '/__proxy/czbank/WebBank';
const UPSTREAM_HOST = 'perbank.czbank.com';
const UPSTREAM_PATH = '/PERBANK/WebBank';
const UPSTREAM_REFERER = 'https://perbank.czbank.com/PERBANK/unLogon_csc.jsp';

const previousEnhance = config.server?.enhanceMiddleware;

config.server = {
  ...(config.server ?? {}),
  enhanceMiddleware: (middleware, server) => {
    const wrapped = previousEnhance ? previousEnhance(middleware, server) : middleware;
    return (req, res, next) => {
      if (!req.url || !req.url.startsWith(PROXY_PATH)) {
        return wrapped(req, res, next);
      }

      // Handle CORS preflight
      const setCors = () => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '600');
      };
      if (req.method === 'OPTIONS') {
        setCors();
        res.statusCode = 204;
        res.end();
        return;
      }

      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks);
        const proxyReq = https.request(
          {
            host: UPSTREAM_HOST,
            path: UPSTREAM_PATH,
            method: 'POST',
            headers: {
              'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
              'Content-Length': body.length,
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
              Referer: UPSTREAM_REFERER,
              Accept: 'text/html,*/*',
              'Accept-Language': 'zh-CN,zh;q=0.9',
            },
          },
          (proxyRes) => {
            setCors();
            res.statusCode = proxyRes.statusCode || 502;
            // Surface upstream content-type so client can detect GBK charset
            const ct = proxyRes.headers['content-type'];
            if (ct) res.setHeader('Content-Type', ct);
            proxyRes.pipe(res);
          },
        );
        proxyReq.on('error', (err) => {
          setCors();
          res.statusCode = 502;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(`upstream error: ${err.message}`);
        });
        proxyReq.write(body);
        proxyReq.end();
      });
    };
  },
};

module.exports = config;
