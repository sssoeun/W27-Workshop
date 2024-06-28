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
  mongodb.collection('account')
    .findOne({userid:req.body.userid})
    .then(result => {
      //중복 상태일 경우
      if (result) {
        res.render('enter.ejs', {data:{msg:'ID가 중복되었습니다.'}});
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

router.post('/account/transfer', async (req, res) => {
    const { mongodb } = await setup();
    const action = req.body.action; // 폼에서 전송된 action 값 확인

    mongodb.collection("account")
        .findOne({ userid: req.session.user.inputID })
        .then(result => {
            if (!result) {
                console.log("User not found");
                return res.status(404).send("User not found");
            }

            console.log("전송 db 확인");
            console.log(result);
            console.log("db값 확인");

            let money = parseInt(req.body.money, 10);
            let asset = parseInt(result.ASSET, 10);

            if (isNaN(money) || isNaN(asset)) {
                console.log("Invalid input : Not a number");
                return res.status(400).send("Invalid input");
            }

            console.log("입력된 돈 : ", money);
            console.log("입력된 자산: ", asset);
            if (action === 'transfer') {
                console.log("이체 시작");
                if (asset < money) {
                    console.log("보유하신 금액 초과입니다");
                    return res.status(400).send("보유하신 금액 초과입니다.");
                } else {
                    console.log("입금 시작");
                    mongodb.collection("account")
                        .findOne({ userid: req.body.reciver })
                        .then(async (receiver) => {
                            if (!receiver) {
                                console.log("Receiver not found");
                                return res.status(404).send("Receiver not found");
                            }

                            let senderNewAsset = asset - money;
                            let receiverNewAsset = parseInt(receiver.ASSET, 10) + money;

                            const bulkOps = [
                                {
                                    updateOne: {
                                        filter: { userid: req.session.user.inputID },
                                        update: { $set: { ASSET: senderNewAsset } }
                                    }
                                },
                                {
                                    updateOne: {
                                        filter: { userid: req.body.reciver },
                                        update: { $set: { ASSET: receiverNewAsset } }
                                    }
                                }
                            ];

                            try {
                                const sendDB = await mongodb.collection("account").bulkWrite(bulkOps);
                                console.log("송금 완료");
                                res.send('<script>alert("송금이 완료 되었습니다."); window.location.href = "/";</script>');
                            } catch (err) {
                                console.log("Receiver find error:", err);
                                res.status(500).send("Internal Server Error");
                            }
                        });
                }
            } else if (action === 'deposit') {
                asset += money;
                mongodb.collection("account").updateOne(
                    { userid: req.session.user.inputID },
                    { $set: { ASSET: asset } }
                ).then(result => {
                    console.log("입금 완료");
                    res.send('<script>alert("입금이 완료 되었습니다."); window.location.href = "/";</script>');
                }).catch(err => {
                    console.log("Update error:", err);
                    res.status(500).send("Internal Server Error");
                });
            } else {
                console.log("잘못된 요청입니다.");
                res.status(400).send("잘못된 요청입니다.");
            }
        })
        .catch((err) => {
            console.log("DB error:", err);
            res.status(500).send("Internal Server Error");
        });
});



module.exports = router;