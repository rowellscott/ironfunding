var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose')
const passport = require('passport')
const session = require('express-session');
const MongoStore = require('connect-mongo')(session)
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/user');
const bcrypt = require('bcrypt');


mongoose.connect('mongodb://localhost:27017/ironfunds-development')
var index = require('./routes/index');
var authRoutes = require('./routes/authentication')
var campaignRoutes = require('./routes/campaigns')
var users = require('./routes/users');

var app = express();
app.use(expressLayouts)
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main-layout')

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret:'ironfundingdv',
  resave: false, 
  saveUninitialized: true,
  store: new MongoStore( {mongooseConnection: mongoose.connection})
}))

passport.serializeUser((user, cb)=>{
  cb(null, user.id);
});

passport.deserializeUser((id, cb)=> {
  User.findById(id, (err, user)=>{
    if (err) {return cb(err)};
    cb(null, user)
  })
})

passport.use('local-signup', new LocalStrategy(
  {passReqToCallback: true}, 
  (req, username, password, next) =>{
    process.nextTick(()=>{
      User.findOne({
        'username':username
      }, (err, user) => {
        if (err){return next(err);}

        if (user){
          return next(null, false)
        } else {
          const {username, email, description, password} =req.body
          const hashPass = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
          const newUser = new User({
            username, 
            email, 
            description, 
            password: hashPass
          });

        newUser.save((err)=>{
          if (err){next(err);}
          return next(null, newUser);
        });
      };
    });
  });
}));

passport.use('local-login', new LocalStrategy((username, password, next)=>{
    User.findOne({username}, (err, user)=> {
        if (err){
          return next(err);
        }
        if (!user){
          return next(null, false, {message: "Incorrect username"});
        }
        if(!bcrypt.compareSync(password, user.password)){
          return next(null, false, {message: "Incorrect Password"});
        }

        return next(null, user)
    })
}))

app.use(passport.initialize());
app.use(passport.session());

app.use( (req, res, next)=> {
  if (typeof(req.user) !== "undefined"){
    res.locals.userSignedIn = true;
  } else {
    res.locals.userSignedIn= false; 
  }
  next();
})
app.use('/', index);
app.use('/', authRoutes)
app.use('/campaigns', campaignRoutes)


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
