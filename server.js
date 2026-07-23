const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/proxy', (req, res, next) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URLが指定されていません。例: /proxy?url=https://example.com');
    }

    // URLの形式チェック
    try {
        new URL(targetUrl);
    } catch (e) {
        return res.status(400).send('無効なURL形式です。');
    }

    createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        xfwd: true,
        onProxyReq: (proxyReq, req, res) => {
            // 一般的なブラウザのUser-Agentを設定してブロックを回避
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
            proxyReq.setHeader('Accept-Language', 'ja,en-US;q=0.9,en;q=0.8');
        },
        onProxyRes: (proxyRes, req, res) => {
            // iframe表示をブロックするセキュリティヘッダを徹底的に削除
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['content-security-policy-report-only'];
            delete proxyRes.headers['x-content-type-options'];
            delete proxyRes.headers['strict-transport-security'];

            // CORS制限を解除
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = '*';
        },
        onError: (err, req, res) => {
            console.log('Proxy Error:', err);
            res.writeHead(500, {
                'Content-Type': 'text/plain; charset=utf-8'
            });
            res.end('プロキシ処理中にエラーが発生しました。URLを確認してください。');
        }
    })(req, res, next);
});

app.listen(PORT, () => {
    console.log(`サーバー起動: http://localhost:${PORT}`);
});
