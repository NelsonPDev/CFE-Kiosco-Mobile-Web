const express = require('express');
const { getDepartments, getJefes, createJefe } = require('../controllers/jefes.controller');

const router = express.Router();

router.get('/departamentos', getDepartments);
router.get('/', getJefes);
router.post('/', createJefe);

module.exports = router;
