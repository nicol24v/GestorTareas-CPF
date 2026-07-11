const express = require('express');
const auth = require('../middleware/auth');
const {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');
const { taskValidation } = require('../middleware/validators/taskValidators');
const handleValidation = require('../middleware/validators/handleValidation');

const router = express.Router();

router.use(auth);

router.get('/', getTasks);
router.post('/', taskValidation, handleValidation, createTask);
router.get('/:id', getTask);
router.put('/:id', taskValidation, handleValidation, updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
