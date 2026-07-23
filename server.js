const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/proxy', (req, res, next) => {
    const encodedUrl = req.query.url;
    if (!encodedUrl) {
        return res.status(400).send('URLが指定されていません。');
    }

    let targetUrl;
    try {
        // Base64でエンコードされたURLをデコードする
        targetUrl = Buffer.from(encodedUrl, 'base64').toString('utf8');
        // URLとしての正当性をチェック
        new URL(targetUrl);
    } catch (e) {
        return res.status(400).send('無効な暗号化URLです。');
    }

    createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        onProxyReq: (proxyReq, req, res) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        },
        onProxyRes: (proxyRes, req, res) => {
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['content-security-policy-report-only'];
            delete proxyRes.headers['x-content-type-options'];
            
            proxyRes.headers['access-control-allow-origin'] = '*';
        }
    })(req, res, next);
});

app.listen(PORT, () => {
    console.log(`サーバー起動: http://localhost:${PORT}`);
});
