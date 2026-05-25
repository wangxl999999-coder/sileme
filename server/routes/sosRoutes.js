const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const sosController = require('../controllers/sosController');

router.post('/trigger', auth, sosController.triggerSOS);

router.post('/resolve/:sosId', auth, sosController.resolveSOS);
router.put('/:sosId/resolve', auth, sosController.resolveSOS);

router.get('/history', auth, sosController.getSOSHistory);
router.get('/', auth, sosController.getSOSHistory);

router.get('/active', auth, sosController.getActiveSOS);

module.exports = router;
