const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');

router.post('/wx-login', authController.wxLogin);

router.post('/login', [
  body('phone').notEmpty().withMessage('手机号不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
], authController.login);

router.post('/register', [
  body('phone').notEmpty().withMessage('手机号不能为空'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位')
], authController.register);

router.get('/me', auth, authController.getCurrentUser);

router.put('/profile', auth, authController.updateProfile);

module.exports = router;
