const { body } = require('express-validator');

const taskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('status')
    .optional()
    .isIn(['pendiente', 'en_progreso', 'completada'])
    .withMessage('Status must be one of: pendiente, en_progreso, completada'),
  body('priority')
    .optional()
    .isIn(['baja', 'media', 'alta'])
    .withMessage('Priority must be one of: baja, media, alta'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date'),
];

module.exports = { taskValidation };
