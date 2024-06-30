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
        res.send('<script>alert("서버 오류가 발생했습니다."); window.location.href = "/board/list";</script>');
    }
});

async function list(mongodb, req, res) {
    const page = parseInt(req.query.page) || 1; //URL 쿼리에서 페이지 번호를 가져옴, 기본값 1.
    const limit = 5; // 한 페이지에 표시할 게시글 수
    const skip = (page - 1) * limit; // 건너뛸 문서의 수 계산
    try {
        // 전체 게시글 수 계산
        const totalPosts = await mongodb.collection("post").countDocuments();
        // 총 페이지 수 계산
        const totalPages = Math.ceil(totalPosts / limit);

        const result = await mongodb
            .collection("post")
            .find()
            .sort({ date: -1 }) // 날짜 기준 내림차순 정렬 (최신글 먼저)
            .skip(skip) // 페이지네이션: 이전 페이지의 게시글들을 건너뜀
            .limit(limit) // 페이지네이션: 지정된 수만큼만 가져옴
            .toArray(); // 결과를 배열로 변환

        res.render("boardlist.ejs", { 
            data: result, // 조회된 게시글 데이터
            currentPage: page, // 현재 페이지 번호
            totalPages: totalPages, // 전체 페이지 수
            currentUser: req.session.user // 현재 로그인한 사용자 정보
        });
    } catch (err) {
        // 오류 처리
        console.error("데이터 조회 중 오류 발생:", err);
        res.status(500).send({ message: '서버 오류' });
    }
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