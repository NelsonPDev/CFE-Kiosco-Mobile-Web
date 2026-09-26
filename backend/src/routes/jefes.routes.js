const express = require('express');
const { getDepartments, getJefes, createJefe, updateJefe, deleteJefe } = require('../controllers/jefes.controller');

const router = express.Router();

router.get('/departamentos', getDepartments);
router.get('/', getJefes);
router.post('/', createJefe);
router.put('/:id', updateJefe);
router.delete('/:id', deleteJefe);

module.exports = router;
