const { supabase } = require('../config/supabase');

const normalizeStatus = (status) => {
  if (!status) return 'En línea';
  const value = String(status).toLowerCase();

  if (['online', 'en linea', 'activo', 'ok'].includes(value)) return 'En línea';
  if (['offline', 'fuera de linea', 'inactivo', 'error'].includes(value)) return 'Fuera de línea';

  return status;
};

const normalizePosition = (row) => {
  if (Array.isArray(row.position) && row.position.length === 2) {
    return row.position;
  }

  if (typeof row.position === 'string') {
    const [lat, lng] = row.position.split(',').map((value) => Number(value.trim()));
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return [lat, lng];
  }

  const lat = Number(row.latitude ?? row.lat ?? row.latitud);
  const lng = Number(row.longitude ?? row.lng ?? row.longitud ?? row.lon);

  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    return [lat, lng];
  }

  return [19.4326, -99.1332];
};

const pickFirstValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return value;
    }
  }

  return null;
};

const normalizeInventory = (value) => {
  if (value === null || value === undefined) return 'N/A';
  const text = String(value).trim();
  if (!text) return 'N/A';
  const withoutPrefix = text.replace(/^kiosco\s*/i, '').trim();
  return withoutPrefix || 'N/A';
};

const normalizeImei = (value) => {
  if (value === null || value === undefined) return 'N/A';
  const text = String(value).trim();
  if (!text) return 'N/A';
  const digits = text.replace(/\D+/g, '');
  return digits || 'N/A';
};

const resolveModelData = (row, modelosMap) => {
  const modelRow = row?.modelo_id !== null && row?.modelo_id !== undefined
    ? modelosMap[row.modelo_id]
    : null;

  const brand = modelRow?.marca ?? row?.marca ?? 'Sin marca';
  const model = modelRow?.modelo ?? row?.modelo ?? row?.model ?? 'Sin modelo';

  return {
    brand,
    model,
    modelId: modelRow?.id ?? row?.modelo_id ?? null,
  };
};

const formatDeviceRow = (row, departamentosMap, modelosMap) => {
  const inventoryValue = pickFirstValue(row, ['asset_tag', 'inventario', 'numero_inventario', 'n_inventario', 'inventory_number', 'serial', 'no_inventario', 'num_inventario', 'codigo']);
  const imeiValue = pickFirstValue(row, ['imei', 'imei_number', 'numero_imei', 'imei_tel', 'telefono_imei', 'serial_imei', 'celular_imei', 'id']);
  const inventoryNumber = normalizeInventory(inventoryValue ?? row.id ?? 'N/A');
  const imei = normalizeImei(imeiValue ?? 'N/A');
  const modelInfo = resolveModelData(row, modelosMap);

  return {
    databaseId: row.id ?? null,
    id: imei !== 'N/A' ? imei : (row.id ?? inventoryNumber),
    name: inventoryNumber,
    displayName: inventoryNumber || 'N/A',
    imei,
    inventoryNumber,
    status: normalizeStatus(row.location_enabled === true ? 'En línea' : 'Fuera de línea'),
    location: departamentosMap[row.departamento_id] ?? row.location ?? 'Sin ubicación',
    departmentId: row.departamento_id ?? null,
    position: normalizePosition(row),
    phoneNumber: row.phone_number ?? '+52 000 000 0000',
    brand: modelInfo.brand,
    model: modelInfo.model,
    modelId: modelInfo.modelId,
    workerName: row.worker_name ?? 'Sin asignar',
    workerRpe: row.worker_rpe ?? 'N/A',
    role: row.worker_position ?? row.role ?? row.puesto ?? row.cargo ?? row.worker_role ?? row.job_title ?? 'Operador',
    puesto: row.worker_position ?? row.puesto ?? row.role ?? row.cargo ?? row.worker_role ?? row.job_title ?? 'Operador',
    lastUpdate: row.updated_at ?? 'Sin fecha',
  };
};

const getDevices = async (_req, res) => {
  if (!supabase) {
    return res.status(503).json({
      message: 'Falta la configuración de Supabase. Agrega SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  try {
    const [{ data: kiosks, error: kiosksError }, { data: departamentos = [] }, { data: modelos = [] }] = await Promise.all([
      supabase.from('kioscos').select('*'),
      supabase.from('cat_departamentos').select('id, nombre'),
      supabase.from('cat_marcas_modelos').select('id, marca, modelo'),
    ]);

    if (kiosksError) {
      return res.status(500).json({ message: 'No fue posible consultar los kioscos en Supabase.', details: kiosksError.message });
    }

    const departamentosMap = Object.fromEntries(
      departamentos.map((item) => [item.id, item.nombre]),
    );

    const modelosMap = Object.fromEntries(
      modelos.map((item) => [item.id, item]),
    );

    const devices = (kiosks || []).map((row) => formatDeviceRow(row, departamentosMap, modelosMap));
    return res.json({ devices });
  } catch (error) {
    console.error('Error consultando dispositivos de Supabase:', error.message);
    return res.status(500).json({ message: 'Error al consultar la base de datos.' });
  }
};

const getDeviceCatalogs = async (_req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  try {
    const [{ data: departamentos = [] }, { data: modelos = [] }] = await Promise.all([
      supabase.from('cat_departamentos').select('id, nombre').order('id'),
      supabase.from('cat_marcas_modelos').select('id, marca, modelo').order('marca'),
    ]);

    return res.json({
      departments: departamentos.map((item) => ({ id: item.id, nombre: item.nombre })),
      models: modelos.map((item) => ({
        id: item.id,
        marca: item.marca ?? '',
        modelo: item.modelo ?? '',
        label: `${item.marca || ''} ${item.modelo || ''}`.trim(),
      })),
    });
  } catch (error) {
    console.error('Error consultando catálogos de dispositivos:', error.message);
    return res.status(500).json({ message: 'No se pudieron consultar los catálogos.' });
  }
};

const createDepartment = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const nombre = String(req.body?.nombre || '').trim();
  if (!nombre) {
    return res.status(400).json({ message: 'El nombre del área es obligatorio.' });
  }

  try {
    const { data: existing } = await supabase
      .from('cat_departamentos')
      .select('id, nombre')
      .ilike('nombre', nombre)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ message: 'Ese área ya existe.' });
    }

    const { data, error } = await supabase
      .from('cat_departamentos')
      .insert([{ nombre }])
      .select();

    if (error) {
      return res.status(500).json({ message: 'No se pudo crear el área.', details: error.message });
    }

    return res.status(201).json({ department: data?.[0] || null });
  } catch (error) {
    console.error('Error creando departamento en Supabase:', error.message);
    return res.status(500).json({ message: 'Error al guardar el área.' });
  }
};

const updateDepartment = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const id = req.params.id;
  const nombre = String(req.body?.nombre || '').trim();

  if (!id || !nombre) {
    return res.status(400).json({ message: 'El área y su nombre son obligatorios.' });
  }

  try {
    const { data, error } = await supabase
      .from('cat_departamentos')
      .update({ nombre })
      .eq('id', id)
      .select();

    if (error) {
      return res.status(500).json({ message: 'No se pudo actualizar el área.', details: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontró el área.' });
    }

    return res.json({ department: data[0] });
  } catch (error) {
    console.error('Error editando departamento en Supabase:', error.message);
    return res.status(500).json({ message: 'Error al editar el área.' });
  }
};

const normalizeCatalogText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const createBrand = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const marca = normalizeCatalogText(req.body?.marca);
  if (!marca) {
    return res.status(400).json({ message: 'La marca es obligatoria.' });
  }

  try {
    const { data: existing } = await supabase
      .from('cat_marcas_modelos')
      .select('id, marca, modelo')
      .ilike('marca', marca)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ message: 'Esa marca ya existe.' });
    }

    const { data, error } = await supabase
      .from('cat_marcas_modelos')
      .insert([{ marca, modelo: '' }])
      .select();

    if (error) {
      return res.status(500).json({ message: 'No se pudo crear la marca.', details: error.message });
    }

    return res.status(201).json({ brand: data?.[0] || null });
  } catch (error) {
    console.error('Error creando marca en Supabase:', error.message);
    return res.status(500).json({ message: 'Error al guardar la marca.' });
  }
};

const createModel = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const marca = normalizeCatalogText(req.body?.marca);
  const modelo = normalizeCatalogText(req.body?.modelo);

  if (!marca || !modelo) {
    return res.status(400).json({ message: 'La marca y el modelo son obligatorios.' });
  }

  try {
    const { data: existing } = await supabase
      .from('cat_marcas_modelos')
      .select('id, marca, modelo')
      .ilike('marca', marca)
      .ilike('modelo', modelo)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ message: 'Ese modelo ya existe para esa marca.' });
    }

    const { data: brandMatches } = await supabase
      .from('cat_marcas_modelos')
      .select('id, marca, modelo')
      .ilike('marca', marca)
      .limit(20);

    const sameBrandButDifferentModel = (brandMatches || []).some((item) => {
      const sameBrand = String(item.marca ?? '').replace(/\s+/g, ' ').trim().toLowerCase() === marca.toLowerCase();
      const sameModel = String(item.modelo ?? '').replace(/\s+/g, ' ').trim().toLowerCase() === modelo.toLowerCase();
      return sameBrand && !sameModel;
    });

    if (sameBrandButDifferentModel) {
      const { data, error } = await supabase
        .from('cat_marcas_modelos')
        .insert([{ marca, modelo }])
        .select();

      if (error) {
        return res.status(500).json({ message: 'No se pudo crear la marca y modelo.', details: error.message });
      }

      return res.status(201).json({ model: data?.[0] || null });
    }

    const { data, error } = await supabase
      .from('cat_marcas_modelos')
      .insert([{ marca, modelo }])
      .select();

    if (error) {
      return res.status(500).json({ message: 'No se pudo crear la marca y modelo.', details: error.message });
    }

    return res.status(201).json({ model: data?.[0] || null });
  } catch (error) {
    console.error('Error creando marca/modelo en Supabase:', error.message);
    return res.status(500).json({ message: 'Error al guardar la marca/modelo.' });
  }
};

const updateModel = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const id = req.params.id;
  const marca = normalizeCatalogText(req.body?.marca);
  const modelo = normalizeCatalogText(req.body?.modelo);

  if (!id || !marca || !modelo) {
    return res.status(400).json({ message: 'La marca y el modelo son obligatorios.' });
  }

  try {
    const { data: existing } = await supabase
      .from('cat_marcas_modelos')
      .select('id, marca, modelo')
      .neq('id', id)
      .ilike('marca', marca)
      .ilike('modelo', modelo)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ message: 'Ese modelo ya existe para esa marca.' });
    }

    const { data, error } = await supabase
      .from('cat_marcas_modelos')
      .update({ marca, modelo })
      .eq('id', id)
      .select();

    if (error) {
      return res.status(500).json({ message: 'No se pudo actualizar el modelo.', details: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontró el modelo.' });
    }

    return res.json({ model: data[0] });
  } catch (error) {
    console.error('Error editando marca/modelo en Supabase:', error.message);
    return res.status(500).json({ message: 'Error al editar la marca/modelo.' });
  }
};

const resolveDepartmentId = (name, departments = []) => {
  if (name === null || name === undefined || name === '') return null;
  const match = departments.find((item) => String(item.nombre).trim().toLowerCase() === String(name).trim().toLowerCase());
  return match ? match.id : null;
};

const resolveModelId = (brand, model, models = []) => {
  if (!brand && !model) return null;
  const match = models.find((item) => {
    const sameBrand = !brand || String(item.marca ?? '').trim().toLowerCase() === String(brand).trim().toLowerCase();
    const sameModel = !model || String(item.modelo ?? '').trim().toLowerCase() === String(model).trim().toLowerCase();
    return sameBrand && sameModel;
  });
  return match ? match.id : null;
};

const updateDevice = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const deviceId = req.params.id;
  if (!deviceId) {
    return res.status(400).json({ message: 'Falta el identificador del dispositivo.' });
  }

  try {
    const [{ data: departments = [] }, { data: models = [] }] = await Promise.all([
      supabase.from('cat_departamentos').select('id, nombre'),
      supabase.from('cat_marcas_modelos').select('id, marca, modelo'),
    ]);

    const payload = req.body || {};
    const updates = {};

    if (payload.workerName !== undefined) updates.worker_name = String(payload.workerName).trim();
    if (payload.workerRpe !== undefined) updates.worker_rpe = String(payload.workerRpe).trim();
    if (payload.role !== undefined) updates.worker_position = String(payload.role).trim();
    if (payload.puesto !== undefined) updates.worker_position = String(payload.puesto).trim();
    if (payload.phoneNumber !== undefined) updates.phone_number = String(payload.phoneNumber).trim();
    if (payload.inventoryNumber !== undefined && String(payload.inventoryNumber).trim() !== '') updates.asset_tag = String(payload.inventoryNumber).trim();

    if (payload.departmentId !== undefined || payload.departamento_id !== undefined || payload.location !== undefined) {
      const nextDepartmentId = payload.departmentId ?? payload.departamento_id ?? resolveDepartmentId(payload.location, departments);
      if (nextDepartmentId !== null && nextDepartmentId !== undefined) updates.departamento_id = nextDepartmentId;
    }

    if (payload.modelId !== undefined || payload.modelo_id !== undefined || payload.brand !== undefined || payload.model !== undefined) {
      const nextModelId = payload.modelId ?? payload.modelo_id ?? resolveModelId(payload.brand, payload.model, models);
      if (nextModelId !== null && nextModelId !== undefined) updates.modelo_id = nextModelId;
      if (payload.brand !== undefined) updates.marca = String(payload.brand).trim();
      if (payload.model !== undefined) updates.modelo = String(payload.model).trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No se enviaron cambios válidos para actualizar.' });
    }

    const { data, error } = await supabase
      .from('kioscos')
      .update(updates)
      .eq('id', deviceId)
      .select();

    if (error) {
      return res.status(500).json({ message: 'No se pudo actualizar el dispositivo.', details: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontró el dispositivo a actualizar.' });
    }

    const refreshed = formatDeviceRow(data[0], Object.fromEntries(departments.map((item) => [item.id, item.nombre])), Object.fromEntries(models.map((item) => [item.id, item])));
    return res.json({ device: refreshed });
  } catch (error) {
    console.error('Error actualizando dispositivo en Supabase:', error.message);
    return res.status(500).json({ message: 'Error al guardar en la base de datos.' });
  }
};

module.exports = { getDevices, getDeviceCatalogs, createDepartment, updateDepartment, createBrand, createModel, updateModel, updateDevice };
