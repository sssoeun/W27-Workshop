const router = require("express").Router();
const setup = require("../db_setup");
const { ObjectId } = require("mongodb");
const sha = require("sha256");

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.send('<script>alert("로그인을 해야합니다."); window.location.href = "/";</script>');
    }
}

//게시판 리스트
router.get("/board/list", isAuthenticated, async (req, res) => {
    try {
        const { mongodb } = await setup();
        list(mongodb, req, res);
    } catch {
        console.error(err);
        res.status(500).send({ message: '서버 오류' });
    }

});

// 게시물 등록
router.post("/board/save", isAuthenticated, async (req, res) => {
    try {
        const { mongodb } = await setup();
        //세션에서 사용자 ID 가져오기
        const sessionUid = req.cookies.uid;
        console.log(req.body.title);
        console.log(req.body.content);
        await mongodb
            .collection("post")
            .insertOne({ title: req.body.title, content: req.body.content, date: req.body.someDate, author: sessionUid });
        console.log("데이터 추가 성공");
        // list(mongodb, req, res);
        res.redirect('/board/list');
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: '서버 오류' });
    }
});

//게시글 수정
router.post("/board/update", isAuthenticated, async (req, res) => {
    try {
        const { mongodb } = await setup();
        console.log(req.body);
        const postId = new ObjectId(req.body._id);
        //세션에서 사용자 ID 가져오기
        const sessionId = req.cookies.uid;
        const post = await mongodb.collection("post").findOne({ _id: postId });
        if (post.author !== sessionId) {
            return res.status(403).send('<script>alert("해당 글의 작성자가 아닙니다."); window.location.href="/board/list";</script>');
        }
        await mongodb
            .collection('post')
            .updateOne({ _id: new ObjectId(req.body._id) },
                { $set: { title: req.body.title, content: req.body.content, date: req.body.someDate } });
        list(mongodb, req, res);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: '서버 오류' });
    }
});

function list(mongodb, req, res) {
    mongodb
        .collection("post")
        .find()
        .toArray()
        .then((result) => {
            //console.log(result);
            return res.render("boardlist.ejs", { data: result });
        });
}

//'/board/enter' 요청에 대한 처리 루틴
router.get("/board/enter", function (req, res) {
    res.render("boardenter.ejs");
});

//게시글 삭제
router.post("/delete", isAuthenticated, async (req, res) => {
    try {
        const { mongodb } = await setup();
        const postId = new ObjectId(req.body._id);
        // 세션에서 사용자 ID 가져오기
        const sessionId = req.cookies.uid;
        const post = await mongodb
            .collection("post")
            .findOne({ _id: postId });
        if (post.author !== sessionId) {
            console.log(`Authorization failed: post.author(${post.author}) !== sessionId(${sessionId})`);
            return res.status(403).send('해당 글의 작성자가 아닙니다.');
        }
        await mongodb
            .collection("post")
            .deleteOne({ _id: postId });
        console.log("삭제완료");
        res.status(200).send();
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: '서버 오류' });
    }
});

module.exports = router;