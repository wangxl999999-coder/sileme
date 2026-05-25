const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.get('/dashboard', auth, adminController.getDashboard);

router.get('/users', auth, adminController.getUserList);

router.get('/users/:userId', auth, adminController.getUserDetail);

router.post('/users/:userId/manage', auth, adminController.manageUser);

router.get('/managed-users', auth, adminController.getManagedUsers);

module.exports = router;
