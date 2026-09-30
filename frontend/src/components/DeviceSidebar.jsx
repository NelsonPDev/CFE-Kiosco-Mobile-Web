import { deviceStatuses } from '../data/demoData';

const DeviceSidebar = ({
  devices,
  selectedDevice,
  isAdmin,
  searchTerm,
  statusFilter,
  areaFilter,
  availableAreas,
  isFilterOpen,
  onSearchChange,
  onFilterToggle,
  onStatusChange,
  onAreaChange,
  onSelectDevice,
  onOpenDeviceInfo,
}) => (
  <aside className="device-sidebar" aria-label="Dispositivos agregados">
    <div className="sidebar-heading">
      <div><span className="sidebar-eyebrow">Monitoreo</span><h2>Dispositivos</h2></div>
      <span className="device-count">{devices.length}</span>
    </div>

    <div className="device-filters">
      <div className="filter-toolbar">
        <label className="search-field">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input type="search" value={searchTerm} onChange={onSearchChange} placeholder="RPE, Serie, inventario, teléfono" aria-label="Buscar teléfono" />
        </label>
        <button className={`filter-toggle ${statusFilter !== 'Todos' ? 'filter-toggle-active' : ''}`} type="button" onClick={onFilterToggle} aria-expanded={isFilterOpen} aria-label="Mostrar filtros">
          <span aria-hidden="true">≡</span>
        </button>
      </div>
      {isFilterOpen && (
        <div className="filter-menu" role="group" aria-label="Filtrar dispositivos">
          <span>Estado</span>
          {deviceStatuses.map((status) => <button className={statusFilter === status ? 'filter-option-active' : ''} type="button" key={status} onClick={() => onStatusChange(status)}>{status}</button>)}

          <div className="filter-area-field">
            <span>Área</span>
            <select value={areaFilter} onChange={(event) => onAreaChange(event.target.value)}>
              <option value="Todas">Todas</option>
              {availableAreas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>

    <div className="device-list">
      {devices.map((device) => (
        <div className={`device-item ${selectedDevice?.id === device.id ? 'device-item-active' : ''}`} key={device.id}>
          <button className="device-select-button" type="button" onClick={() => onSelectDevice(device)}>
            <span className="device-status-dot" aria-hidden="true" />
            <span className="device-info">
              <strong>{device.workerRpe || 'N/A'}</strong>
              <small>{device.workerName || 'Sin asignar'}</small>
              <small>{device.inventoryNumber || 'Sin inventario'} · {device.serie || device.imei || 'N/A'}</small>
              <small>{device.status}</small>
            </span>
          </button>
          <div className="device-actions">
            <button className="device-info-button" type="button" onClick={() => onOpenDeviceInfo(device)}>Ver información</button>
            {isAdmin && <button className="device-edit-button" type="button" onClick={() => onOpenDeviceInfo(device, true)}>Modificar</button>}
          </div>
        </div>
      ))}
      {devices.length === 0 && <p className="empty-device-list">No se encontraron teléfonos.</p>}
    </div>
  </aside>
);

export default DeviceSidebar;
