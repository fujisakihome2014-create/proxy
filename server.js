const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// /proxy/ の後ろにBase64エンコードされたURLを受け取る
app.use('/proxy/:encodedUrl', (req, res, next) => {
    let targetUrl;
    try {
        // Base64をデコードして元のURLに戻す
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
        router: (req) => targetUrl,
        pathRewrite: {
            '^/proxy/[^/]+': '',
        },
        onProxyRes: (proxyRes, req, res) => {
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
