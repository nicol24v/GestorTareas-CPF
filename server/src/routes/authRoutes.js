const express = require('express');
const passport = require('passport');
const {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  googleCallback,
} = require('../controllers/authController');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
} = require('../middleware/validators/authValidators');
const handleValidation = require('../middleware/validators/handleValidation');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerValidation, handleValidation, register);
router.post('/login', loginValidation, handleValidation, login);
router.get('/me', auth, me);
router.put('/me', auth, updateProfileValidation, handleValidation, updateProfile);
router.put('/password', auth, changePasswordValidation, handleValidation, changePassword);

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

module.exports = router;
