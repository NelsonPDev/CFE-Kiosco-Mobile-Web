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

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'El cuerpo de la solicitud no contiene JSON válido.' });
  }

  console.error('Error no controlado en la API:', error.message);
  return res.status(500).json({ message: 'Error interno del servidor.' });
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API CFE Kiosco Mobile - Funcionando' });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
