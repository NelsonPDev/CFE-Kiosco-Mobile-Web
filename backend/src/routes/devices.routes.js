const express = require('express');
const { getDevices, getDeviceCatalogs, createDepartment, updateDepartment, deleteDepartment, createBrand, updateBrand, deleteBrand, createModel, updateModel, deleteModel, updateDevice, getDeviceHistory, deleteDevice } = require('../controllers/devices.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', getDevices);
router.get('/catalogs', getDeviceCatalogs);
router.post('/catalogs/departments', requireAdmin, createDepartment);
router.put('/catalogs/departments/:id', requireAdmin, updateDepartment);
router.delete('/catalogs/departments/:id', requireAdmin, deleteDepartment);
router.post('/catalogs/brands', requireAdmin, createBrand);
router.put('/catalogs/brands/:brand', requireAdmin, updateBrand);
router.delete('/catalogs/brands/:brand', requireAdmin, deleteBrand);
router.post('/catalogs/models', requireAdmin, createModel);
router.put('/catalogs/models/:id', requireAdmin, updateModel);
router.delete('/catalogs/models/:id', requireAdmin, deleteModel);
router.get('/:id/history', getDeviceHistory);
router.put('/:id', requireAdmin, updateDevice);
router.delete('/:id', requireAdmin, deleteDevice);

module.exports = router;
