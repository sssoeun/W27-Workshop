const setup = require("./db_setup");
const express = require("express");
const fs = require("fs");
const https = require("https");
const session = require("express-session");


const app = express();

const options = {
    key: fs.readFileSync("./server.key"),
    cert: fs.readFileSync("./server.cert"),
  };

app.use(session({
    secret: "암호화키",
    resave: false,
    saveUninitialized: false,
}));

//app.use('/', require('./routes/account.js'));

https.createServer(options, app).listen(process.env.WEB_PORT, async () => {
    await setup();
    console.log(`${process.env.WEB_PORT} 포트 https 서버 실행 중.. `);
});