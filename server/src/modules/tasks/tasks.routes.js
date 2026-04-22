const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../../middleware/auth.middleware');
const { validate }     = require('../../middleware/error.middleware');
const {
  getTasks, getMyTasks, getAssignedByMe, getUserTasks,
  getTask, createTask, updateTask, updateStatus,
  deleteTask, archiveTask, reopenTask, bulkUpdate, getTaskActivity,
  assignToLocation, updateLocationCounts, getCalendar,
} = require('./tasks.controller');
const {
  getRecurring,
  completeTodayRecurring,
  uncompleteTodayRecurring,
  getRecurringHistory,
} = require('./recurring.controller');

const router = express.Router();
router.use(authenticate);

// ── Recurring tasks ──────────────────────────────────────────────────────────
// NOTE: These must be declared BEFORE /:id routes to prevent UUID collision.
router.get('/recurring', getRecurring);

// History for a specific recurring task (placed before /:id/... generic routes)
router.get(
  '/:id/recurring-history',
  [param('id').isUUID(), query('limit').optional().isInt({ min: 1, max: 90 })],
  validate,
  getRecurringHistory
);

// Mark / unmark today's completion
router.post(
  '/:id/complete-today',
  param('id').isUUID(),
  validate,
  completeTodayRecurring
);
router.delete(
  '/:id/complete-today',
  param('id').isUUID(),
  validate,
  uncompleteTodayRecurring
);

// ── Calendar ─────────────────────────────────────────────────────────────────
router.get('/calendar',
  [
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601(),
  ],
  validate,
  getCalendar
);

// ── Bulk ─────────────────────────────────────────────────────────────────────
router.post('/bulk',
  [
    body('task_ids').isArray({ min: 1 }),
    body('action').isIn(['update_status', 'delete']),
    body('payload').optional().isObject(),
  ],
  validate,
  bulkUpdate
);

// ── My / assigned-by-me ──────────────────────────────────────────────────────
router.get('/my', getMyTasks);
router.get('/assigned-by-me', getAssignedByMe);

// ── Tasks for a specific user ─────────────────────────────────────────────────
router.get('/user/:userId', param('userId').isUUID(), validate, getUserTasks);

// ── All tasks ─────────────────────────────────────────────────────────────────
router.get('/', getTasks);
router.get('/:id', param('id').isUUID(), validate, getTask);

router.post('/',
  [
    body('title').trim().notEmpty().isLength({ max: 200 }),
    body('category').optional().isIn(['trainer','general','meeting','review','other']),
    body('priority').optional().isIn(['low','medium','high']),
    body('status').optional().isIn(['pending','working','completed','blocked']),
    body('start_date').optional().isISO8601(),
    body('due_date').optional().isISO8601(),
    body('assignee_ids').optional().isArray(),
    body('assignee_ids.*').optional().isUUID(),
    body('is_recurring').optional().isBoolean(),
    body('recurrence_type').optional().isIn(['daily','weekly','monthly']),
    body('locations').optional().isArray(),
  ],
  validate,
  createTask
);

router.patch('/:id',
  [
    param('id').isUUID(),
    body('title').optional().trim().notEmpty().isLength({ max: 200 }),
    body('priority').optional().isIn(['low','medium','high']),
    body('status').optional().isIn(['pending','working','completed','blocked']),
    body('start_date').optional().isISO8601(),
    body('due_date').optional().isISO8601(),
    body('assignee_ids').optional().isArray(),
    body('assignee_ids.*').optional().isUUID(),
    body('board_position').optional().isInt({ min: 0 }),
  ],
  validate,
  updateTask
);

router.patch('/:id/status',
  [
    param('id').isUUID(),
    body('status').optional().isIn(['pending','working','completed','blocked']),
    body('board_position').optional().isInt({ min: 0 }),
  ],
  validate,
  updateStatus
);

router.delete('/:id',        param('id').isUUID(), validate, deleteTask);
router.patch('/:id/archive', archiveTask);
router.patch('/:id/reopen',  reopenTask);
router.get('/:id/activity',  getTaskActivity);

router.post('/:id/locations/:locationId/assign',
  [param('id').isUUID(), param('locationId').isUUID(), body('user_ids').isArray({ min: 1 })],
  validate,
  assignToLocation
);

router.patch('/:id/locations/:locationId/counts',
  [
    param('id').isUUID(), param('locationId').isUUID(),
    body('trainers_sent').optional().isInt({ min: 0 }),
    body('trainers_approved').optional().isInt({ min: 0 }),
  ],
  validate,
  updateLocationCounts
);

module.exports = router;
