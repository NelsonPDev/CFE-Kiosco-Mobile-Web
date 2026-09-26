const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');

const normalizeText = (value) => String(value ?? '').trim();
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ''));

const findJefeByRpe = async (rpe, excludedId = null) => {
  let query = supabase
    .from('jefes')
    .select('id')
    .eq('rpe', rpe)
    .limit(1);

  if (excludedId !== null) {
    query = query.neq('id', excludedId);
  }

  return query;
};

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
    .select('id, nombre, rpe, departamento, created_at')
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

  const nombre = normalizeText(req.body?.nombre);
  const rpe = normalizeText(req.body?.rpe);
  const password = String(req.body?.password ?? '');
  const departamento = normalizeText(req.body?.departamento);

  if (!nombre || !rpe || !password || !departamento) {
    return res.status(400).json({ message: 'Nombre, RPE, contraseña y departamento son obligatorios.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const { data: existing, error: existingError } = await findJefeByRpe(rpe);
    if (existingError) {
      return res.status(500).json({ message: 'No se pudo validar el RPE.', details: existingError.message });
    }

    if (existing?.length) {
      return res.status(409).json({ message: 'Ya existe un jefe con ese RPE.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { data, error } = await supabase
      .from('jefes')
      .insert([{ nombre, rpe, password: passwordHash, departamento }])
      .select();

    if (error) {
      return res.status(500).json({ message: 'No se pudo guardar el jefe.', details: error.message });
    }

    return res.status(201).json({ manager: data?.[0] || null });
  } catch (error) {
    console.error('Error creando jefe en Supabase:', error.message);
    return res.status(500).json({ message: 'No se pudo guardar el jefe.' });
  }
};

const updateJefe = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const id = req.params.id;
  const nombre = normalizeText(req.body?.nombre);
  const rpe = normalizeText(req.body?.rpe);
  const departamento = normalizeText(req.body?.departamento);
  const password = String(req.body?.password ?? '');

  if (!id || !nombre || !rpe || !departamento) {
    return res.status(400).json({ message: 'Nombre, RPE y departamento son obligatorios.' });
  }

  if (!isUuid(id)) {
    return res.status(400).json({ message: 'El identificador del jefe no es válido.' });
  }

  if (password && password.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const { data: existing, error: existingError } = await findJefeByRpe(rpe, id);
    if (existingError) {
      return res.status(500).json({ message: 'No se pudo validar el RPE.', details: existingError.message });
    }

    if (existing?.length) {
      return res.status(409).json({ message: 'Ya existe un jefe con ese RPE.' });
    }

    const updates = { nombre, rpe, departamento };
    if (password) {
      updates.password = await bcrypt.hash(password, 12);
    }

    const { data, error } = await supabase
      .from('jefes')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      return res.status(500).json({ message: 'No se pudo actualizar el jefe.', details: error.message });
    }

    if (!data?.length) {
      return res.status(404).json({ message: 'No se encontró el jefe.' });
    }

    return res.json({ manager: data[0] });
  } catch (error) {
    console.error('Error actualizando jefe en Supabase:', error.message);
    return res.status(500).json({ message: 'No se pudo actualizar el jefe.' });
  }
};

const deleteJefe = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: 'Falta el identificador del jefe.' });
  }

  if (!isUuid(id)) {
    return res.status(400).json({ message: 'El identificador del jefe no es válido.' });
  }

  try {
    const { data, error } = await supabase
      .from('jefes')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      return res.status(500).json({ message: 'No se pudo eliminar el jefe.', details: error.message });
    }

    if (!data?.length) {
      return res.status(404).json({ message: 'No se encontró el jefe.' });
    }

    return res.json({ message: 'Jefe eliminado correctamente.' });
  } catch (error) {
    console.error('Error eliminando jefe en Supabase:', error.message);
    return res.status(500).json({ message: 'No se pudo eliminar el jefe.' });
  }
};

module.exports = { getDepartments, getJefes, createJefe, updateJefe, deleteJefe };
