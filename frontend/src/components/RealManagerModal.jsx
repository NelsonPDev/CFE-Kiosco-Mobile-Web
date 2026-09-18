import { useEffect, useState } from 'react';
import { api } from '../services/api';

const RealManagerModal = ({ onClose }) => {
  const [form, setForm] = useState({ nombre: '', rpe: '', password: '', departamento: '' });
  const [departamentos, setDepartamentos] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const { data } = await api.get('/api/jefes/departamentos');
        setDepartamentos(data.departments || []);
        if (data.departments?.[0]) {
          setForm((current) => ({ ...current, departamento: data.departments[0].nombre }));
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadDepartments();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.nombre || !form.rpe || !form.password || !form.departamento) {
      setError('Completa todos los campos.');
      return;
    }

    try {
      await api.post('/api/jefes', form);
      setSuccess('Jefe creado correctamente.');
      setForm({ nombre: '', rpe: '', password: '', departamento: departamentos[0]?.nombre || '' });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear el jefe.');
    }
  };

  return (
    <div className="manager-modal-backdrop" role="presentation">
      <section className="manager-modal" role="dialog" aria-modal="true" aria-labelledby="manager-modal-title">
        <div className="manager-modal-header">
          <div>
            <h2 id="manager-modal-title">Crear jefe</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar creación de jefe">×</button>
        </div>

        <form className="manager-form" onSubmit={handleSubmit}>
          <label>Nombre completo
            <input type="text" value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} required />
          </label>

          <label>RPE del jefe
            <input type="text" value={form.rpe} onChange={(event) => setForm((current) => ({ ...current, rpe: event.target.value }))} required />
          </label>

          <label>Contraseña inicial
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
          </label>

          <label>Área
            <select value={form.departamento} onChange={(event) => setForm((current) => ({ ...current, departamento: event.target.value }))} required>
              {departamentos.map((departamento) => (
                <option key={departamento.id} value={departamento.nombre}>{departamento.nombre}</option>
              ))}
            </select>
          </label>

          {error && <p className="login-error" role="alert">{error}</p>}
          {success && <p className="login-success" role="status">{success}</p>}

          <button className="btn-cfe" type="submit">Guardar jefe</button>
        </form>
      </section>
    </div>
  );
};

export default RealManagerModal;
