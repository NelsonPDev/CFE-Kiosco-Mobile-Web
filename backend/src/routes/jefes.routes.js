const express = require('express');
const { getDepartments, getJefes, createJefe, updateJefe, deleteJefe } = require('../controllers/jefes.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.get('/departamentos', getDepartments);
router.get('/', getJefes);
router.post('/', createJefe);
router.put('/:id', updateJefe);
router.delete('/:id', deleteJefe);

module.exports = router;
