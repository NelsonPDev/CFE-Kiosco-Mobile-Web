import { useEffect, useMemo, useState } from 'react';
import PasswordInputWithRules from './PasswordInputWithRules';
import {
  sanitizeRpe,
  validateRpe,
  sanitizeNombre,
  validateNombre,
  sanitizePuesto,
  sanitizeInventario,
  validateInventario,
  sanitizeSerie,
  validateSerie,
  sanitizePhone,
  validatePhone,
  getPasswordRequirements,
} from '../utils/validation';

const DeviceInfoModal = ({
  device,
  areas = [],
  modelOptions = [],
  isAdmin,
  isEditing,
  successMessage = '',
  errorMessage = '',
  onChange,
  onClose,
  onEdit,
  onSave,
  onDelete,
  onViewHistory,
}) => {
  const [selectedTab, setSelectedTab] = useState('worker');

  const brandOptions = Array.from(new Set(modelOptions.map((item) => item.marca).filter(Boolean)));
  const selectedBrand = device.brand || brandOptions[0] || '';
  const availableModels = modelOptions.filter((item) => !selectedBrand || item.marca === selectedBrand);
  const sectionTabs = [
    { id: 'worker', label: 'Trabajador' },
    { id: 'device', label: 'Teléfono' },
    { id: 'password', label: 'Modo kiosco' },
  ];

  const [initialDeviceState, setInitialDeviceState] = useState(null);

  useEffect(() => {
    if (isEditing && !initialDeviceState && device) {
      setInitialDeviceState({ ...device });
    }
  }, [isEditing, device, initialDeviceState]);

  const isWorkerFormValid = useMemo(() => {
    return validateRpe(device.workerRpe) && validateNombre(device.workerName);
  }, [device.workerRpe, device.workerName]);

  const isDeviceFormValid = useMemo(() => {
    const invValid = !device.inventoryNumber || validateInventario(device.inventoryNumber);
    return invValid && validateSerie(device.serie || device.imei) && validatePhone(device.phoneNumber);
  }, [device.inventoryNumber, device.serie, device.imei, device.phoneNumber]);

  const isPasswordFormValid = useMemo(() => {
    const pass = device.adminPassword || '';
    const confirm = device.confirmAdminPassword || '';
    return getPasswordRequirements(pass).isValid && pass === confirm;
  }, [device.adminPassword, device.confirmAdminPassword]);

  const isWorkerFormChanged = useMemo(() => {
    if (!initialDeviceState || selectedTab !== 'worker') return false;
    const rpeChanged = (device.workerRpe || '').trim() !== (initialDeviceState.workerRpe || '').trim();
    const nameChanged = (device.workerName || '').trim() !== (initialDeviceState.workerName || '').trim();
    const locationChanged = (device.location || '').trim() !== (initialDeviceState.location || '').trim();
    const roleChanged = (device.role ?? device.puesto ?? '').trim() !== (initialDeviceState.role ?? initialDeviceState.puesto ?? '').trim();
    return isWorkerFormValid && (rpeChanged || nameChanged || locationChanged || roleChanged);
  }, [device, initialDeviceState, selectedTab, isWorkerFormValid]);

  const isDeviceFormChanged = useMemo(() => {
    if (!initialDeviceState || selectedTab !== 'device') return false;
    const invChanged = (device.inventoryNumber ?? '').trim() !== (initialDeviceState.inventoryNumber ?? '').trim();
    const serieChanged = (device.serie || device.imei || '').trim() !== (initialDeviceState.serie || initialDeviceState.imei || '').trim();
    const brandChanged = (device.brand || '').trim() !== (initialDeviceState.brand || '').trim();
    const modelChanged = (device.model || '').trim() !== (initialDeviceState.model || '').trim();
    const phoneChanged = (device.phoneNumber || '').trim() !== (initialDeviceState.phoneNumber || '').trim();
    return isDeviceFormValid && (invChanged || serieChanged || brandChanged || modelChanged || phoneChanged);
  }, [device, initialDeviceState, selectedTab, isDeviceFormValid]);

  const isSaveDisabled = selectedTab === 'worker'
    ? !isWorkerFormChanged
    : selectedTab === 'device'
      ? !isDeviceFormChanged
      : !isPasswordFormValid;

  const updateField = (field, value) => {
    if (field === 'brand') {
      const nextBrand = value;
      const firstModel = modelOptions.find((item) => item.marca === nextBrand)?.modelo || '';
      onChange({ ...device, brand: nextBrand, model: firstModel });
      return;
    }

    let sanitizedValue = value;
    if (field === 'workerRpe') sanitizedValue = sanitizeRpe(value);
    if (field === 'workerName') sanitizedValue = sanitizeNombre(value);
    if (field === 'inventoryNumber') sanitizedValue = sanitizeInventario(value);
    if (field === 'serie') sanitizedValue = sanitizeSerie(value);
    if (field === 'phoneNumber') sanitizedValue = sanitizePhone(value);

    onChange({ ...device, [field]: sanitizedValue });
  };

  const handleRoleChange = (nextValue) => {
    const sanitized = sanitizePuesto(nextValue);
    onChange({
      ...device,
      role: sanitized,
      puesto: sanitized,
    });
  };

  const renderActiveSection = () => {
    if (selectedTab === 'worker') {
      return (
        <div className="edit-section-card">
          <h3>Editar Trabajador</h3>
          <label>
            RPE
            <input
              type="text"
              value={device.workerRpe || ''}
              onChange={(event) => updateField('workerRpe', event.target.value)}
              maxLength={5}
              required
            />
          </label>
          <label>
            Nombre completo
            <input
              type="text"
              value={device.workerName || ''}
              onChange={(event) => updateField('workerName', event.target.value)}
              maxLength={70}
              required
            />
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
            <input
              type="text"
              value={device.role ?? device.puesto ?? ''}
              onChange={(event) => handleRoleChange(event.target.value)}
              maxLength={60}
            />
          </label>
        </div>
      );
    }

    if (selectedTab === 'device') {
      return (
        <div className="edit-section-card">
          <h3>Editar Teléfono</h3>
          <label>
            No. Inventario (8 dígitos)
            <input
              type="text"
              value={device.inventoryNumber ?? ''}
              onChange={(event) => updateField('inventoryNumber', event.target.value)}
              maxLength={8}
            />
          </label>
          <label>
            Serie
            <input
              type="text"
              value={device.serie || device.imei || ''}
              onChange={(event) => updateField('serie', event.target.value)}
              maxLength={20}
              required
            />
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
            Número Telefónico (10 dígitos)
            <input
              type="text"
              value={device.phoneNumber || ''}
              onChange={(event) => updateField('phoneNumber', event.target.value)}
              maxLength={10}
              required
            />
          </label>
        </div>
      );
    }

    if (selectedTab === 'password') {
      return (
        <div className="edit-section-card">
          <h3>Contraseña de administrador</h3>
          <PasswordInputWithRules
            password={device.adminPassword || ''}
            confirmPassword={device.confirmAdminPassword || ''}
            onPasswordChange={(val) => updateField('adminPassword', val)}
            onConfirmPasswordChange={(val) => updateField('confirmAdminPassword', val)}
            showConfirm
            passwordLabel="Nueva contraseña"
            confirmLabel="Confirmar contraseña"
          />
        </div>
      );
    }

    return null;
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

            {errorMessage && <p className="login-error" role="alert">{errorMessage}</p>}

            {renderActiveSection()}

            <div className="edit-form-actions">
              <button className="btn-cfe btn-secondary" type="button" onClick={onClose}>Cancelar</button>
              <button className="btn-cfe" type="submit" disabled={isSaveDisabled}>
                {selectedTab === 'worker' ? 'Guardar trabajador' : selectedTab === 'device' ? 'Guardar teléfono' : 'Guardar contraseña'}
              </button>
            </div>
          </form>
        ) : (
          <>
            {successMessage && <p className="login-success" role="status">{successMessage}</p>}
            {errorMessage && <p className="login-error" role="alert">{errorMessage}</p>}

            <div className="device-details">
              <div className="device-details-status">
                <span className="device-status-dot" aria-hidden="true" />
                <strong>{device.status}</strong>
              </div>

              <div className="device-detail-grid">
                <div className="device-detail-column">
                  <div><span>Trabajador asignado</span><strong>{device.workerName}</strong></div>
                  <div><span>RPE</span><strong>{device.workerRpe}</strong></div>
                  <div><span>Área</span><strong>{device.location}</strong></div>
                  <div><span>Puesto</span><strong>{device.role || device.puesto || 'Operador'}</strong></div>
                </div>

                <div className="device-detail-column">
                  <div><span>No. Inventario</span><strong>{device.inventoryNumber || 'Sin inventario'}</strong></div>
                  <div><span>Serie</span><strong>{device.serie || device.imei || 'Sin Serie'}</strong></div>
                  <div><span>Teléfono</span><strong>{device.phoneNumber}</strong></div>
                  <div><span>Marca/Modelo</span><strong>{[device.brand, device.model].filter(Boolean).join(' / ') || 'Sin información'}</strong></div>
                </div>
              </div>

              <div className="device-detail-actions">
                <button className="btn-cfe btn-secondary" type="button" onClick={onViewHistory}>Ver historial</button>
                {isAdmin && (
                  <>
                    <button className="device-danger-button" type="button" onClick={onDelete}>Eliminar teléfono</button>
                    <button className="btn-cfe" type="button" onClick={onEdit}>Modificar información</button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default DeviceInfoModal;
