const express = require('express');
const { register, login } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middleware/validators/authValidators');
const handleValidation = require('../middleware/validators/handleValidation');

const router = express.Router();

router.post('/register', registerValidation, handleValidation, register);
router.post('/login', loginValidation, handleValidation, login);

module.exports = router;
