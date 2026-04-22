const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/auth.middleware');
const { validate }     = require('../../middleware/error.middleware');
const {
  signup, login, sendOtp, verifyOtp,
  refresh, logout, forgotPassword, getMe,
} = require('./auth.controller');

const router = express.Router();

// Public
router.post('/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('full_name').optional().trim(),
  ],
  validate, signup
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate, login
);

router.post('/otp/send',
  [body('email').isEmail().normalizeEmail(), body('type').optional().isIn(['magiclink','otp'])],
  validate, sendOtp
);

router.post('/otp/verify',
  [body('email').isEmail().normalizeEmail(), body('token').notEmpty()],
  validate, verifyOtp
);

router.post('/refresh',         [body('refresh_token').notEmpty()], validate, refresh);
router.post('/forgot-password', [body('email').isEmail()], validate, forgotPassword);

// Protected
router.post('/logout', authenticate, logout);
router.get('/me',      authenticate, getMe);

module.exports = router;
