const { body } = require('express-validator');

const taskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description must be at most 200 characters'),
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
