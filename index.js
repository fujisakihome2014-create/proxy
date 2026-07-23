const express = require('express');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const { epoxyPath } = require('@mercuryworkshop/epoxy-sw');
const { baremuxPath } = require('@mercuryworkshop/bare-mux');
const { uvMiddleware } = require('@titaniumnetwork-dev/ultraviolet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Ultravioletの静的ファイルを配信
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uv/', express.static(uvPath));
app.use('/epoxy/', express.static(epoxyPath));
app.use('/bare-mux/', express.static(baremuxPath));

// UVのプロキシミドルウェアを適用
app.use('/service/', uvMiddleware);

app.listen(PORT, () => {
    console.log(`Ultravioletサーバー起動: http://localhost:${PORT}`);
});
