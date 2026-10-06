import { useState } from 'react';

const toDateInput = (date) => {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const toTimeInput = (date) => {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(11, 16);
};

const createTodayRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return {
    fromDate: toDateInput(start),
    fromTime: '00:00',
    toDate: toDateInput(now),
    toTime: toTimeInput(now),
  };
};

const DeviceHistoryPanel = ({ device, pointCount, isLoading, error, onFilter, onClose }) => {
  const [range, setRange] = useState(createTodayRange);

  const updateRange = (field, value) => setRange((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onFilter({
      from: `${range.fromDate}T${range.fromTime}`,
      to: `${range.toDate}T${range.toTime}`,
    });
  };

  return (
    <aside className="history-panel" aria-label="Historial de ubicaciones">
      <div className="history-panel-header">
        <div>
          <span>Historial de recorrido</span>
          <strong>{device.inventoryNumber || device.serie || 'Teléfono seleccionado'}</strong>
        </div>
        <button type="button" className="map-device-close" onClick={onClose} aria-label="Cerrar historial">×</button>
      </div>

      <form onSubmit={handleSubmit} className="history-filter-form">
        <div className="history-range-heading">
          <span>Periodo a consultar</span>
          <button type="button" onClick={() => setRange(createTodayRange())}>Hoy</button>
        </div>

        <div className="history-range-grid">
          <fieldset>
            <legend>Inicio</legend>
            <label>
              Fecha
              <input type="date" value={range.fromDate} max={range.toDate} onChange={(event) => updateRange('fromDate', event.target.value)} required />
            </label>
            <label>
              Hora
              <input type="time" value={range.fromTime} step="60" onChange={(event) => updateRange('fromTime', event.target.value)} required />
            </label>
          </fieldset>

          <fieldset>
            <legend>Fin</legend>
            <label>
              Fecha
              <input type="date" value={range.toDate} min={range.fromDate} onChange={(event) => updateRange('toDate', event.target.value)} required />
            </label>
            <label>
              Hora
              <input type="time" value={range.toTime} step="60" onChange={(event) => updateRange('toTime', event.target.value)} required />
            </label>
          </fieldset>
        </div>

        <button className="btn-cfe" type="submit" disabled={isLoading}>{isLoading ? 'Consultando...' : 'Mostrar recorrido'}</button>
      </form>

      {error && <p className="history-panel-error" role="alert">{error}</p>}
      {!error && !isLoading && <p className="history-panel-summary">{pointCount === null ? 'Elige un periodo y consulta el recorrido.' : `${pointCount} punto${pointCount === 1 ? '' : 's'} mostrado${pointCount === 1 ? '' : 's'} en el mapa.`}</p>}
    </aside>
  );
};

export default DeviceHistoryPanel;
