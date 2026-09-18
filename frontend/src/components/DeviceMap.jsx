import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mapCenter } from '../data/demoData';

const createPhoneIcon = () => L.divIcon({
  className: 'phone-marker-wrapper',
  html: '<span class="phone-marker"><span class="phone-marker-screen"></span></span>',
  iconAnchor: [11, 34],
});

const DeviceMap = ({ devices, selectedDevice, onSelectDevice }) => {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);

  useEffect(() => {
    const map = L.map(mapElement.current).setView(mapCenter, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markersLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    return () => {
      mapInstance.current = null;
      markersLayer.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!markersLayer.current) {
      return;
    }

    markersLayer.current.clearLayers();
    devices.forEach((device) => {
      const marker = L.marker(device.position, { icon: createPhoneIcon() });

      marker.bindPopup(`<strong>${device.name}</strong><br />${device.id} · ${device.status}`);
      marker.on('click', () => {
        if (onSelectDevice) {
          onSelectDevice(device);
        }
      });
      marker.addTo(markersLayer.current);
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
