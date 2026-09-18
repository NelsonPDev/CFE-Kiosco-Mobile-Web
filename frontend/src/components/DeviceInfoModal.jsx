import { useState } from 'react';

const DeviceInfoModal = ({
  device,
  areas = [],
  modelOptions = [],
  isAdmin,
  isEditing,
  onChange,
  onClose,
  onEdit,
  onSave,
}) => {
  const [selectedTab, setSelectedTab] = useState('worker');

  const brandOptions = Array.from(new Set(modelOptions.map((item) => item.marca).filter(Boolean)));
  const selectedBrand = device.brand || brandOptions[0] || '';
  const availableModels = modelOptions.filter((item) => !selectedBrand || item.marca === selectedBrand);
  const sectionTabs = [
    { id: 'worker', label: 'Trabajador' },
    { id: 'device', label: 'Teléfono' },
    { id: 'password', label: 'Contraseña' },
  ];

  const updateField = (field, value) => {
    if (field === 'brand') {
      const nextBrand = value;
      const firstModel = modelOptions.find((item) => item.marca === nextBrand)?.modelo || '';
      onChange({ ...device, brand: nextBrand, model: firstModel });
      return;
    }

    onChange({ ...device, [field]: value });
  };

  const renderActiveSection = () => {
    if (selectedTab === 'worker') {
      return (
        <div className="edit-section-card">
          <h3>Editar Trabajador</h3>
          <label>
            RPE
            <input type="text" value={device.workerRpe || ''} onChange={(event) => updateField('workerRpe', event.target.value)} required />
          </label>
          <label>
            Nombre completo
            <input type="text" value={device.workerName || ''} onChange={(event) => updateField('workerName', event.target.value)} required />
          </label>
          <label>
            Área
            <select value={device.location || (areas[0]?.nombre || '')} onChange={(event) => updateField('location', event.target.value)}>
              {areas.map((area) => (
                <option key={area.id} value={area.nombre}>{area.nombre}</option>
              ))}
            </select>
          </label>
          <label>
            Puesto
            <input type="text" value={device.role || 'Operador'} onChange={(event) => updateField('role', event.target.value)} required />
          </label>

        </div>
      );
    }

    if (selectedTab === 'device') {
      return (
        <div className="edit-section-card">
          <h3>Editar Teléfono</h3>
          <label>
            No. Inventario
            <input type="text" value={device.inventoryNumber || device.id || ''} onChange={(event) => updateField('inventoryNumber', event.target.value)} required />
          </label>
          <label>
            IMEI
            <input type="text" value={device.imei || ''} onChange={(event) => updateField('imei', event.target.value)} required />
          </label>

          <div className="device-model-row">
            <label className="compact-field">
              Marca
              <select value={selectedBrand} onChange={(event) => updateField('brand', event.target.value)}>
                {brandOptions.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </label>

            <label className="compact-field">
              Modelo
              <select value={device.model || (availableModels[0]?.modelo || '')} onChange={(event) => updateField('model', event.target.value)}>
                {availableModels.map((item) => (
                  <option key={item.id} value={item.modelo}>{item.modelo}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Número Telefónico
            <input type="text" value={device.phoneNumber || ''} onChange={(event) => updateField('phoneNumber', event.target.value)} required />
          </label>
        </div>
      );
    }

    return (
      <div className="edit-section-card">
        <h3>Editar Contraseña</h3>
        <label>
          Nueva contraseña
          <input type="password" value={device.newPassword || ''} onChange={(event) => updateField('newPassword', event.target.value)} placeholder="Mínimo 6 caracteres" minLength="6" />
        </label>
        <label>
          Confirmar contraseña
          <input type="password" value={device.confirmPassword || ''} onChange={(event) => updateField('confirmPassword', event.target.value)} placeholder="Repite la contraseña" minLength="6" />
        </label>
      </div>
    );
  };

  return (
    <div className="manager-modal-backdrop" role="presentation">
      <section className="manager-modal device-info-modal" role="dialog" aria-modal="true" aria-labelledby="device-modal-title">
        <div className="manager-modal-header">
          <div>
            <span className="section-eyebrow">Ficha del dispositivo</span>
            <h2 id="device-modal-title">{isEditing ? 'Modificar información' : 'Información del teléfono'}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar información del teléfono">×</button>
        </div>

        {isEditing ? (
          <form className="manager-form device-edit-form" onSubmit={(event) => onSave(event, selectedTab)}>
            <div className="section-switcher" role="tablist" aria-label="Secciones de edición">
              {sectionTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`section-tab ${selectedTab === tab.id ? 'active' : ''}`}
                  role="tab"
                  aria-selected={selectedTab === tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {renderActiveSection()}

            <div className="edit-form-actions">
              <button className="btn-cfe btn-secondary" type="button" onClick={onClose}>Cancelar</button>
              <button className="btn-cfe" type="submit">
                {selectedTab === 'worker' ? 'Guardar trabajador' : selectedTab === 'device' ? 'Guardar teléfono' : 'Guardar contraseña'}
              </button>
            </div>
          </form>
        ) : (
          <div className="device-details">
            <div className="device-details-status">
              <span className="device-status-dot" aria-hidden="true" />
              <strong>{device.status}</strong>
              <small>{device.lastUpdate}</small>
            </div>

            <div className="device-detail-grid">
              <div className="device-detail-column">
                <div><span>Trabajador asignado</span><strong>{device.workerName}</strong></div>
                <div><span>RPE</span><strong>{device.workerRpe}</strong></div>
                <div><span>Ubicación</span><strong>{device.location}</strong></div>
                <div><span>Puesto</span><strong>{device.role || 'Operador'}</strong></div>
              </div>

              <div className="device-detail-column">
                <div><span>Dispositivo</span><strong>{device.displayName || device.name}</strong></div>
                <div><span>ID</span><strong>{device.id}</strong></div>
                <div><span>Teléfono</span><strong>{device.phoneNumber}</strong></div>
                <div><span>Marca/Modelo</span><strong>{[device.brand, device.model].filter(Boolean).join(' / ') || 'Sin información'}</strong></div>
              </div>
            </div>

            {isAdmin && <button className="btn-cfe" type="button" onClick={onEdit}>Modificar información</button>}
          </div>
        )}
      </section>
    </div>
  );
};

export default DeviceInfoModal;
