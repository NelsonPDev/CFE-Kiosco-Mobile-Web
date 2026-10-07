import { useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import DeviceInfoModal from './DeviceInfoModal';
import DeviceMap from './DeviceMap';
import DeviceSidebar from './DeviceSidebar';
import CatalogManagerModal from './CatalogManagerModal';
import RealManagerModal from './RealManagerModal';
import ConfirmDialog from './ConfirmDialog';
import DeviceHistoryPanel from './DeviceHistoryPanel';
import { api } from '../services/api';

const logo = '/logocfekioscomobile-circulo.png';

const Dashboard = ({ user, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceCatalog, setDeviceCatalog] = useState({ departments: [], models: [] });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [areaFilter, setAreaFilter] = useState('Todas');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isManagerPanelOpen, setIsManagerPanelOpen] = useState(false);
  const [catalogModalMode, setCatalogModalMode] = useState(null);
  const [deviceModal, setDeviceModal] = useState(null);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [historyView, setHistoryView] = useState(null);
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const [devicesResponse, catalogResponse] = await Promise.all([
          api.get('/api/devices'),
          api.get('/api/devices/catalogs'),
        ]);

        if (Array.isArray(devicesResponse.data.devices)) {
          setDevices(devicesResponse.data.devices);
        }

        setDeviceCatalog({
          departments: catalogResponse.data.departments || [],
          models: catalogResponse.data.models || [],
        });
      } catch (error) {
        console.info('No fue posible cargar los dispositivos reales.', error.message);
      }
    };

    loadDevices();
  }, []);

  const isAdmin = user.role === 'admin';
  const permittedAreas = useMemo(
    () => new Set(user.departamentos || user.areas || (user.departamento ? [user.departamento] : [])),
    [user.departamentos, user.areas, user.departamento],
  );
  const availableAreas = useMemo(
    () => Array.from(new Set(devices.map((device) => device.location).filter((loc) => loc && (isAdmin || permittedAreas.has(loc))))).sort(),
    [devices, isAdmin, permittedAreas],
  );

  const filteredDevices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return devices.filter((device) => {
      if (!isAdmin && !permittedAreas.has(device.location)) return false;
      const searchableValues = [
        device.name,
        device.id,
        device.location,
        device.workerName,
        device.workerRpe,
        device.phoneNumber,
        device.serie,
        device.imei,
        device.inventoryNumber,
        device.brand,
        device.model,
        device.role,
      ].filter(Boolean).map((value) => String(value));

      const matchesSearch = !normalizedSearch || searchableValues.some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === 'Todos' || device.status === statusFilter;
      const matchesArea = areaFilter === 'Todas' || device.location === areaFilter;

      return matchesSearch && matchesStatus && matchesArea;
    });
  }, [devices, searchTerm, statusFilter, areaFilter, isAdmin, permittedAreas]);

  const selectDevice = (device) => {
    if (!device) {
      setSelectedDevice(null);
      return;
    }

    setSelectedDevice({ ...device, selectionNonce: Date.now() });
  };

  const selectedVisibleDevice = filteredDevices.find(
    (device) => device.id === selectedDevice?.id,
  ) || null;
  const mapDevices = historyView ? [historyView.device] : filteredDevices;

  const openDeviceModal = (device, isEditing = false) => {
    setDeviceModal({
      device: { ...device },
      isEditing,
      successMessage: '',
      errorMessage: '',
    });
    selectDevice(device);
  };

  const handleSaveDevice = async (event, section = 'all') => {
    event.preventDefault();

    if (!deviceModal?.device) {
      return;
    }

    try {
      const department = deviceCatalog.departments.find((item) => item.nombre === deviceModal.device.location);
      const selectedModel = deviceCatalog.models.find((item) => item.marca === deviceModal.device.brand && item.modelo === deviceModal.device.model)
        || deviceCatalog.models.find((item) => item.label === `${deviceModal.device.brand || ''} ${deviceModal.device.model || ''}`.trim());

      const selectedRole = deviceModal.device.role ?? deviceModal.device.puesto ?? '';

      const payload = {
        databaseId: deviceModal.device.databaseId ?? deviceModal.device.serie ?? deviceModal.device.imei ?? deviceModal.device.id ?? deviceModal.device.inventoryNumber ?? null,
      };

      if (section === 'worker') {
        Object.assign(payload, {
          workerName: deviceModal.device.workerName,
          workerRpe: deviceModal.device.workerRpe,
          location: deviceModal.device.location,
          role: selectedRole,
          puesto: selectedRole,
          departmentId: department?.id ?? deviceModal.device.departmentId ?? null,
        });
      }

      if (section === 'device') {
        Object.assign(payload, {
          phoneNumber: deviceModal.device.phoneNumber,
          brand: deviceModal.device.brand ?? '',
          model: deviceModal.device.model ?? '',
          modelId: selectedModel?.id ?? deviceModal.device.modelId ?? null,
          inventoryNumber: deviceModal.device.inventoryNumber ?? '',
          serie: deviceModal.device.serie ?? deviceModal.device.imei ?? deviceModal.device.id ?? null,
        });
      }

      if (section === 'password') {
        const adminPassword = deviceModal.device.adminPassword || '';
        const confirmAdminPassword = deviceModal.device.confirmAdminPassword || '';

        if (adminPassword.length < 6) {
          setDeviceModal((current) => ({
            ...current,
            errorMessage: 'La contraseña del modo kiosco debe tener al menos 6 caracteres.',
          }));
          return;
        }

        if (adminPassword !== confirmAdminPassword) {
          setDeviceModal((current) => ({
            ...current,
            errorMessage: 'Las contraseñas no coinciden.',
          }));
          return;
        }

        Object.assign(payload, { adminPassword });
      }

      const targetId = deviceModal.device.databaseId ?? deviceModal.device.serie ?? deviceModal.device.imei ?? deviceModal.device.id ?? deviceModal.device.inventoryNumber ?? '';
      const { data } = await api.put(`/api/devices/${targetId}`, payload);
      const updatedDevice = data.device;

      setDevices((currentDevices) => currentDevices.map((device) => (
        String(device.databaseId ?? device.id) === String(deviceModal.device.databaseId ?? deviceModal.device.id)
          ? updatedDevice
          : device
      )));
      setSelectedDevice(updatedDevice);
      setDeviceModal((current) => ({
        ...current,
        device: updatedDevice,
        isEditing: false,
        successMessage: 'Se guardó correctamente en la base de datos.',
        errorMessage: '',
      }));
    } catch (error) {
      console.error('No se pudo guardar el dispositivo en la base de datos.', error.response?.data || error.message);
      setDeviceModal((current) => ({
        ...current,
        isEditing: true,
        errorMessage: 'No se pudo guardar. Verifica la información e inténtalo de nuevo.',
        successMessage: '',
      }));
    }
  };

  const handleDeleteDevice = async () => {
    const device = deviceToDelete;
    if (!device) return;

    const targetId = device.databaseId ?? device.serie ?? device.imei ?? device.id ?? device.inventoryNumber ?? '';
    if (!targetId) {
      setDeviceModal((current) => ({
        ...current,
        errorMessage: 'No se encontró el identificador del teléfono para eliminarlo.',
      }));
      return;
    }

    try {
      await api.delete(`/api/devices/${encodeURIComponent(targetId)}`);
      setDevices((currentDevices) => currentDevices.filter((currentDevice) => (
        String(currentDevice.databaseId ?? currentDevice.id) !== String(device.databaseId ?? device.id)
      )));
      setSelectedDevice(null);
      setDeviceModal(null);
      setDeviceToDelete(null);
    } catch (error) {
      console.error('No se pudo eliminar el dispositivo.', error.response?.data || error.message);
      setDeviceModal((current) => ({
        ...current,
        errorMessage: error.response?.data?.message || 'No se pudo eliminar el teléfono.',
      }));
      setDeviceToDelete(null);
    }
  };

  const openHistory = (device) => {
    setDeviceModal(null);
    setSelectedDevice({ ...device, selectionNonce: Date.now() });
    setHistoryView({ device, points: null, isLoading: false, error: '' });
  };

  const loadHistory = async ({ from, to }) => {
    if (!historyView?.device) return;

    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      setHistoryView((current) => ({ ...current, error: 'Selecciona un intervalo válido de fecha y hora.' }));
      return;
    }

    const device = historyView.device;
    const deviceId = device.databaseId ?? device.serie ?? device.imei ?? device.id ?? device.inventoryNumber ?? '';
    if (!deviceId) {
      setHistoryView((current) => ({ ...current, error: 'No se encontró el identificador del teléfono.' }));
      return;
    }

    setHistoryView((current) => ({ ...current, isLoading: true, error: '' }));
    try {
      const { data } = await api.get(`/api/devices/${encodeURIComponent(deviceId)}/history`, {
        params: { from: start.toISOString(), to: end.toISOString() },
      });
      setHistoryView((current) => ({ ...current, points: data.points || [], isLoading: false, error: '' }));
    } catch (error) {
      setHistoryView((current) => ({
        ...current,
        points: [],
        isLoading: false,
        error: error.response?.data?.message || 'No se pudo consultar el historial.',
      }));
    }
  };

  const refreshCatalogs = async () => {
    try {
      const { data } = await api.get('/api/devices/catalogs');
      setDeviceCatalog({
        departments: data.departments || [],
        models: data.models || [],
      });
    } catch (error) {
      console.error('No se pudo recargar el catálogo.', error.response?.data || error.message);
    }
  };

  return (
    <div className={`dashboard ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <header className="dashboard-header">
        <button
          className="sidebar-toggle"
          type="button"
          onClick={() => setIsSidebarOpen((isOpen) => !isOpen)}
          aria-label={isSidebarOpen ? 'Ocultar dispositivos' : 'Mostrar dispositivos'}
          aria-expanded={isSidebarOpen}
        >
          <span /><span /><span />
        </button>
        <div className="dashboard-brand">
          <img src={logo} alt="CFE Kiosco Mobile" className="dashboard-logo" />
          <h1>CFE Kiosco Mobile</h1>
        </div>

        <div className="dashboard-header-controls">
          {isAdmin && (
            <div className="header-admin-actions">
              <button className="header-action-button" type="button" onClick={() => setIsManagerPanelOpen(true)}>
                Jefe
              </button>
              <button className="header-action-button" type="button" onClick={() => setCatalogModalMode('departments')}>
                Áreas
              </button>
              <button className="header-action-button" type="button" onClick={() => setCatalogModalMode('models')}>
                Marcas y modelos
              </button>
            </div>
          )}

          <div className="dashboard-session">
            <span>Bienvenido, <strong>{user.username}</strong></span>
            <button onClick={onLogout} className="dashboard-logout-button" type="button" title="Cerrar sesión">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <DeviceSidebar
        devices={filteredDevices}
        selectedDevice={selectedDevice}
        isAdmin={isAdmin}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        areaFilter={areaFilter}
        availableAreas={availableAreas}
        isFilterOpen={isFilterOpen}
        onSearchChange={(event) => setSearchTerm(event.target.value)}
        onFilterToggle={() => setIsFilterOpen((isOpen) => !isOpen)}
        onStatusChange={(status) => {
          setStatusFilter(status);
          setIsFilterOpen(false);
        }}
        onAreaChange={(area) => {
          setAreaFilter(area);
        }}
        onSelectDevice={selectDevice}
        onOpenDeviceInfo={openDeviceModal}
      />

      <main className="dashboard-main">
        <section className="map-section">
          <div className="map-heading">
            <div><span className="section-eyebrow">Ubicación en tiempo real</span><h2>Mapa de dispositivos</h2></div>
            <span className="map-status"><span /> {devices.length} activo{devices.length === 1 ? '' : 's'}</span>
          </div>
          <div className="map-wrapper">
            <DeviceMap
              devices={mapDevices}
              selectedDevice={selectedDevice}
              historyPoints={historyView?.points || []}
              onSelectDevice={selectDevice}
            />

            {selectedVisibleDevice && (
              <div className="map-device-card" role="dialog" aria-live="polite">
                <button className="map-device-close" type="button" aria-label="Cerrar detalle" onClick={() => setSelectedDevice(null)}>×</button>
                <div className="map-device-number">{selectedVisibleDevice.inventoryNumber || 'Sin inventario'}</div>
                <div className="map-device-meta">
                  <span>{selectedVisibleDevice.id}</span>
                  <span>{selectedVisibleDevice.status}</span>
                </div>
              </div>
            )}

            <div className="map-note">Ubicación en tiempo real</div>

            {historyView && (
              <DeviceHistoryPanel
                device={historyView.device}
                pointCount={historyView.points === null ? null : historyView.points.length}
                isLoading={historyView.isLoading}
                error={historyView.error}
                onFilter={loadHistory}
                onClose={() => setHistoryView(null)}
              />
            )}
          </div>
        </section>
      </main>

      {deviceModal && (
        <DeviceInfoModal
          device={deviceModal.device}
          areas={deviceCatalog.departments}
          modelOptions={deviceCatalog.models}
          isAdmin={isAdmin}
          isEditing={deviceModal.isEditing}
          successMessage={deviceModal.successMessage || ''}
          errorMessage={deviceModal.errorMessage || ''}
          onChange={(device) => setDeviceModal((current) => ({ ...current, device, errorMessage: '', successMessage: '' }))}
          onClose={() => setDeviceModal(null)}
          onEdit={() => setDeviceModal((current) => ({ ...current, isEditing: true, successMessage: '', errorMessage: '' }))}
          onSave={handleSaveDevice}
          onDelete={() => setDeviceToDelete(deviceModal.device)}
          onViewHistory={() => openHistory(deviceModal.device)}
          onCatalogChange={refreshCatalogs}
        />
      )}

      {isAdmin && isManagerPanelOpen && (
        <RealManagerModal onClose={() => setIsManagerPanelOpen(false)} />
      )}

      {isAdmin && catalogModalMode && (
        <CatalogManagerModal
          mode={catalogModalMode}
          departments={deviceCatalog.departments}
          models={deviceCatalog.models}
          onClose={() => setCatalogModalMode(null)}
          onCatalogChange={refreshCatalogs}
        />
      )}

      {deviceToDelete && (
        <ConfirmDialog
          title="Eliminar teléfono"
          message={`Se eliminará toda la información de ${deviceToDelete.inventoryNumber || deviceToDelete.serie || deviceToDelete.imei || 'este teléfono'}. Esta acción no se puede deshacer.`}
          onCancel={() => setDeviceToDelete(null)}
          onConfirm={handleDeleteDevice}
        />
      )}

    </div>
  );
};

export default Dashboard;
