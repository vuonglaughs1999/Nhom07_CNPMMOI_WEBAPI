var express = require('express');
var app = express();
var cors = require('cors');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var User = require("./app/models/user");
var SocialUser = require("./app/models/socialuser");
var port = process.env.port || 8080;
var jwt = require('jsonwebtoken');
var superSecret = 'toihocmean';
const request = require('request');

const dbConnectionUrl = "mongodb+srv://tamst09:Tamls_1999@cluster0.tevp8.mongodb.net/qlsinhvien?retryWrites=true&w=majority";


app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    res.setHeader("Access-Control-Allow-Methods", "POST, PUT, GET, OPTIONS, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With,observe");
    res.setHeader("Access-Control-Max-Age", "3600");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Expose-Headers", "Authorization");
    next();
});
app.use(morgan('dev'));

mongoose.Promise = global.Promise;
mongoose.connect(dbConnectionUrl);
mongoose.set('useCreateIndex', true);

app.get('/', function (req, res) {
    res.send('Homepage');
});

var apiRouter = express.Router();

apiRouter.post('/authenticate', function (req, res) {
    User.findOne({
        username: req.body.username
    }).select().exec(function (err, user) {
        if (err) return res.json({
            success: false,
            msg: "Authentication failed."
        });
        else if (!user) {
            return res.json({
                success: false,
                msg: "Authentication failed. User not found."
            });
        }
        else if (user) {
            console.log('user found');
            if(!user.password){
                console.log('pass null');
                return res.json({
                    success: false,
                    msg: "Authentication failed. Invalid Password."
                });
            }
            else{
                var validPassword = user.comparePassword(req.body.password);
            }
            if (!validPassword) {
                return res.json({
                    success: false,
                    msg: "Authentication failed. Wrong password."
                });
            }
            else {
                var token = jwt.sign({
                    name: user.name,
                    username: user.username
                }, superSecret, {
                    expiresIn: '24h'
                });
                return res.json({
                    success: true,
                    msg: "User da duoc cap phat token",
                    token: token
                });
            }
        }
    });
});

apiRouter.post('/authenticate/fb', function (req, res) {
    request('https://graph.facebook.com/me?fields=first_name,last_name,email&access_token=' + req.body.fbtoken, { json: true }, (error, response) => {
        if (response.body.error) {
            return res.json({ success: false, msg: "Invalid token" });
        }
        else {
            User.findOne({
                email: response.body.email
            }).select()
                .exec(function (error, fbuser) {
                    if (error)
                        return res.json({ success: false, msg: "Invalid token" });
                    else {
                        if (!fbuser) {
                            var fbuser = new User();
                            fbuser.username = response.body.email;
                            fbuser.name = response.body.first_name + " " + response.body.last_name;
                            fbuser.email = response.body.email;
                            fbuser.socialId = response.body.id;
                            fbuser.password = null;
                            fbuser.save(function (err) {
                                if (err) {
                                    return res.json({ success: false, msg: "Error" });
                                }
                                else {
                                    var token = jwt.sign(
                                        {
                                            name: fbuser.name,
                                            email: fbuser.email
                                        },
                                        superSecret,
                                        {
                                            expiresIn: '24h'
                                        }
                                    );
                                    return res.json({
                                        success: true,
                                        msg: "User da duoc cap phat token",
                                        token: token
                                    });
                                }
                            });
                        }
                        else {
                            var token = jwt.sign(
                                {
                                    name: fbuser.name,
                                    email: fbuser.email
                                },
                                superSecret,
                                {
                                    expiresIn: '24h'
                                }
                            );
                            return res.json({
                                success: true,
                                msg: "User da duoc cap phat token",
                                token: token
                            });
                        }
                    }
                });
        }
    });
});

apiRouter.post('/authenticate/gg', function (req, res) {
    User.findOne({
        email: req.body.email
    }).select()
        .exec(function (err, ggUser) {
            if (err) throw err;
            if (!ggUser) {
                var ggUser = new User();
                ggUser.name = req.body.name;
                ggUser.email = req.body.email;
                ggUser.socialId = req.body.id;
                ggUser.username = req.body.email;
                ggUser.password = null;
                ggUser.save(function (err) {
                    if (err) {
                        if (err.code == 11000) {
                            return res.json({ success: false, msg: "Người dùng đã tồn tại" });
                        }
                        else {
                            return res.json({ success: false, msg: "Lỗi không xác định" });
                        }
                    }
                });
            }
            var token = jwt.sign(
                {
                    name: ggUser.name,
                    email: ggUser.email
                },
                superSecret,
                {
                    expiresIn: '24h'
                }
            );
            res.json({
                success: true,
                msg: "User da duoc cap phat token",
                token: token
            });
        });
});

apiRouter.use(function (req, res, next) {
    console.log('Co nguoi vao trang home');
    var token = req.body.token || req.query.token || req.header['x-access-token'];
    if (token) {
        jwt.verify(token, superSecret, function (err, decoded) {
            if (err) {
                return res.json({
                    success: false,
                    msg: "Failed to authenticate token."
                });
            }
            else {
                req.decoded = decoded;
                next();
            }
        });
    }
    else {
        return res.status(403).send({
            success: false,
            msg: "No token provided."
        });
    }
});

apiRouter.route('/users')
    .get(function (req, res) {
        User.find(function (err, users) {
            if (err) return res.send(err);
            res.json(users);
        });
    })
    .post(function (req, res) {
        var user = new User();
        user.name = req.body.name;
        user.password = req.body.password;
        user.username = req.body.username;
        user.email = req.body.email;
        user.save(function (err) {
            if (err) {
                if (err.code == 11000) { return res.json({ success: false, msg: "Người dùng đã tồn tại" }); }
                else {
                    return res.send(err);
                }
            }
            res.json({ success: true, msg: "Tạo mới thành công!" });
        });
    });

apiRouter.route('/users/:user_id')
    .get(function (req, res) {
        User.findById(req.params.user_id, function (err, user) {
            if (err) return res.send(err);
            res.json(user);
        });
    })
    .put(function (req, res) {
        User.findById(req.params.user_id, function (err, user) {
            if (err) return res.send(err);
            if (req.body.name) user.name = req.body.name;
            if (req.body.password) user.password = req.body.password;
            if (req.body.email) user.email = req.body.email;
            user.save(function (err) {
                if (err) return res.send(err);
                res.json({ msg: "User updated!" });
            });
        });
    })
    .delete(function (req, res) {
        User.remove({
            _id: req.params.user_id
        }, function (err, user) {
            if (err) return res.send(err);
            res.json({ msg: "Deleted user" })
        });
    });

apiRouter.get('/', function (req, res) {
    res.json({ msg: "Vi du ve API" });
})

app.use('/api', apiRouter);
app.listen(port);
console.log('Application is running at port: ' + port);