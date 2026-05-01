const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');

router.get('/cities', hospitalController.getAllCities);
router.get('/search', hospitalController.searchHospitals);
router.get('/', hospitalController.getAllHospitals);
router.get('/:id', hospitalController.getHospitalById);
router.post('/filter', hospitalController.filterHospitals);
router.get('/city/:city', hospitalController.getHospitalsByCity);
router.get('/specialization/:spec', hospitalController.getHospitalsBySpecialization);

module.exports = router;
