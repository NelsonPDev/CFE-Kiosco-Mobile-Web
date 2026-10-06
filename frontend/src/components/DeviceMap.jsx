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
      <div class="phone-pin-container">
        <span class="phone-marker-rpe">${label}</span>
        <div class="phone-marker-body ${markerClass}">
          <span class="phone-marker-screen"></span>
          <span class="phone-marker-tip"></span>
        </div>
      </div>
    `,
    iconSize: [48, 54],
    iconAnchor: [24, 54],
    popupAnchor: [0, -54],
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

const getDensestPhoneLocation = (devices) => {
  if (!Array.isArray(devices) || devices.length === 0) {
    return mapCenter;
  }

  const clusters = {};

  devices.forEach((device) => {
    if (!device.position || !Array.isArray(device.position) || device.position.length < 2) return;
    const [lat, lng] = device.position;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

    const key = `${(Math.round(lat * 50) / 50).toFixed(2)},${(Math.round(lng * 50) / 50).toFixed(2)}`;

    if (!clusters[key]) {
      clusters[key] = {
        count: 0,
        latSum: 0,
        lngSum: 0,
      };
    }

    clusters[key].count += 1;
    clusters[key].latSum += lat;
    clusters[key].lngSum += lng;
  });

  let maxCluster = null;
  let maxCount = -1;

  Object.values(clusters).forEach((cluster) => {
    if (cluster.count > maxCount) {
      maxCount = cluster.count;
      maxCluster = cluster;
    }
  });

  if (maxCluster && maxCluster.count > 0) {
    return [maxCluster.latSum / maxCluster.count, maxCluster.lngSum / maxCluster.count];
  }

  return mapCenter;
};

const DeviceMap = ({ devices, selectedDevice, historyPoints = [], onSelectDevice }) => {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);
  const historyLayer = useRef(null);
  const hasInitialCentered = useRef(false);

  useEffect(() => {
    const map = L.map(mapElement.current).setView(mapCenter, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16,
      maxClusterRadius: 55,
      iconCreateFunction: createClusterIcon,
    });

    markersLayer.current = clusterGroup;
    clusterGroup.addTo(map);
    historyLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    return () => {
      mapInstance.current = null;
      markersLayer.current = null;
      historyLayer.current = null;
      clusterGroup.remove();
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (mapInstance.current && devices.length > 0 && !hasInitialCentered.current) {
      const densestCenter = getDensestPhoneLocation(devices);
      mapInstance.current.setView(densestCenter, 13, { animate: true });
      hasInitialCentered.current = true;
    }
  }, [devices]);

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
          <div class="device-popup-row"><strong>No. Inventario:</strong> ${device.inventoryNumber || 'Sin inventario'}</div>
          <div class="device-popup-row"><strong>Serie:</strong> ${device.serie || device.imei || 'Sin Serie'}</div>
          <div class="device-popup-row"><strong>Área:</strong> ${device.location || 'Sin área'}</div>
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
    if (!historyLayer.current || !mapInstance.current) return;

    historyLayer.current.clearLayers();
    const positions = historyPoints
      .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
      .map((point) => [point.latitude, point.longitude]);

    if (positions.length === 0) return;

    L.polyline(positions, {
      color: '#c46b00',
      weight: 4,
      opacity: 0.9,
    }).addTo(historyLayer.current);

    historyPoints.forEach((point, index) => {
      if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;

      const isStart = index === 0;
      const isEnd = index === historyPoints.length - 1;
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: isStart || isEnd ? 7 : 4,
        color: isStart ? '#007a3d' : isEnd ? '#b52a2a' : '#c46b00',
        weight: 2,
        fillColor: '#ffffff',
        fillOpacity: 1,
      });
      const recordedAt = point.createdAt ? new Date(point.createdAt).toLocaleString() : 'Sin fecha';
      marker.bindPopup(`<strong>${isStart ? 'Inicio' : isEnd ? 'Fin' : 'Ubicación'}</strong><br>${recordedAt}`);
      marker.addTo(historyLayer.current);
    });

    mapInstance.current.fitBounds(L.latLngBounds(positions), { padding: [38, 38], maxZoom: 16 });
  }, [historyPoints]);

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
