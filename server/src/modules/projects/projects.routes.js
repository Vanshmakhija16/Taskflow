const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireMinRole } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/error.middleware');
const { getProjects, getProject, createProject, updateProject, deleteProject, addMember, removeMember, getDashboardStats } = require('./projects.controller');

const router = express.Router();
router.use(authenticate);

router.get('/dashboard-stats', getDashboardStats);
router.get('/',          getProjects);
router.get('/:id',       getProject);
router.post('/',         [body('name').trim().notEmpty()], validate, createProject);
router.patch('/:id',     requireMinRole('manager'), updateProject);
router.delete('/:id',    requireMinRole('manager'), deleteProject);
router.post('/:id/members',              [body('user_id').isUUID()], validate, addMember);
router.delete('/:id/members/:user_id',   removeMember);

module.exports = router;
