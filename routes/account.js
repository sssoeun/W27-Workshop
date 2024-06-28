const router = require('express').Router();
const setup = require('../db_setup');

const sha = require('sha256');

//회원가입 화면 보기
router.get('/account/enter', (req, res) => {
  res.render('enter.ejs');
});

//회원 가입 처리
router.post('/account/save', async (req, res) => {
  // console.log(req.body);
  const {mongodb, mysqldb} = await setup();

  // 비밀번호 길이 확인
  if (req.body.userpw.length < 5) {
    return res.render('enter.ejs', { data: { pwMsg: '비밀번호를 5글자 이상으로 설정해주세요.' } });
  }

  mongodb.collection('account')
    .findOne({userid:req.body.userid})
    .then(result => {
      //중복 상태일 경우
      if (result) {
        //수정
        res.render('enter.ejs', {data:{msg:'다른 ID를 사용해 주세요.'}});
      } else {
        const generateSalt = (length = 16) => {
          //내장 모듈 crypto  가져오기
          const crypto = require('crypto');
          //16진수 스타일로 만들기
          return crypto.randomBytes(length).toString('hex');
        };

        const salt = generateSalt();
        console.log(req.body);
        //passworwd 암호화
        req.body.userpw = sha(req.body.userpw + salt);
        mongodb.collection('account')
          .insertOne(req.body)
          .then(result => {
            if(result) {
              console.log("회원가입 성공");
              const sql = `insert into usersalt(userid, salt)
              values(?,?)`
              mysqldb.query(sql, [req.body.userid, salt], 
                (err, rows, fields) => {
                  if(err) {
                    console.log(err);
                  } else {
                    console.log("salt 저장 성공");
                  }
                });
                res.redirect('/');
            } else {
              console.log("회원가입 fail");
              res.render('enter.ejs', {data:{alertMsg:'회원 가입 실패'}});
            }
          })
          .catch(err => {
              console.log(err);
              res.render('enter.ejs', {data:{alertMsg:'회원 가입 실패'}});
          });
      }
    })
    .catch(err => {
      console.log(err);
      res.render('enter.ejs', {data:{alertMsg:'회원 가입 실패'}});
  });
});

//다른 라우터 등록 -> 로그인 처리
router.post('/account/login', async (req, res) => {
  console.log(req.body);
  //db 연결
  const { mongodb, mysqldb } = await setup();
  mongodb.collection('account')
    .findOne({userid: req.body.userid})
    .then(result => {
      if(result){
        const sql = `select salt from usersalt where userid=?`;
        mysqldb.query(sql, [req.body.userid], 
          (err, rows, fields) => {
            const salt = rows[0].salt;
            const hashPw = sha(req.body.userpw + salt);
            if(result.userpw == hashPw){
              //login ok
              req.body.userpw = hashPw;
              req.session.user = req.body; //serialize
              res.cookie('uid', req.body.userid);
              res.render('index.ejs');
            } else {
              //pw fail
              res.render('index.ejs', {data:{alertMsg:'다시 로그인해주세요.'}});
            }
          });
      } else {
        // login fail (id자체를 찾지 못함)
        res.render('index.ejs', {data:{alertMsg:'다시 로그인해주세요.'}});
      }
    })
    .catch(err => {
      //login fail
      res.render('index.ejs', {data:{alertMsg:'다시 로그인해주세요.'}});
    });
});

router.get('/account/logout', (req, res) => {
  req.session.destroy();
  res.render('index.ejs');
});

module.exports = router;