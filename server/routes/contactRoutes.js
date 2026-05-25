const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const contactController = require('../controllers/contactController');

router.get('/', auth, contactController.getContacts);

router.post('/', [
  auth,
  body('name').notEmpty().withMessage('联系人姓名不能为空'),
  body('phone').notEmpty().withMessage('手机号不能为空').isMobilePhone('zh-CN').withMessage('请输入有效的手机号')
], contactController.addContact);

router.put('/:contactId', auth, contactController.updateContact);

router.delete('/:contactId', auth, contactController.deleteContact);

router.post('/:contactId/test', auth, contactController.testNotification);

module.exports = router;
