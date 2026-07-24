const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/proxy/:encodedUrl', (req, res, next) => {
    let targetUrl;
    try {
        targetUrl = Buffer.from(req.params.encodedUrl, 'base64').toString('utf8');
    } catch (e) {
        return res.status(400).send('無効なURLエンコードです');
    }

    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
        return res.status(400).send('有効なURLが指定されていません');
    }

    createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        // 一般的なブラウザになりすましてブロックを回避
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        router: (req) => targetUrl,
        pathRewrite: {
            '^/proxy/[^/]+': '',
        },
        onProxyReq: (proxyReq, req, res) => {
            proxyReq.setHeader('X-Forwarded-For', req.ip);
        },
        onProxyRes: (proxyRes, req, res) => {
            // 1. iframeブロックやセキュリティ制限をすべて解除
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['x-content-type-options'];
            delete proxyRes.headers['strict-transport-security'];
            delete proxyRes.headers['permissions-policy'];

            // 2. CORS制限を完全にフリーにして読み込みエラーを防ぐ
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');

            // 3. Cookieがプロキシ経由でも保存・動作するように調整
            if (proxyRes.headers['set-cookie']) {
                proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(cookie => {
                    return cookie.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=[^\;]+/gi, '; SameSite=None; Secure');
                });
            }
        },
        onError: (err, req, res) => {
            res.status(500).send('プロキシ通信エラー: ' + err.message);
        }
    })(req, res, next);
});

app.listen(PORT, () => {
    console.log(`プロキシサーバー起動: http://localhost:${PORT}`);
});
