const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');

// GET /api/search?q=term
router.get('/', hospitalController.searchHospitals);

module.exports = router;
