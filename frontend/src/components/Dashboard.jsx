import { useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import DeviceInfoModal from './DeviceInfoModal';
import DeviceMap from './DeviceMap';
import DeviceSidebar from './DeviceSidebar';
import CatalogManagerModal from './CatalogManagerModal';
import RealManagerModal from './RealManagerModal';
import { api } from '../services/api';

const logo = '/logocfekioscomobile-circulo.png';

const Dashboard = ({ user, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceCatalog, setDeviceCatalog] = useState({ departments: [], models: [] });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isManagerPanelOpen, setIsManagerPanelOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [deviceModal, setDeviceModal] = useState(null);
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
  const filteredDevices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesSearch = [device.name, device.id, device.location]
        .some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === 'Todos' || device.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [devices, searchTerm, statusFilter]);

  const selectedVisibleDevice = filteredDevices.find(
    (device) => device.id === selectedDevice?.id,
  ) || null;

  const openDeviceModal = (device, isEditing = false) => {
    setDeviceModal({ device: { ...device }, isEditing });
    setSelectedDevice(device);
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

      const payload = {
        databaseId: deviceModal.device.databaseId ?? deviceModal.device.id,
        workerName: deviceModal.device.workerName,
        workerRpe: deviceModal.device.workerRpe,
        location: deviceModal.device.location,
        role: deviceModal.device.role ?? deviceModal.device.puesto ?? 'Operador',
        departmentId: department?.id ?? deviceModal.device.departmentId ?? null,
        phoneNumber: deviceModal.device.phoneNumber,
        brand: deviceModal.device.brand ?? '',
        model: deviceModal.device.model ?? '',
        modelId: selectedModel?.id ?? deviceModal.device.modelId ?? null,
        inventoryNumber: deviceModal.device.inventoryNumber ?? deviceModal.device.id,
      };

      if (section === 'worker') {
        delete payload.phoneNumber;
        delete payload.brand;
        delete payload.model;
        delete payload.modelId;
        delete payload.inventoryNumber;
      }

      if (section === 'device') {
        delete payload.workerName;
        delete payload.workerRpe;
        delete payload.location;
        delete payload.departmentId;
      }

      if (section === 'password') {
        setDeviceModal((current) => ({ ...current, isEditing: false }));
        return;
      }

      const { data } = await api.put(`/api/devices/${deviceModal.device.databaseId ?? deviceModal.device.id}`, payload);
      const updatedDevice = data.device;

      setDevices((currentDevices) => currentDevices.map((device) => (
        String(device.databaseId ?? device.id) === String(updatedDevice.databaseId ?? updatedDevice.id)
          ? updatedDevice
          : device
      )));
      setSelectedDevice(updatedDevice);
      setDeviceModal((current) => ({ ...current, device: updatedDevice, isEditing: true }));
    } catch (error) {
      console.error('No se pudo guardar el dispositivo en la base de datos.', error.response?.data || error.message);
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
        <div className="dashboard-session">
          <span>Bienvenido, <strong>{user.username}</strong></span>
        </div>
      </header>

      <DeviceSidebar
        devices={filteredDevices}
        selectedDevice={selectedDevice}
        isAdmin={isAdmin}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        isFilterOpen={isFilterOpen}
        onSearchChange={(event) => setSearchTerm(event.target.value)}
        onFilterToggle={() => setIsFilterOpen((isOpen) => !isOpen)}
        onStatusChange={(status) => {
          setStatusFilter(status);
          setIsFilterOpen(false);
        }}
        onSelectDevice={setSelectedDevice}
        onOpenDeviceInfo={openDeviceModal}
        onOpenManagerPanel={() => setIsManagerPanelOpen(true)}
        onOpenCatalogManager={() => setIsCatalogModalOpen(true)}
        onLogout={onLogout}
      />

      <main className="dashboard-main">
        <section className="map-section">
          <div className="map-heading">
            <div><span className="section-eyebrow">Ubicación en tiempo real</span><h2>Mapa de dispositivos</h2></div>
            <span className="map-status"><span /> {devices.length} activo{devices.length === 1 ? '' : 's'}</span>
          </div>
          <div className="map-wrapper">
            <DeviceMap
              devices={filteredDevices}
              selectedDevice={selectedVisibleDevice}
              onSelectDevice={(device) => setSelectedDevice(device)}
            />

            {selectedVisibleDevice && (
              <div className="map-device-card" role="dialog" aria-live="polite">
                <button className="map-device-close" type="button" aria-label="Cerrar detalle" onClick={() => setSelectedDevice(null)}>×</button>
                <div className="map-device-number">{selectedVisibleDevice.inventoryNumber || selectedVisibleDevice.name}</div>
                <div className="map-device-meta">
                  <span>{selectedVisibleDevice.id}</span>
                  <span>{selectedVisibleDevice.status}</span>
                </div>
              </div>
            )}

            <div className="map-note">Ubicación en tiempo real</div>
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
          onChange={(device) => setDeviceModal((current) => ({ ...current, device }))}
          onClose={() => setDeviceModal(null)}
          onEdit={() => setDeviceModal((current) => ({ ...current, isEditing: true }))}
          onSave={handleSaveDevice}
          onCatalogChange={refreshCatalogs}
        />
      )}

      {isAdmin && isManagerPanelOpen && (
        <RealManagerModal onClose={() => setIsManagerPanelOpen(false)} />
      )}

      {isAdmin && isCatalogModalOpen && (
        <CatalogManagerModal
          departments={deviceCatalog.departments}
          models={deviceCatalog.models}
          onClose={() => setIsCatalogModalOpen(false)}
          onCatalogChange={refreshCatalogs}
        />
      )}

    </div>
  );
};

export default Dashboard;
