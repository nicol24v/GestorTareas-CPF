const express = require('express');
const { register, login, me } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middleware/validators/authValidators');
const handleValidation = require('../middleware/validators/handleValidation');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerValidation, handleValidation, register);
router.post('/login', loginValidation, handleValidation, login);
router.get('/me', auth, me);

module.exports = router;
