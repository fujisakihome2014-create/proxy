const express = stripped_express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// すべてのリクエストをインターセプトして高度にプロキシする
app.use('/proxy/', (req, res, next) => {
    // パスから実際のターゲットURLを取り出す
    const targetUrl = req.url.startsWith('/') ? req.url.slice(1) : req.url;
    
    if (!targetUrl) {
        return res.status(400).send('URLが指定されていません。');
    }

    let decodedUrl = targetUrl;
    if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
        decodedUrl = 'https://' + decodedUrl;
    }

    createProxyMiddleware({
        target: decodedUrl,
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        onProxyReq: (proxyReq, req, res) => {
            // 本物のブラウザになりすます
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
            proxyReq.setHeader('Accept-Language', 'ja,en-US;q=0.9,en;q=0.8');
        },
        onProxyRes: (proxyRes, req, res) => {
            // あらゆるブロックヘッダーを削除
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['content-security-policy-report-only'];
            delete proxyRes.headers['x-content-type-options'];
            delete proxyRes.headers['strict-transport-security'];

            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = '*';
        }
    })(req, res, next);
});

app.listen(PORT, () => {
    console.log(`サーバー起動: http://localhost:${PORT}`);
});
