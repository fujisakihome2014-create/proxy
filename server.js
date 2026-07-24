const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/proxy', (req, res, next) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URLが指定されていません');
    }

    // プロキシミドルウェアを動的に生成して適用
    createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        router: (req) => targetUrl,
        pathRewrite: {
            '^/proxy': '',
        },
        onProxyRes: (proxyRes, req, res) => {
            // iframeで表示できるようにブロック系のヘッダーをすべて削除する
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['x-content-type-options'];
        },
        onError: (err, req, res) => {
            res.status(500).send('プロキシエラーが発生しました: ' + err.message);
        }
    })(req, res, next);
});

app.listen(PORT, () => {
    console.log(`プロキシサーバー起動: http://localhost:${PORT}`);
});
