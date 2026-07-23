const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const zlib = require('zlib');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/proxy', (req, res, next) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URLが指定されていません。例: /proxy?url=https://example.com');
    }

    let targetObj;
    try {
        targetObj = new URL(targetUrl);
    } catch (e) {
        return res.status(400).send('無効なURLです。');
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

            const contentType = proxyRes.headers['content-type'] || '';
            
            if (contentType.includes('text/html')) {
                const _write = res.write;
                const _end = res.end;
                let chunks = [];

                res.write = function (chunk) {
                    if (chunk) chunks.push(chunk);
                };

                res.end = function (chunk) {
                    if (chunk) chunks.push(chunk);
                    let body = Buffer.concat(chunks);
                    const encoding = proxyRes.headers['content-encoding'];

                    const processBody = (htmlBuffer) => {
                        let html = htmlBuffer.toString('utf8');
                        const baseOrigin = targetObj.origin;
                        const proxyPrefix = '/proxy?url=';

                        // 1. 相対パス（hrefやsrc）をプロキシ経由に書き換え
                        html = html.replace(/(href|src|action)=["'](\/[^"']+)["']/g, (match, attr, path) => {
                            return `${attr}="${proxyPrefix}${encodeURIComponent(baseOrigin + path)}"`;
                        });

                        // 2. ページ内のリンククリックをフックしてプロキシ経由で開くスクリプトの埋め込み
                        const interceptScript = `
                        <script>
                            document.addEventListener('click', function(e) {
                                let target = e.target.closest('a');
                                if (target && target.href) {
                                    e.preventDefault();
                                    let href = target.getAttribute('href');
                                    let absoluteUrl = target.href;
                                    
                                    if (href && href.startsWith('/')) {
                                        absoluteUrl = "${baseOrigin}" + href;
                                    }
                                    
                                    window.location.href = "/proxy?url=" + encodeURIComponent(absoluteUrl);
                                }
                            }, true);
                        </script>
                        `;

                        if (html.includes('</body>')) {
                            html = html.replace('</body>', interceptScript + '</body>');
                        } else {
                            html += interceptScript;
                        }

                        const buf = Buffer.from(html, 'utf8');
                        res.setHeader('Content-Length', buf.length);
                        _write.call(res, buf);
                        _end.call(res);
                    };

                    if (encoding === 'gzip') {
                        zlib.gunzip(body, (err, decoded) => {
                            if (err) { _write.call(res, body); _end.call(res); }
                            else { processBody(decoded); }
                        });
                    } else if (encoding === 'deflate') {
                        zlib.inflate(body, (err, decoded) => {
                            if (err) { _write.call(res, body); _end.call(res); }
                            else { processBody(decoded); }
                        });
                    } else {
                        processBody(body);
                    }
                };
            }
        }
    })(req, res, next);
});

app.listen(PORT, () => {
    console.log(`プロキシサーバーが起動しました: http://localhost:${PORT}`);
});
