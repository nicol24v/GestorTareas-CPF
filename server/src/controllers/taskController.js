const Task = require('../models/Task');
const AppError = require('../utils/AppError');

async function getTasks(req, res, next) {
  try {
    const filter = { owner: req.user.id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const { title, description, status, priority, dueDate } = req.body;
    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      owner: req.user.id,
    });
    res.status(201).json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

async function findOwnedTask(id, userId, next) {
  const task = await Task.findById(id);
  if (!task) {
    next(new AppError('Task not found', 404));
    return null;
  }
  if (task.owner.toString() !== userId) {
    next(new AppError('Not authorized to access this task', 403));
    return null;
  }
  return task;
}

async function getTask(req, res, next) {
  try {
    const task = await findOwnedTask(req.params.id, req.user.id, next);
    if (!task) return;
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const task = await findOwnedTask(req.params.id, req.user.id, next);
    if (!task) return;
    const { title, description, status, priority, dueDate } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    await task.save();
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const task = await findOwnedTask(req.params.id, req.user.id, next);
    if (!task) return;
    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTasks, createTask, getTask, updateTask, deleteTask };
