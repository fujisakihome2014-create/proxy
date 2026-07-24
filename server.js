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
        // ★重要：外部サイトやGASからの通信が遮断されないよう、一般的なブラウザからのアクセスに見せかける（偽装）
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        router: (req) => targetUrl,
        pathRewrite: {
            '^/proxy/[^/]+': '',
        },
        onProxyReq: (proxyReq, req, res) => {
            // プロキシ元特有の不自然なヘッダーを削り、安全なトンネルとして通信を通す
            proxyReq.setHeader('X-Forwarded-For', req.ip);
        },
        onProxyRes: (proxyRes, req, res) => {
            // ブロックの原因になるセキュリティヘッダーをすべて削除
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['x-content-type-options'];
            delete proxyRes.headers['strict-transport-security'];
        },
        onError: (err, req, res) => {
            res.status(500).send('プロキシ通信が遮断されたか、エラーが発生しました: ' + err.message);
        }
    })(req, res, next);
});

app.listen(PORT, () => {
    console.log(`プロキシサーバー起動: http://localhost:${PORT}`);
});
