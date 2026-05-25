const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const checkInController = require('../controllers/checkInController');

router.post('/', auth, checkInController.checkIn);

router.get('/history', auth, checkInController.getCheckInHistory);

router.get('/stats', auth, checkInController.getCheckInStats);

module.exports = router;
