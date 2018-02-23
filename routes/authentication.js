const express = require('express');
const passport = require('passport')
const router = express.Router()

router.get('/signup', (req, res) =>{
  res.render('authentication/signup')
});

router.post('/signup', passport.authenticate('local-signup', {
  successRedirect: '/',
  failureRedirect : '/signup'
}));

module.exports = router