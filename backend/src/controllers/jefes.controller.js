const { supabase } = require('../config/supabase');

const getDepartments = async (_req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const { data, error } = await supabase
    .from('cat_departamentos')
    .select('id, nombre')
    .order('id');

  if (error) {
    return res.status(500).json({ message: 'No se pudieron consultar los departamentos.', details: error.message });
  }

  return res.json({ departments: data || [] });
};

const getJefes = async (_req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const { data, error } = await supabase
    .from('jefes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ message: 'No se pudieron consultar los jefes.', details: error.message });
  }

  return res.json({ managers: data || [] });
};

const createJefe = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const { nombre, rpe, password, departamento } = req.body || {};

  if (!nombre || !rpe || !password || !departamento) {
    return res.status(400).json({ message: 'Nombre, RPE, contraseña y departamento son obligatorios.' });
  }

  const { data, error } = await supabase
    .from('jefes')
    .insert([
      {
        nombre: String(nombre).trim(),
        rpe: String(rpe).trim(),
        password: String(password),
        departamento: String(departamento).trim(),
      },
    ])
    .select();

  if (error) {
    return res.status(500).json({ message: 'No se pudo guardar el jefe.', details: error.message });
  }

  return res.status(201).json({ manager: data?.[0] || null });
};

module.exports = { getDepartments, getJefes, createJefe };
