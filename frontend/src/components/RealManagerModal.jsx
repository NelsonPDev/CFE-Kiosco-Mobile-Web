import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import ConfirmDialog from './ConfirmDialog';

const emptyForm = (departments = []) => ({
  nombre: '',
  rpe: '',
  password: '',
  departamento: departments[0]?.nombre || '',
});

const RealManagerModal = ({ onClose }) => {
  const [form, setForm] = useState(emptyForm());
  const [departamentos, setDepartamentos] = useState([]);
  const [managers, setManagers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [managerToDelete, setManagerToDelete] = useState(null);

  const loadData = async () => {
    try {
      const [departmentsResponse, managersResponse] = await Promise.all([
        api.get('/api/jefes/departamentos'),
        api.get('/api/jefes'),
      ]);
      const nextDepartments = departmentsResponse.data.departments || [];
      setDepartamentos(nextDepartments);
      setManagers(managersResponse.data.managers || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los jefes.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm(departamentos));
  };

  const handleEdit = (manager) => {
    setEditingId(manager.id);
    setForm({
      nombre: manager.nombre || '',
      rpe: manager.rpe || '',
      password: '',
      departamento: manager.departamento || departamentos[0]?.nombre || '',
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.nombre.trim() || !form.rpe.trim() || !form.departamento || (!editingId && !form.password)) {
      setError('Completa todos los campos obligatorios.');
      return;
    }

    if (form.password && form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      rpe: form.rpe.trim(),
      departamento: form.departamento,
      ...(form.password ? { password: form.password } : {}),
    };

    try {
      if (editingId) {
        await api.put(`/api/jefes/${editingId}`, payload);
        setSuccess('Jefe actualizado correctamente.');
      } else {
        await api.post('/api/jefes', payload);
        setSuccess('Jefe creado correctamente.');
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el jefe.');
    }
  };

  const handleDelete = async (manager) => {
    try {
      await api.delete(`/api/jefes/${manager.id}`);
      if (String(editingId) === String(manager.id)) {
        resetForm();
      }
      setError('');
      setSuccess('Jefe eliminado correctamente.');
      await loadData();
    } catch (err) {
      setSuccess('');
      setError(err?.response?.data?.message || 'No se pudo eliminar el jefe.');
    }
  };

  const selectedManager = managers.find((item) => String(item.id) === String(editingId));

  const isFormValidAndChanged = useMemo(() => {
    if (!form.nombre.trim() || !form.rpe.trim() || !form.departamento) {
      return false;
    }

    if (!editingId) {
      return Boolean(form.password && form.password.length >= 6);
    }

    if (form.password && form.password.length < 6) {
      return false;
    }

    const nameChanged = form.nombre.trim() !== (selectedManager?.nombre || '').trim();
    const rpeChanged = form.rpe.trim() !== (selectedManager?.rpe || '').trim();
    const deptChanged = form.departamento !== (selectedManager?.departamento || '');
    const passTyped = Boolean(form.password && form.password.length >= 6);

    return nameChanged || rpeChanged || deptChanged || passTyped;
  }, [form, editingId, selectedManager]);

  return (
    <div className="manager-modal-backdrop" role="presentation">
      <section className="manager-modal manager-directory-modal" role="dialog" aria-modal="true" aria-labelledby="manager-modal-title">
        <div className="manager-modal-header">
          <div>
            <h2 id="manager-modal-title">Administrar jefes</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar administración de jefes">×</button>
        </div>

        <form className="manager-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Editar jefe' : 'Nuevo jefe'}</h3>
          <label>Nombre completo
            <input type="text" value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} required />
          </label>

          <label>RPE del jefe
            <input type="text" value={form.rpe} onChange={(event) => setForm((current) => ({ ...current, rpe: event.target.value }))} required />
          </label>

          <label>{editingId ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} minLength="6" required={!editingId} />
          </label>

          <label>Área
            <select value={form.departamento} onChange={(event) => setForm((current) => ({ ...current, departamento: event.target.value }))} required>
              <option value="">Selecciona un área</option>
              {departamentos.map((departamento) => (
                <option key={departamento.id} value={departamento.nombre}>{departamento.nombre}</option>
              ))}
            </select>
          </label>

          {error && <p className="login-error" role="alert">{error}</p>}
          {success && <p className="login-success" role="status">{success}</p>}

          <div className="edit-form-actions">
            {editingId && <button className="btn-cfe btn-secondary" type="button" onClick={resetForm}>Cancelar edición</button>}
            <button className="btn-cfe" type="submit" disabled={!isFormValidAndChanged}>{editingId ? 'Guardar cambios' : 'Guardar jefe'}</button>
          </div>
        </form>

        <div className="manager-directory" aria-label="Jefes registrados">
          <h3>Jefes registrados</h3>
          {managers.length === 0 ? (
            <p className="manager-empty-state">No hay jefes registrados.</p>
          ) : (
            <ul className="manager-list">
              {managers.map((manager) => (
                <li key={manager.id}>
                  <div>
                    <strong>{manager.nombre || manager.rpe}</strong>
                    <span>{manager.rpe} · {manager.departamento || 'Sin área'}</span>
                  </div>
                  <div className="manager-list-actions">
                    <button className="password-reset-button" type="button" onClick={() => handleEdit(manager)}>Editar</button>
                    <button className="catalog-delete-button" type="button" onClick={() => setManagerToDelete(manager)}>Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {managerToDelete && (
          <ConfirmDialog
            title="Eliminar jefe"
            message={`Se eliminará a ${managerToDelete.nombre || managerToDelete.rpe}. Esta acción no se puede deshacer.`}
            onCancel={() => setManagerToDelete(null)}
            onConfirm={() => {
              const manager = managerToDelete;
              setManagerToDelete(null);
              handleDelete(manager);
            }}
          />
        )}
      </section>
    </div>
  );
};

export default RealManagerModal;
