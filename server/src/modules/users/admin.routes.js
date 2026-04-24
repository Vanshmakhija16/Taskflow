const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/error.middleware');
const {
  getAdminStats,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getAllTasks,
  getActivityLog,
} = require('./admin.controller');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireRole('admin'));

router.get('/stats',        getAdminStats);
router.get('/users',        getAdminUsers);
router.post('/users',
  [
    body('email').isEmail().normalizeEmail(),
    body('full_name').trim().notEmpty(),
    body('password').isLength({ min: 8 }),
    body('role').optional().isIn(['admin', 'manager', 'employee']),
  ],
  validate,
  createAdminUser
);
router.patch('/users/:id',  updateAdminUser);
router.delete('/users/:id', deleteAdminUser);
router.get('/tasks',        getAllTasks);
router.get('/activity',     getActivityLog);

module.exports = router;
