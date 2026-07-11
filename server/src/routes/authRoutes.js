const express = require('express');
const {
  register,
  login,
  me,
  updateProfile,
  changePassword,
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

module.exports = router;
