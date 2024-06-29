const router = require("express").Router();
const setup = require("../db_setup");

const sha = require("sha256");

router.get("/post/transfer", isAuthenticated, async (req, res) => {
    const { mongodb } = await setup();
    const user = await mongodb.collection('account').findOne({ userid: req.session.user.userid });
    const userAsset = user ? user.asset : 0;
    res.render("transfer.ejs", { user: req.session.user, asset: userAsset });
});


function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.send('<script>alert("로그인을 해야합니다."); window.location.href = "/";</script>');
    }
}

module.exports = router;