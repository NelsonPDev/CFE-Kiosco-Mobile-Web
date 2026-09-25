import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { mapCenter } from '../data/demoData';

const getPhoneMarkerStyleClass = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus.includes('fuera') || normalizedStatus.includes('offline')) {
    return 'phone-marker-offline';
  }

  if (normalizedStatus.includes('alerta') || normalizedStatus.includes('warning') || normalizedStatus.includes('problema')) {
    return 'phone-marker-warning';
  }

  return 'phone-marker-online';
};

const createPhoneIcon = (device) => {
  const rpe = (device?.workerRpe || 'Sin RPE').trim();
  const label = rpe.length > 14 ? `${rpe.slice(0, 14)}…` : rpe;
  const markerClass = getPhoneMarkerStyleClass(device?.status);

  return L.divIcon({
    className: 'phone-marker-wrapper',
    html: `
      <div class="phone-marker-pin">
        <span class="phone-marker ${markerClass}">
          <span class="phone-marker-screen"></span>
        </span>
        <span class="phone-marker-rpe">${label}</span>
      </div>
    `,
    iconSize: [50, 76],
    iconAnchor: [25, 72],
    popupAnchor: [0, -66],
  });
};

const getClusterMetrics = (cluster) => {
  const children = cluster.getAllChildMarkers();
  const counts = { online: 0, offline: 0, warning: 0 };

  children.forEach((marker) => {
    const status = marker.options?.deviceStatus || 'online';
    const normalizedStatus = String(status).trim().toLowerCase();

    if (normalizedStatus.includes('fuera') || normalizedStatus.includes('offline')) {
      counts.offline += 1;
      return;
    }

    if (normalizedStatus.includes('alerta') || normalizedStatus.includes('warning') || normalizedStatus.includes('problema')) {
      counts.warning += 1;
      return;
    }

    counts.online += 1;
  });

  return counts;
};

const getClusterClassName = (cluster) => {
  const counts = getClusterMetrics(cluster);

  if (counts.offline > counts.online && counts.offline >= counts.warning) {
    return 'cluster-marker-offline';
  }

  if (counts.warning > counts.online && counts.warning >= counts.offline) {
    return 'cluster-marker-warning';
  }

  return 'cluster-marker-online';
};

const createClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  const clusterClassName = getClusterClassName(cluster);
  const { online, offline, warning } = getClusterMetrics(cluster);

  return L.divIcon({
    html: `
      <div class="cluster-marker ${clusterClassName}">
        <span class="cluster-number">${count}</span>
        <span class="cluster-stats">
          <em class="cluster-online">${online}</em>
          <em class="cluster-warning">${warning}</em>
          <em class="cluster-offline">${offline}</em>
        </span>
      </div>
    `,
    className: 'cluster-marker-wrapper',
    iconSize: L.point(58, 58),
  });
};

const DeviceMap = ({ devices, selectedDevice, onSelectDevice }) => {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);

  useEffect(() => {
    const map = L.map(mapElement.current).setView(mapCenter, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16,
      maxClusterRadius: 60,
      iconCreateFunction: createClusterIcon,
    });

    markersLayer.current = clusterGroup;
    clusterGroup.addTo(map);
    mapInstance.current = map;

    return () => {
      mapInstance.current = null;
      markersLayer.current = null;
      clusterGroup.remove();
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!markersLayer.current) {
      return;
    }

    markersLayer.current.clearLayers();

    devices.forEach((device) => {
      const marker = L.marker(device.position, {
        icon: createPhoneIcon(device),
        deviceStatus: device.status,
      });

      const popupContent = `
        <div class="device-popup">
          <div class="device-popup-title">${device.name || device.inventoryNumber || device.id}</div>
          <div class="device-popup-row"><strong>ID:</strong> ${device.id || 'Sin ID'}</div>
          <div class="device-popup-row"><strong>Trabajador:</strong> ${device.workerName || 'Sin asignar'}</div>
          <div class="device-popup-row"><strong>RPE:</strong> ${device.workerRpe || 'Sin RPE'}</div>
          <div class="device-popup-row"><strong>Teléfono:</strong> ${device.phoneNumber || 'Sin teléfono'}</div>
          <div class="device-popup-row"><strong>Estado:</strong> ${device.status || 'Sin estado'}</div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.bindTooltip(`
        <div class="device-tooltip">
          <strong>${device.workerName || 'Sin asignar'}</strong>
          <span>RPE: ${device.workerRpe || 'Sin RPE'}</span>
          <span>Tel: ${device.phoneNumber || 'Sin teléfono'}</span>
        </div>
      `, {
        direction: 'top',
        offset: [0, -16],
        opacity: 1,
        sticky: true,
      });

      marker.on('click', () => {
        if (onSelectDevice) {
          onSelectDevice(device);
        }
      });

      markersLayer.current.addLayer(marker);
    });
  }, [devices, onSelectDevice]);

  useEffect(() => {
    if (mapInstance.current && selectedDevice) {
      mapInstance.current.flyTo(selectedDevice.position, 15, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedDevice]);

  return <div ref={mapElement} className="device-map" />;
};

export default DeviceMap;
