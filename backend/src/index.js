const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth.routes');
const devicesRoutes = require('./routes/devices.routes');
const jefesRoutes = require('./routes/jefes.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/jefes', jefesRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API CFE Kiosco Mobile - Funcionando' });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
