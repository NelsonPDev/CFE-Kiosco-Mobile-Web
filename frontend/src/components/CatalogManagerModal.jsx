import { useEffect, useState } from 'react';
import { api } from '../services/api';

const CatalogManagerModal = ({ departments = [], models = [], onClose, onCatalogChange }) => {
  const [activeTab, setActiveTab] = useState('departments');
  const [newDepartment, setNewDepartment] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [departmentDraft, setDepartmentDraft] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [modelDraft, setModelDraft] = useState({ marca: '', modelo: '' });
  const [newModel, setNewModel] = useState({ marca: '', modelo: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const brandOptions = [...new Set(models.map((item) => item.marca).filter(Boolean))];
  const departmentOptions = departments ?? [];
  const modelOptions = models.filter((item) => !selectedBrand || item.marca === selectedBrand);

  useEffect(() => {
    if (departmentOptions.length > 0 && !selectedDepartmentId) {
      setSelectedDepartmentId(String(departmentOptions[0].id));
      setDepartmentDraft(departmentOptions[0].nombre || '');
    }
  }, [departmentOptions, selectedDepartmentId]);

  useEffect(() => {
    if (brandOptions.length > 0 && !selectedBrand) {
      setSelectedBrand(brandOptions[0]);
    }
  }, [brandOptions, selectedBrand]);

  useEffect(() => {
    const currentDepartment = departmentOptions.find((item) => String(item.id) === String(selectedDepartmentId));
    setDepartmentDraft(currentDepartment?.nombre || '');
  }, [departmentOptions, selectedDepartmentId]);

  useEffect(() => {
    const currentModel = modelOptions.find((item) => String(item.id) === String(selectedModelId));
    setModelDraft({
      marca: currentModel?.marca || selectedBrand || '',
      modelo: currentModel?.modelo || '',
    });
  }, [modelOptions, selectedBrand, selectedModelId]);

  const handleSelectDepartment = (event) => {
    const id = event.target.value;
    const selected = departmentOptions.find((item) => String(item.id) === String(id));
    setSelectedDepartmentId(id);
    setDepartmentDraft(selected?.nombre || '');
  };

  const handleSaveDepartment = async () => {
    const nombre = departmentDraft.trim();
    const selected = departmentOptions.find((item) => String(item.id) === String(selectedDepartmentId));

    if (!selected || !selectedDepartmentId || !nombre) {
      setError('Selecciona un área antes de guardar.');
      setSuccess('');
      return;
    }

    try {
      await api.put(`/api/devices/catalogs/departments/${selectedDepartmentId}`, { nombre });
      setError('');
      setSuccess('Área actualizada correctamente.');
      if (onCatalogChange) onCatalogChange();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo actualizar el área.');
    }
  };

  const handleCreateDepartment = async () => {
    const nombre = newDepartment.trim();
    if (!nombre) {
      setError('Escribe el nombre del área.');
      setSuccess('');
      return;
    }

    try {
      await api.post('/api/devices/catalogs/departments', { nombre });
      setError('');
      setSuccess('Área agregada correctamente.');
      setNewDepartment('');
      if (onCatalogChange) onCatalogChange();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo guardar el área.');
    }
  };

  const handleCreateBrand = async () => {
    const marca = newBrand.trim();
    if (!marca) {
      setError('Escribe el nombre de la marca.');
      setSuccess('');
      return;
    }

    try {
      await api.post('/api/devices/catalogs/brands', { marca });
      setError('');
      setSuccess('Marca agregada correctamente.');
      setNewBrand('');
      setSelectedBrand(marca);
      if (onCatalogChange) onCatalogChange();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo guardar la marca.');
    }
  };

  const handleSelectModel = (event) => {
    const id = event.target.value;
    const selected = models.find((item) => String(item.id) === String(id));
    setSelectedModelId(id);
    setModelDraft({
      marca: selected?.marca || selectedBrand || '',
      modelo: selected?.modelo || '',
    });
  };

  const handleSaveModel = async () => {
    const marca = String(modelDraft.marca || selectedBrand || '').trim();
    const modelo = String(modelDraft.modelo || '').trim();
    const selected = models.find((item) => String(item.id) === String(selectedModelId));

    if (!selected || !selectedModelId || !marca || !modelo) {
      setError('Selecciona un modelo antes de guardar.');
      setSuccess('');
      return;
    }

    try {
      await api.put(`/api/devices/catalogs/models/${selectedModelId}`, { marca, modelo });
      setError('');
      setSuccess('Modelo actualizado correctamente.');
      if (onCatalogChange) onCatalogChange();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo actualizar el modelo.');
    }
  };

  const handleCreateModel = async () => {
    const marca = String(newModel.marca || selectedBrand || '').trim();
    const modelo = String(newModel.modelo || '').trim();

    if (!marca || !modelo) {
      setError('Selecciona una marca e ingresa el modelo.');
      setSuccess('');
      return;
    }

    try {
      await api.post('/api/devices/catalogs/models', { marca, modelo });
      setError('');
      setSuccess('Modelo agregado correctamente.');
      setNewModel({ marca: '', modelo: '' });
      if (onCatalogChange) onCatalogChange();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo guardar el modelo.');
    }
  };

  const renderDepartments = () => (
    <div className="catalog-manager-list compact-list">
      <div className="catalog-panel-group">
        <div className="catalog-panel catalog-panel-create">
          <div className="catalog-panel-header">
            <span className="catalog-panel-badge">Agregar</span>
            <strong>Nueva área</strong>
          </div>
          <div className="catalog-mini-form">
            <input
              type="text"
              value={newDepartment}
              onChange={(event) => setNewDepartment(event.target.value)}
              placeholder="Escribe el nombre del área"
            />
            <button type="button" className="btn-cfe" onClick={handleCreateDepartment}>Agregar</button>
          </div>
        </div>

        <div className="catalog-panel catalog-panel-update">
          <div className="catalog-panel-header">
            <span className="catalog-panel-badge">Actualizar</span>
            <strong>Área existente</strong>
          </div>

          <div className="catalog-selector-block">
            <label>Área a modificar</label>
            <select value={selectedDepartmentId} onChange={handleSelectDepartment}>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>{department.nombre}</option>
              ))}
            </select>
          </div>

          {selectedDepartmentId && (
            <div className="catalog-editor-card">
              <label>
                Nombre del área
                <input
                  type="text"
                  value={departmentDraft}
                  onChange={(event) => setDepartmentDraft(event.target.value)}
                />
              </label>
              <button type="button" className="btn-cfe" onClick={handleSaveDepartment}>Guardar área</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderModels = () => (
    <div className="catalog-manager-list compact-list">
      <div className="catalog-panel-group">
        <div className="catalog-panel catalog-panel-create">
          <div className="catalog-panel-header">
            <span className="catalog-panel-badge">Agregar</span>
            <strong>Nueva marca</strong>
          </div>
          <div className="catalog-mini-form">
            <input
              type="text"
              value={newBrand}
              onChange={(event) => setNewBrand(event.target.value)}
              placeholder="Escribe la marca"
            />
            <button type="button" className="btn-cfe" onClick={handleCreateBrand}>Agregar</button>
          </div>

          <div className="catalog-mini-form">
            <input
              type="text"
              value={newModel.modelo}
              onChange={(event) => setNewModel((current) => ({ ...current, modelo: event.target.value }))}
              placeholder="Escribe el modelo"
            />
            <button type="button" className="btn-cfe" onClick={handleCreateModel}>Agregar</button>
          </div>
        </div>

        <div className="catalog-panel catalog-panel-update">
          <div className="catalog-panel-header">
            <span className="catalog-panel-badge">Actualizar</span>
            <strong>Marca y modelo existentes</strong>
          </div>

          <div className="catalog-selector-block two-column">
            <label>
              Marca
              <select value={selectedBrand} onChange={(event) => {
                const nextBrand = event.target.value;
                setSelectedBrand(nextBrand);
                setSelectedModelId('');
                setModelDraft({ marca: nextBrand, modelo: '' });
              }}>
                {brandOptions.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </label>

            <label>
              Modelo a modificar
              <select value={selectedModelId} onChange={handleSelectModel}>
                <option value="">Selecciona un modelo</option>
                {modelOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.modelo}</option>
                ))}
              </select>
            </label>
          </div>

          {selectedModelId && (
            <div className="catalog-editor-card">
              <label>
                Marca
                <select value={modelDraft.marca} onChange={(event) => setModelDraft((current) => ({ ...current, marca: event.target.value }))}>
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </label>

              <label>
                Modelo
                <input
                  type="text"
                  value={modelDraft.modelo}
                  onChange={(event) => setModelDraft((current) => ({ ...current, modelo: event.target.value }))}
                />
              </label>

              <button type="button" className="btn-cfe" onClick={handleSaveModel}>Guardar modelo</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="manager-modal-backdrop" role="presentation">
      <section className="manager-modal catalog-manager-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-modal-title">
        <div className="manager-modal-header">
          <div>
            <span className="section-eyebrow">Catálogos</span>
            <h2 id="catalog-modal-title">Áreas y modelos</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar gestión de catálogos">×</button>
        </div>

        <div className="section-switcher catalog-tabs" role="tablist" aria-label="Catálogos disponibles">
          <button
            type="button"
            className={`section-tab ${activeTab === 'departments' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'departments'}
            onClick={() => setActiveTab('departments')}
          >
            Áreas
          </button>
          <button
            type="button"
            className={`section-tab ${activeTab === 'models' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'models'}
            onClick={() => setActiveTab('models')}
          >
            Marcas/Modelos
          </button>
        </div>

        {activeTab === 'departments' ? renderDepartments() : renderModels()}

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
