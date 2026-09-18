const express = require('express');
const { getDevices, getDeviceCatalogs, createDepartment, updateDepartment, createBrand, createModel, updateModel, updateDevice } = require('../controllers/devices.controller');

const router = express.Router();

router.get('/', getDevices);
router.get('/catalogs', getDeviceCatalogs);
router.post('/catalogs/departments', createDepartment);
router.put('/catalogs/departments/:id', updateDepartment);
router.post('/catalogs/brands', createBrand);
router.post('/catalogs/models', createModel);
router.put('/catalogs/models/:id', updateModel);
router.put('/:id', updateDevice);

module.exports = router;
