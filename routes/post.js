const router = require("express").Router();
const setup = require("../db_setup");

const sha = require("sha256");

router.get("/post/transfer", isAuthenticated, (req, res) =>{
    res.render("transfer.ejs", {user: req.session.user});
});


function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.send('<script>alert("로그인을 해야합니다."); window.location.href = "/";</script>');
    }
}

module.exports = router;