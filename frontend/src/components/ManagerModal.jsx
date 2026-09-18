const ManagerModal = ({ managers, name, rpe, password, onNameChange, onRpeChange, onPasswordChange, onSubmit, onResetPassword, onClose }) => (
  <div className="manager-modal-backdrop" role="presentation">
    <section className="manager-modal" role="dialog" aria-modal="true" aria-labelledby="manager-modal-title">
      <div className="manager-modal-header">
        <div><span className="section-eyebrow">Control de acceso</span><h2 id="manager-modal-title">Administrar jefes</h2></div>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar administración de jefes">×</button>
      </div>
      <form className="manager-form" onSubmit={onSubmit}>
        <label>Nombre completo<input type="text" value={name} onChange={onNameChange} placeholder="Ej. Ana López" required /></label>
        <label>RPE del jefe<input type="text" value={rpe} onChange={onRpeChange} placeholder="Ej. rpe12345" required /></label>
        <label>Contraseña inicial<input type="password" value={password} onChange={onPasswordChange} placeholder="Mínimo 6 caracteres" minLength="6" required /></label>
        <button className="btn-cfe" type="submit">Agregar jefe</button>
      </form>
      <div className="manager-list">
        <h3>Jefes registrados ({managers.length})</h3>
        {managers.map((manager) => (
          <div className="manager-row" key={manager.id}>
            <span className="manager-avatar" aria-hidden="true">{manager.name.charAt(0).toUpperCase()}</span>
            <span><strong>{manager.name}</strong><small>{manager.rpe} · Solo lectura</small></span>
            <button className="password-reset-button" type="button" onClick={() => onResetPassword(manager)}>Restablecer contraseña</button>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default ManagerModal;
