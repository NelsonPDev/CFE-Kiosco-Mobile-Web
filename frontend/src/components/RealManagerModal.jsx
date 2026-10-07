import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import ConfirmDialog from './ConfirmDialog';
import PasswordInputWithRules from './PasswordInputWithRules';
import {
  sanitizeRpe,
  sanitizeNombre,
  validateRpe,
  validateNombre,
  getPasswordRequirements,
} from '../utils/validation';

const emptyForm = (departments = []) => ({
  nombre: '',
  rpe: '',
  password: '',
  departamentos: departments.length ? [departments[0].nombre] : [],
});

const RealManagerModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('create');
  const [form, setForm] = useState(emptyForm());
  const [departamentos, setDepartamentos] = useState([]);
  const [managers, setManagers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [error, setError] = useState('');
  const [managerToDelete, setManagerToDelete] = useState(null);

  const loadData = async () => {
    try {
      const [departmentsResponse, managersResponse] = await Promise.all([
        api.get('/api/jefes/departamentos'),
        api.get('/api/jefes'),
      ]);
      setDepartamentos(departmentsResponse.data.departments || []);
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    if (tab === 'create') resetForm();
  };

  const handleEdit = (manager) => {
    setActiveTab('manage');
    setEditingId(manager.id);
    setForm({
      nombre: manager.nombre || '',
      rpe: manager.rpe || '',
      password: '',
      departamentos: manager.departamentos?.length
        ? manager.departamentos
        : (manager.departamento ? [manager.departamento] : []),
    });
    setError('');
  };

  const selectedManager = managers.find((item) => String(item.id) === String(editingId));

  const isFormValidAndChanged = useMemo(() => {
    if (!validateNombre(form.nombre) || !validateRpe(form.rpe) || !form.departamentos.length) return false;

    const passReqs = getPasswordRequirements(form.password);
    if (!editingId) return passReqs.isValid;
    if (form.password && !passReqs.isValid) return false;

    return form.nombre.trim() !== (selectedManager?.nombre || '').trim()
      || form.rpe.trim() !== (selectedManager?.rpe || '').trim()
      || form.departamentos.join('|') !== (selectedManager?.departamentos || [selectedManager?.departamento]).filter(Boolean).join('|')
      || Boolean(form.password && passReqs.isValid);
  }, [form, editingId, selectedManager]);

  const filteredManagers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return managers.filter((manager) => {
      const managerDepartments = manager.departamentos || [manager.departamento];
      const matchesQuery = !query || [manager.nombre, manager.rpe, ...managerDepartments]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      const matchesDepartment = departmentFilter === 'all' || managerDepartments.includes(departmentFilter);
      return matchesQuery && matchesDepartment;
    });
  }, [managers, searchTerm, departmentFilter]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validateNombre(form.nombre)) {
      setError('El nombre completo solo debe contener letras (hasta 70 caracteres).');
      return;
    }

    if (!validateRpe(form.rpe)) {
      setError('El RPE debe constar de exactamente 5 caracteres alfanuméricos.');
      return;
    }

    if (!form.departamentos.length) {
      setError('Selecciona al menos un área.');
      return;
    }

    if (!editingId && !form.password) {
      setError('La contraseña inicial es obligatoria.');
      return;
    }

    if (form.password && !getPasswordRequirements(form.password).isValid) {
      setError('La contraseña no cumple con todos los requisitos obligatorios.');
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      rpe: form.rpe.trim(),
      departamentos: form.departamentos,
      ...(form.password ? { password: form.password } : {}),
    };

    try {
      if (editingId) {
        await api.put(`/api/jefes/${editingId}`, payload);
      } else {
        await api.post('/api/jefes', payload);
      }
      const wasEditing = Boolean(editingId);
      resetForm();
      await loadData();
      setActiveTab(wasEditing ? 'manage' : 'create');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el jefe.');
    }
  };

  const handleDelete = async (manager) => {
    try {
      await api.delete(`/api/jefes/${manager.id}`);
      if (String(editingId) === String(manager.id)) resetForm();
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el jefe.');
    }
  };

  const renderForm = (editing = false) => (
    <form className="manager-form" onSubmit={handleSubmit}>
      <h3>{editing ? 'Editar jefe' : 'Nuevo jefe'}</h3>
      <label>Nombre completo
        <input
          type="text"
          value={form.nombre}
          onChange={(event) => setForm((current) => ({ ...current, nombre: sanitizeNombre(event.target.value) }))}
          maxLength={70}
          required
        />
      </label>
      <label>RPE del jefe
        <input
          type="text"
          value={form.rpe}
          onChange={(event) => setForm((current) => ({ ...current, rpe: sanitizeRpe(event.target.value) }))}
          maxLength={5}
          required
        />
      </label>

      <PasswordInputWithRules
        password={form.password}
        onPasswordChange={(val) => setForm((current) => ({ ...current, password: val }))}
        showConfirm={false}
        passwordLabel={editing ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}
        isRequired={!editing}
      />

      <fieldset className="manager-department-selector">
        <legend>Áreas asignadas</legend>
        <div className="manager-department-options">
          {departamentos.map((department) => (
            <label key={department.id}>
              <input
                type="checkbox"
                checked={form.departamentos.includes(department.nombre)}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  departamentos: event.target.checked
                    ? [...current.departamentos, department.nombre]
                    : current.departamentos.filter((name) => name !== department.nombre),
                }))}
              />
              <span>{department.nombre}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p className="login-error" role="alert">{error}</p>}
      <div className="edit-form-actions">
        {editing && <button className="btn-cfe btn-secondary" type="button" onClick={resetForm}>Cancelar edición</button>}
        <button className="btn-cfe" type="submit" disabled={!isFormValidAndChanged}>{editing ? 'Guardar cambios' : 'Crear jefe'}</button>
      </div>
    </form>
  );

  return (
    <div className="manager-modal-backdrop" role="presentation">
      <section className="manager-modal manager-directory-modal" role="dialog" aria-modal="true" aria-labelledby="manager-modal-title">
        <div className="manager-modal-header">
          <div><h2 id="manager-modal-title">Jefes</h2></div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar administración de jefes">×</button>
        </div>

        <div className="section-switcher manager-tabs" role="tablist" aria-label="Opciones de jefes">
          <button type="button" className={`section-tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => handleTabChange('create')}>Jefe</button>
          <button type="button" className={`section-tab ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => handleTabChange('manage')}>Administrar jefes</button>
        </div>

        {activeTab === 'create' ? renderForm(false) : (
          <div className="manager-workspace">
            {editingId ? renderForm(true) : (
              <>
                <div className="manager-filter-bar">
                  <label className="manager-search-field">
                    Buscar
                    <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Nombre, RPE o área" />
                  </label>
                  <label className="manager-area-filter">
                    Área
                    <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                      <option value="all">Todas las áreas</option>
                      {departamentos.map((department) => <option key={department.id} value={department.nombre}>{department.nombre}</option>)}
                    </select>
                  </label>
                </div>

                {error && <p className="login-error" role="alert">{error}</p>}
                <div className="manager-directory" aria-label="Jefes registrados">
                  <div className="manager-directory-heading">
                    <h3>Jefes registrados</h3>
                    <span>{filteredManagers.length} de {managers.length}</span>
                  </div>
                  {filteredManagers.length === 0 ? (
                    <p className="manager-empty-state">No se encontraron jefes con esos filtros.</p>
                  ) : (
                    <ul className="manager-list">
                      {filteredManagers.map((manager) => (
                        <li key={manager.id}>
                          <div><strong>{manager.nombre || manager.rpe}</strong><span>{manager.rpe} · {(manager.departamentos || [manager.departamento]).filter(Boolean).join(', ') || 'Sin área'}</span></div>
                          <div className="manager-list-actions">
                            <button className="manager-edit-button" type="button" onClick={() => handleEdit(manager)}>Editar</button>
                            <button className="catalog-delete-button" type="button" onClick={() => setManagerToDelete(manager)}>Eliminar</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        )}

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
