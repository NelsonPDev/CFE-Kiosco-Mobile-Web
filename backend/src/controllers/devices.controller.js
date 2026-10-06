const { supabase } = require('../config/supabase');
const crypto = require('crypto');

const hashKioskPassword = (password) => crypto
  .createHash('sha256')
  .update(password, 'utf8')
  .digest('hex');

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
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text) return '';
  const withoutPrefix = text.replace(/^kiosco\s*/i, '').trim();
  return withoutPrefix;
};

const normalizeSerie = (value) => {
  if (value === null || value === undefined) return 'N/A';
  const text = String(value).trim();
  if (!text) return 'N/A';
  return text || 'N/A';
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
  const serieValue = pickFirstValue(row, ['serie', 'numero_serie', 'n_serie', 'serial_number', 'serie_tel', 'imei', 'imei_number', 'numero_imei', 'imei_tel', 'telefono_imei', 'serial_imei', 'celular_imei', 'id']);
  const inventoryNumber = normalizeInventory(inventoryValue ?? row.asset_tag);
  const serie = normalizeSerie(serieValue ?? row.serie ?? row.imei ?? 'N/A');
  const modelInfo = resolveModelData(row, modelosMap);
  const realIdentifier = row.serie ?? row.imei ?? row.asset_tag ?? row.id ?? null;

  return {
    databaseId: realIdentifier,
    id: serie !== 'N/A' ? serie : (row.serie ?? row.imei ?? row.asset_tag ?? row.id ?? inventoryNumber),
    name: inventoryNumber,
    displayName: inventoryNumber || 'N/A',
    serie,
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
    role: row.worker_position ?? 'Operador',
    puesto: row.worker_position ?? 'Operador',
    lastUpdate: row.updated_at ?? 'Sin fecha',
  };
};

const canAccessDevice = (device, user, departamentosMap) => {
  if (user?.role === 'admin') return true;
  const allowedDepartments = Array.isArray(user?.departamentos) ? user.departamentos : [];
  const deviceDepartment = departamentosMap[device.departamento_id] ?? device.location;
  return allowedDepartments.includes(deviceDepartment);
};

const getDevices = async (_req, res) => {
  if (!supabase) {
    return res.status(503).json({
      message: 'Falta la configuración de Supabase. Agrega SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  try {
    const [
      { data: kiosks, error: kiosksError },
      { data: departamentos, error: departmentsError },
      { data: modelos, error: modelsError },
    ] = await Promise.all([
      supabase.from('kioscos').select('*'),
      supabase.from('cat_departamentos').select('id, nombre'),
      supabase.from('cat_marcas_modelos').select('id, marca, modelo'),
    ]);

    if (kiosksError) {
      return res.status(500).json({ message: 'No fue posible consultar los kioscos en Supabase.', details: kiosksError.message });
    }

    if (departmentsError || modelsError) {
      const catalogError = departmentsError || modelsError;
      return res.status(500).json({ message: 'No fue posible consultar los catálogos en Supabase.', details: catalogError.message });
    }

    const safeKiosks = Array.isArray(kiosks) ? kiosks : [];
    const safeDepartamentos = Array.isArray(departamentos) ? departamentos : [];
    const safeModelos = Array.isArray(modelos) ? modelos : [];

    const departamentosMap = Object.fromEntries(
      safeDepartamentos.map((item) => [item.id, item.nombre]),
    );

    const modelosMap = Object.fromEntries(
      safeModelos.map((item) => [item.id, item]),
    );

    const devices = safeKiosks
      .map((row) => formatDeviceRow(row, departamentosMap, modelosMap))
      .filter((device) => canAccessDevice(device, req.user, departamentosMap));
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
    const [
      { data: departamentos, error: departmentsError },
      { data: modelos, error: modelsError },
    ] = await Promise.all([
      supabase.from('cat_departamentos').select('id, nombre').order('id'),
      supabase.from('cat_marcas_modelos').select('id, marca, modelo').order('marca'),
    ]);

    if (departmentsError || modelsError) {
      const catalogError = departmentsError || modelsError;
      return res.status(500).json({ message: 'No se pudieron consultar los catálogos.', details: catalogError.message });
    }

    const safeDepartamentos = Array.isArray(departamentos) ? departamentos : [];
    const safeModelos = Array.isArray(modelos) ? modelos : [];

    return res.json({
      departments: safeDepartamentos.map((item) => ({ id: item.id, nombre: item.nombre })),
      models: safeModelos.map((item) => ({
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

const deleteDepartment = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: 'Falta el identificador del área.' });
  }

  try {
    const { data, error } = await supabase
      .from('cat_departamentos')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      return res.status(500).json({ message: 'No se pudo eliminar el área.', details: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontró el área.' });
    }

    return res.json({ message: 'Área eliminada correctamente.' });
  } catch (error) {
    console.error('Error eliminando departamento en Supabase:', error.message);
    return res.status(500).json({ message: 'Error al eliminar el área.' });
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

const updateBrand = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const currentBrand = normalizeCatalogText(decodeURIComponent(req.params.brand || ''));
  const nextBrand = normalizeCatalogText(req.body?.marca);

  if (!currentBrand || !nextBrand) {
    return res.status(400).json({ message: 'La marca actual y la nueva marca son obligatorias.' });
  }

  try {
    const { data: existing } = await supabase
      .from('cat_marcas_modelos')
      .select('id, marca, modelo')
      .neq('marca', currentBrand)
      .ilike('marca', nextBrand)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ message: 'Ya existe otra marca con ese nombre.' });
    }

    const { data, error } = await supabase
      .from('cat_marcas_modelos')
      .update({ marca: nextBrand })
      .ilike('marca', currentBrand)
      .select();

    if (error) {
      return res.status(500).json({ message: 'No se pudo actualizar la marca.', details: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontró la marca.' });
    }

    return res.json({ brand: nextBrand, updatedRows: data.length });
  } catch (error) {
    console.error('Error actualizando marca en Supabase:', error.message);
    return res.status(500).json({ message: 'Error al editar la marca.' });
  }
};

const deleteBrand = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const currentBrand = normalizeCatalogText(decodeURIComponent(req.params.brand || ''));
  if (!currentBrand) {
    return res.status(400).json({ message: 'La marca es obligatoria.' });
  }

  try {
    const { data, error } = await supabase
      .from('cat_marcas_modelos')
      .delete()
      .ilike('marca', currentBrand)
      .select('id');

    if (error) {
      return res.status(500).json({ message: 'No se pudo eliminar la marca.', details: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontró la marca.' });
    }

    return res.json({ message: 'Marca eliminada correctamente.' });
  } catch (error) {
    console.error('Error eliminando marca en Supabase:', error.message);
    return res.status(500).json({ message: 'Error al eliminar la marca.' });
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

const deleteModel = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: 'Falta el identificador del modelo.' });
  }

  try {
    const { data, error } = await supabase
      .from('cat_marcas_modelos')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      return res.status(500).json({ message: 'No se pudo eliminar el modelo.', details: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontró el modelo.' });
    }

    return res.json({ message: 'Modelo eliminado correctamente.' });
  } catch (error) {
    console.error('Error eliminando modelo en Supabase:', error.message);
    return res.status(500).json({ message: 'Error al eliminar el modelo.' });
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
    const [
      { data: departments, error: departmentsError },
      { data: models, error: modelsError },
    ] = await Promise.all([
      supabase.from('cat_departamentos').select('id, nombre'),
      supabase.from('cat_marcas_modelos').select('id, marca, modelo'),
    ]);

    if (departmentsError || modelsError) {
      const catalogError = departmentsError || modelsError;
      return res.status(500).json({ message: 'No se pudieron validar los catálogos.', details: catalogError.message });
    }

    const safeDepartments = Array.isArray(departments) ? departments : [];
    const safeModels = Array.isArray(models) ? models : [];

    const payload = req.body || {};
    const updates = {};

    if (payload.workerName !== undefined) updates.worker_name = String(payload.workerName).trim();
    if (payload.workerRpe !== undefined) updates.worker_rpe = String(payload.workerRpe).trim();
    if (payload.role !== undefined) updates.worker_position = String(payload.role).trim();
    if (payload.puesto !== undefined && payload.role === undefined) updates.worker_position = String(payload.puesto).trim();
    if (payload.phoneNumber !== undefined) updates.phone_number = String(payload.phoneNumber).trim();
    if (payload.serie !== undefined && String(payload.serie).trim() !== '') updates.serie = String(payload.serie).trim();
    else if (payload.imei !== undefined && String(payload.imei).trim() !== '') updates.serie = String(payload.imei).trim();
    if (payload.inventoryNumber !== undefined) {
      const inventoryNumber = String(payload.inventoryNumber).trim();
      updates.asset_tag = inventoryNumber || null;
    }
    if (payload.adminPassword !== undefined) {
      const adminPassword = String(payload.adminPassword);
      if (adminPassword.length < 6) {
        return res.status(400).json({ message: 'La contraseña del modo kiosco debe tener al menos 6 caracteres.' });
      }
      updates.admin_password_hash = await hashKioskPassword(adminPassword);
    }

    if (payload.departmentId !== undefined || payload.departamento_id !== undefined || payload.location !== undefined) {
      const nextDepartmentId = payload.departmentId ?? payload.departamento_id ?? resolveDepartmentId(payload.location, safeDepartments);
      if (nextDepartmentId !== null && nextDepartmentId !== undefined) updates.departamento_id = nextDepartmentId;
    }

    if (payload.modelId !== undefined || payload.modelo_id !== undefined || payload.brand !== undefined || payload.model !== undefined) {
      const nextModelId = payload.modelId ?? payload.modelo_id ?? resolveModelId(payload.brand, payload.model, safeModels);
      if (nextModelId !== null && nextModelId !== undefined) updates.modelo_id = nextModelId;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No se enviaron cambios válidos para actualizar.' });
    }

    const lookupCandidates = Array.from(new Set([
      deviceId,
      payload.databaseId,
      payload.serie,
      payload.imei,
      payload.inventoryNumber,
      payload.id,
    ].filter((value) => value !== null && value !== undefined && String(value).trim() !== '')))
      .map((value) => String(value).trim());

    let matchedDevice = null;
    let matchColumn = null;

    for (const candidate of lookupCandidates) {
      const serieMatch = await supabase
        .from('kioscos')
        .select('*')
        .eq('serie', candidate)
        .limit(1);

      if (!serieMatch.error && serieMatch.data?.[0]) {
        matchedDevice = serieMatch.data[0];
        matchColumn = 'serie';
        break;
      }

      const imeiMatch = await supabase
        .from('kioscos')
        .select('*')
        .eq('imei', candidate)
        .limit(1);

      if (!imeiMatch.error && imeiMatch.data?.[0]) {
        matchedDevice = imeiMatch.data[0];
        matchColumn = 'imei';
        break;
      }

      const inventoryMatch = await supabase
        .from('kioscos')
        .select('*')
        .eq('asset_tag', candidate)
        .limit(1);

      if (!inventoryMatch.error && inventoryMatch.data?.[0]) {
        matchedDevice = inventoryMatch.data[0];
        matchColumn = 'asset_tag';
        break;
      }
    }

    if (!matchedDevice || !matchColumn) {
      return res.status(404).json({ message: 'No se encontró el dispositivo a actualizar.' });
    }

    const recordKey = matchedDevice[matchColumn];
    const { data, error } = await supabase
      .from('kioscos')
      .update(updates)
      .eq(matchColumn, recordKey)
      .select();

    if (error) {
      return res.status(500).json({ message: 'No se pudo actualizar el dispositivo.', details: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontró el dispositivo a actualizar.' });
    }

    const refreshed = formatDeviceRow(
      data[0],
      Object.fromEntries(safeDepartments.map((item) => [item.id, item.nombre])),
      Object.fromEntries(safeModels.map((item) => [item.id, item])),
    );
    return res.json({ device: refreshed });
  } catch (error) {
    console.error('Error actualizando dispositivo en Supabase:', error.message);
    return res.status(500).json({ message: 'Error al guardar en la base de datos.' });
  }
};

const getDeviceHistory = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const deviceId = String(req.params.id ?? '').trim();
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);

  if (!deviceId) {
    return res.status(400).json({ message: 'Falta el identificador del dispositivo.' });
  }

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    return res.status(400).json({ message: 'Selecciona un intervalo válido de fecha y hora.' });
  }

  try {
    const serieMatch = await supabase
      .from('kioscos')
      .select('serie, asset_tag, departamento_id')
      .eq('serie', deviceId)
      .limit(1);

    if (serieMatch.error) {
      return res.status(500).json({ message: 'No se pudo localizar el dispositivo.', details: serieMatch.error.message });
    }

    let device = serieMatch.data?.[0] || null;
    if (!device) {
      const inventoryMatch = await supabase
        .from('kioscos')
        .select('serie, asset_tag, departamento_id')
        .eq('asset_tag', deviceId)
        .limit(1);

      if (inventoryMatch.error) {
        return res.status(500).json({ message: 'No se pudo localizar el dispositivo.', details: inventoryMatch.error.message });
      }

      device = inventoryMatch.data?.[0] || null;
    }

    if (!device?.serie) {
      return res.status(404).json({ message: 'No se encontró el dispositivo.' });
    }

    if (req.user?.role !== 'admin') {
      const { data: departments, error: departmentsError } = await supabase
        .from('cat_departamentos')
        .select('id, nombre');

      if (departmentsError) {
        return res.status(500).json({ message: 'No se pudo validar el área del dispositivo.', details: departmentsError.message });
      }

      const departmentsMap = Object.fromEntries((departments || []).map((department) => [department.id, department.nombre]));
      if (!canAccessDevice(device, req.user, departmentsMap)) {
        return res.status(403).json({ message: 'No tienes acceso al historial de este teléfono.' });
      }
    }

    const { data, error } = await supabase
      .from('historial_ubicaciones')
      .select('id, latitude, longitude, created_at')
      .eq('kiosk_serie', device.serie)
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: true })
      .limit(5000);

    if (error) {
      return res.status(500).json({ message: 'No se pudo consultar el historial de ubicaciones.', details: error.message });
    }

    const points = (data || [])
      .map((point) => ({
        id: point.id,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        createdAt: point.created_at,
      }))
      .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

    return res.json({ points, total: points.length });
  } catch (error) {
    console.error('Error consultando historial del dispositivo:', error.message);
    return res.status(500).json({ message: 'Error al consultar el historial de ubicaciones.' });
  }
};

const deleteDevice = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ message: 'Sin conexión a Supabase.' });
  }

  const deviceId = String(req.params.id ?? '').trim();
  if (!deviceId) {
    return res.status(400).json({ message: 'Falta el identificador del dispositivo.' });
  }

  try {
    const serieMatch = await supabase
      .from('kioscos')
      .select('serie, asset_tag')
      .eq('serie', deviceId)
      .limit(1);

    if (serieMatch.error) {
      return res.status(500).json({ message: 'No se pudo localizar el dispositivo.', details: serieMatch.error.message });
    }

    let matchedDevice = serieMatch.data?.[0] || null;
    let matchColumn = matchedDevice ? 'serie' : null;

    if (!matchedDevice) {
      const inventoryMatch = await supabase
        .from('kioscos')
        .select('serie, asset_tag')
        .eq('asset_tag', deviceId)
        .limit(1);

      if (inventoryMatch.error) {
        return res.status(500).json({ message: 'No se pudo localizar el dispositivo.', details: inventoryMatch.error.message });
      }

      matchedDevice = inventoryMatch.data?.[0] || null;
      matchColumn = matchedDevice ? 'asset_tag' : null;
    }

    if (!matchedDevice || !matchColumn) {
      return res.status(404).json({ message: 'No se encontró el dispositivo.' });
    }

    const { data, error } = await supabase
      .from('kioscos')
      .delete()
      .eq(matchColumn, matchedDevice[matchColumn])
      .select('serie, asset_tag');

    if (error) {
      return res.status(500).json({ message: 'No se pudo eliminar el dispositivo.', details: error.message });
    }

    if (!data?.length) {
      return res.status(404).json({ message: 'No se encontró el dispositivo.' });
    }

    return res.json({ message: 'Dispositivo eliminado correctamente.' });
  } catch (error) {
    console.error('Error eliminando dispositivo en Supabase:', error.message);
    return res.status(500).json({ message: 'Error al eliminar el dispositivo.' });
  }
};

module.exports = { getDevices, getDeviceCatalogs, createDepartment, updateDepartment, deleteDepartment, createBrand, updateBrand, deleteBrand, createModel, updateModel, deleteModel, updateDevice, getDeviceHistory, deleteDevice };
