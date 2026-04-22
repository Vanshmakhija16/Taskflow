const express = require('express');
const { authenticate } = require('../../middleware/auth.middleware');
const { getNotifications, markRead } = require('./notifications.controller');

const router = express.Router();
router.use(authenticate);

router.get('/',       getNotifications);
router.patch('/:id/read', markRead);  // id can be 'all'

module.exports = router;
