const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/error.middleware');
const { getComments, addComment, deleteComment } = require('./comments.controller');

const router = express.Router();
router.use(authenticate);

router.get('/:task_id',   getComments);
router.post('/',          [body('content').trim().notEmpty().isLength({ max: 2000 })], validate, addComment);
router.delete('/:comment_id',  deleteComment);

module.exports = router;
