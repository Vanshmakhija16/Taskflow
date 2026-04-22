const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/error.middleware');
const { getUsers, getUser, updateUser, updateMe, deleteUser } = require('./users.controller');

const router = express.Router();
router.use(authenticate);

router.get('/',         getUsers);   // any authenticated user (assignment dropdowns)
router.get('/me',       updateMe);   // GET own profile handled by auth /me
router.patch('/me',     updateMe);
router.get('/:id',      getUser);
router.patch('/:id',    requireRole('admin'), body('role').optional().isIn(['admin', 'manager', 'employee']), validate, updateUser);
router.delete('/:id',   requireRole('admin'), deleteUser);

module.exports = router;
