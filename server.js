const express = require('express');
const path = require('path');
const app = express();

app.listen(8080, function () {
    console.log('8080 server ready...');
});

// 정적 파일 제공 경로 설정
app.use('/', express.static(path.join(__dirname, '/')));

app.get("/", (req, res) => {
    res.render("index.ejs");
});