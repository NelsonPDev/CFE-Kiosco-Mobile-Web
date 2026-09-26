import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const CatalogManagerModal = ({ departments = [], models = [], onClose, onCatalogChange }) => {
  const [activeTab, setActiveTab] = useState('departments');
  const [newDepartment, setNewDepartment] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [departmentDraft, setDepartmentDraft] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [brandDraft, setBrandDraft] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [targetModelBrand, setTargetModelBrand] = useState('');
  const [modelDraft, setModelDraft] = useState({ marca: '', modelo: '' });
  const [newModel, setNewModel] = useState({ marca: '', modelo: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const brandOptions = useMemo(
    () => [...new Set(models.map((item) => item.marca).filter(Boolean))],
    [models],
  );
  const modelOptions = useMemo(
    () => models.filter((item) => item.modelo && item.marca === selectedBrand),
    [models, selectedBrand],
  );

  useEffect(() => {
    if (departments.length > 0 && !selectedDepartmentId) {
      setSelectedDepartmentId(String(departments[0].id));
      setDepartmentDraft(departments[0].nombre || '');
    }
  }, [departments, selectedDepartmentId]);

  useEffect(() => {
    if (brandOptions.length > 0 && !selectedBrand) {
      setSelectedBrand(brandOptions[0]);
      setBrandDraft(brandOptions[0]);
      setNewModel((current) => ({ ...current, marca: brandOptions[0] }));
    }
  }, [brandOptions, selectedBrand]);

  const handleSelectDepartment = (event) => {
    const id = event.target.value;
    const selected = departments.find((item) => String(item.id) === String(id));
    setSelectedDepartmentId(id);
    setDepartmentDraft(selected?.nombre || '');
  };

  const refreshCatalog = async () => {
    await onCatalogChange?.();
  };

  const handleCreateDepartment = async () => {
    const nombre = newDepartment.trim();
    if (!nombre) {
      setError('Escribe el nombre del área.');
      return;
    }

    try {
      await api.post('/api/devices/catalogs/departments', { nombre });
      setNewDepartment('');
      setError('');
      setSuccess('Área creada correctamente.');
      await refreshCatalog();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo crear el área.');
    }
  };

  const handleSaveDepartment = async () => {
    const nombre = departmentDraft.trim();
    if (!selectedDepartmentId || !nombre) {
      setError('Selecciona un área y escribe su nombre.');
      return;
    }

    try {
      await api.put(`/api/devices/catalogs/departments/${selectedDepartmentId}`, { nombre });
      setError('');
      setSuccess('Área actualizada correctamente.');
      await refreshCatalog();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo actualizar el área.');
    }
  };

  const handleDeleteDepartment = async () => {
    const selected = departments.find((item) => String(item.id) === String(selectedDepartmentId));
    if (!selected || !window.confirm(`Eliminar el área "${selected.nombre}"? Esta acción no se puede deshacer.`)) return;

    try {
      await api.delete(`/api/devices/catalogs/departments/${selected.id}`);
      const nextDepartment = departments.find((item) => String(item.id) !== String(selected.id));
      setSelectedDepartmentId(nextDepartment ? String(nextDepartment.id) : '');
      setDepartmentDraft(nextDepartment?.nombre || '');
      setError('');
      setSuccess('Área eliminada correctamente.');
      await refreshCatalog();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo eliminar el área.');
    }
  };

  const handleCreateBrand = async () => {
    const marca = newBrand.trim();
    if (!marca) {
      setError('Escribe el nombre de la marca.');
      return;
    }

    try {
      await api.post('/api/devices/catalogs/brands', { marca });
      setNewBrand('');
      setSelectedBrand(marca);
      setBrandDraft(marca);
      setNewModel((current) => ({ ...current, marca }));
      setError('');
      setSuccess('Marca creada correctamente.');
      await refreshCatalog();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo crear la marca.');
    }
  };

  const handleSaveBrand = async () => {
    const currentBrand = selectedBrand.trim();
    const nextBrand = brandDraft.trim();
    if (!currentBrand || !nextBrand) {
      setError('Selecciona una marca y escribe su nombre.');
      return;
    }

    try {
      await api.put(`/api/devices/catalogs/brands/${encodeURIComponent(currentBrand)}`, { marca: nextBrand });
      setSelectedBrand(nextBrand);
      setBrandDraft(nextBrand);
      setNewModel((current) => ({ ...current, marca: nextBrand }));
      setError('');
      setSuccess('Marca actualizada correctamente.');
      await refreshCatalog();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo actualizar la marca.');
    }
  };

  const handleDeleteBrand = async () => {
    const brand = selectedBrand.trim();
    if (!brand || !window.confirm(`Eliminar la marca "${brand}" y todos sus modelos? Esta acción no se puede deshacer.`)) return;

    try {
      await api.delete(`/api/devices/catalogs/brands/${encodeURIComponent(brand)}`);
      const nextBrand = brandOptions.find((item) => item !== brand) || '';
      setSelectedBrand(nextBrand);
      setBrandDraft(nextBrand);
      setSelectedModelId('');
      setNewModel((current) => ({ ...current, marca: nextBrand }));
      setError('');
      setSuccess('Marca eliminada correctamente.');
      await refreshCatalog();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo eliminar la marca.');
    }
  };

  const handleCreateModel = async () => {
    const marca = newModel.marca.trim();
    const modelo = newModel.modelo.trim();
    if (!marca || !modelo) {
      setError('Selecciona una marca y escribe el modelo.');
      return;
    }

    try {
      await api.post('/api/devices/catalogs/models', { marca, modelo });
      setNewModel((current) => ({ ...current, modelo: '' }));
      setSelectedBrand(marca);
      setError('');
      setSuccess('Modelo creado correctamente.');
      await refreshCatalog();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo crear el modelo.');
    }
  };

  const handleSelectModel = (event) => {
    const id = event.target.value;
    const selected = models.find((item) => String(item.id) === String(id));
    setSelectedModelId(id);
    setTargetModelBrand('');
    setModelDraft({ marca: selected?.marca || selectedBrand, modelo: selected?.modelo || '' });
  };

  const handleSaveModel = async () => {
    const selected = models.find((item) => String(item.id) === String(selectedModelId));
    const marca = (targetModelBrand || selectedBrand).trim();
    const modelo = modelDraft.modelo.trim();
    if (!selected || !marca || !modelo) {
      setError('Selecciona un modelo y escribe sus datos.');
      return;
    }

    try {
      await api.put(`/api/devices/catalogs/models/${selected.id}`, { marca, modelo });
      setError('');
      setSuccess('Modelo actualizado correctamente.');
      await refreshCatalog();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo actualizar el modelo.');
    }
  };

  const handleDeleteModel = async () => {
    const selected = models.find((item) => String(item.id) === String(selectedModelId));
    if (!selected || !window.confirm(`Eliminar el modelo "${selected.modelo}"? Esta acción no se puede deshacer.`)) return;

    try {
      await api.delete(`/api/devices/catalogs/models/${selected.id}`);
      setSelectedModelId('');
      setTargetModelBrand('');
      setModelDraft({ marca: selectedBrand, modelo: '' });
      setError('');
      setSuccess('Modelo eliminado correctamente.');
      await refreshCatalog();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo eliminar el modelo.');
    }
  };

  const renderDepartments = () => (
    <div className="catalog-workspace">
      <section className="catalog-section">
        <h3>Nueva área</h3>
        <div className="catalog-form-row">
          <label className="catalog-field">
            Nombre del área
            <input value={newDepartment} onChange={(event) => setNewDepartment(event.target.value)} placeholder="Ej. Operación Poniente" />
          </label>
          <button type="button" className="btn-cfe" onClick={handleCreateDepartment}>Crear área</button>
        </div>
      </section>

      <section className="catalog-section">
        <h3>Editar o eliminar área</h3>
        <div className="catalog-form-grid">
          <label className="catalog-field">
            Área
            <select value={selectedDepartmentId} onChange={handleSelectDepartment}>
              <option value="">Selecciona un área</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.nombre}</option>)}
            </select>
          </label>
          <label className="catalog-field">
            Nombre del área
            <input value={departmentDraft} onChange={(event) => setDepartmentDraft(event.target.value)} disabled={!selectedDepartmentId} />
          </label>
        </div>
        <div className="catalog-action-row">
          <button type="button" className="catalog-delete-button" onClick={handleDeleteDepartment} disabled={!selectedDepartmentId}>Eliminar área</button>
          <button type="button" className="btn-cfe" onClick={handleSaveDepartment} disabled={!selectedDepartmentId}>Guardar cambios</button>
        </div>
      </section>
    </div>
  );

  const renderBrands = () => (
    <div className="catalog-workspace">
      <section className="catalog-section">
        <h3>Nueva marca</h3>
        <div className="catalog-form-row">
          <label className="catalog-field">
            Nombre de la marca
            <input value={newBrand} onChange={(event) => setNewBrand(event.target.value)} placeholder="Ej. Samsung" />
          </label>
          <button type="button" className="btn-cfe" onClick={handleCreateBrand}>Crear marca</button>
        </div>
      </section>

      <section className="catalog-section">
        <h3>Editar o eliminar marca</h3>
        <div className="catalog-form-grid">
          <label className="catalog-field">
            Marca
            <select value={selectedBrand} onChange={(event) => {
              setSelectedBrand(event.target.value);
              setBrandDraft(event.target.value);
            }}>
              <option value="">Selecciona una marca</option>
              {brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </label>
          <label className="catalog-field">
            Nuevo nombre
            <input value={brandDraft} onChange={(event) => setBrandDraft(event.target.value)} disabled={!selectedBrand} />
          </label>
        </div>
        <div className="catalog-action-row">
          <button type="button" className="catalog-delete-button" onClick={handleDeleteBrand} disabled={!selectedBrand}>Eliminar marca</button>
          <button type="button" className="btn-cfe" onClick={handleSaveBrand} disabled={!selectedBrand}>Guardar cambios</button>
        </div>
      </section>
    </div>
  );

  const renderModels = () => (
    <div className="catalog-workspace">
      <section className="catalog-section">
        <h3>Nuevo modelo</h3>
        <div className="catalog-form-grid">
          <label className="catalog-field">
            Marca
            <select value={newModel.marca} onChange={(event) => setNewModel((current) => ({ ...current, marca: event.target.value }))}>
              <option value="">Selecciona una marca</option>
              {brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </label>
          <label className="catalog-field">
            Nombre del modelo
            <input value={newModel.modelo} onChange={(event) => setNewModel((current) => ({ ...current, modelo: event.target.value }))} placeholder="Ej. Galaxy A54" />
          </label>
        </div>
        <div className="catalog-action-row">
          <button type="button" className="btn-cfe" onClick={handleCreateModel} disabled={!newModel.marca}>Crear modelo</button>
        </div>
      </section>

      <section className="catalog-section">
        <h3>Editar o eliminar modelo</h3>
        <div className="catalog-form-grid">
          <label className="catalog-field">
            Marca del modelo
            <select value={selectedBrand} onChange={(event) => {
              setSelectedBrand(event.target.value);
              setSelectedModelId('');
              setModelDraft({ marca: event.target.value, modelo: '' });
            }}>
              <option value="">Selecciona una marca</option>
              {brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </label>
          <label className="catalog-field">
            Modelo
            <select value={selectedModelId} onChange={handleSelectModel} disabled={!selectedBrand}>
              <option value="">Selecciona un modelo</option>
              {modelOptions.map((model) => <option key={model.id} value={model.id}>{model.modelo}</option>)}
            </select>
          </label>
          <label className="catalog-field">
            Cambiar a marca
            <select value={targetModelBrand} onChange={(event) => setTargetModelBrand(event.target.value)} disabled={!selectedModelId}>
              <option value="">Mantener marca actual</option>
              {brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </label>
          <label className="catalog-field">
            Nombre del modelo
            <input value={modelDraft.modelo} onChange={(event) => setModelDraft((current) => ({ ...current, modelo: event.target.value }))} disabled={!selectedModelId} />
          </label>
        </div>
        <div className="catalog-action-row">
          <button type="button" className="catalog-delete-button" onClick={handleDeleteModel} disabled={!selectedModelId}>Eliminar modelo</button>
          <button type="button" className="btn-cfe" onClick={handleSaveModel} disabled={!selectedModelId}>Guardar cambios</button>
        </div>
      </section>
    </div>
  );

  const tabs = [
    { id: 'departments', label: 'Áreas', content: renderDepartments },
    { id: 'brands', label: 'Marcas', content: renderBrands },
    { id: 'models', label: 'Modelos', content: renderModels },
  ];
  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content || renderDepartments;

  return (
    <div className="manager-modal-backdrop" role="presentation">
      <section className="manager-modal catalog-manager-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-modal-title">
        <div className="manager-modal-header">
          <div>
            <span className="section-eyebrow">Catálogos</span>
            <h2 id="catalog-modal-title">Áreas, marcas y modelos</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar gestión de catálogos">×</button>
        </div>

        <div className="section-switcher catalog-tabs" role="tablist" aria-label="Catálogos disponibles">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`section-tab ${activeTab === tab.id ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError('');
                setSuccess('');
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeContent()}

        {error && <p className="login-error" role="alert">{error}</p>}
        {success && <p className="login-success" role="status">{success}</p>}

        <div className="edit-form-actions catalog-actions">
          <button className="btn-cfe btn-secondary" type="button" onClick={onClose}>Cerrar</button>
        </div>
      </section>
    </div>
  );
};

export default CatalogManagerModal;
