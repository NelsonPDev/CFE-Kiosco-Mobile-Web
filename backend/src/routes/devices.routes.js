const express = require('express');
const { getDevices, getDeviceCatalogs, createDepartment, updateDepartment, deleteDepartment, createBrand, updateBrand, deleteBrand, createModel, updateModel, deleteModel, updateDevice, getDeviceHistory, deleteDevice } = require('../controllers/devices.controller');

const router = express.Router();

router.get('/', getDevices);
router.get('/catalogs', getDeviceCatalogs);
router.post('/catalogs/departments', createDepartment);
router.put('/catalogs/departments/:id', updateDepartment);
router.delete('/catalogs/departments/:id', deleteDepartment);
router.post('/catalogs/brands', createBrand);
router.put('/catalogs/brands/:brand', updateBrand);
router.delete('/catalogs/brands/:brand', deleteBrand);
router.post('/catalogs/models', createModel);
router.put('/catalogs/models/:id', updateModel);
router.delete('/catalogs/models/:id', deleteModel);
router.get('/:id/history', getDeviceHistory);
router.put('/:id', updateDevice);
router.delete('/:id', deleteDevice);

module.exports = router;
