const PasswordModal = ({ isAdmin, target, password, confirmation, error, onPasswordChange, onConfirmationChange, onSubmit, onClose }) => (
  <div className="manager-modal-backdrop" role="presentation">
    <section className="manager-modal password-modal" role="dialog" aria-modal="true" aria-labelledby="password-modal-title">
      <div className="manager-modal-header">
        <div><span className="section-eyebrow">Seguridad</span><h2 id="password-modal-title">{isAdmin ? 'Restablecer contraseña' : 'Cambiar mi contraseña'}</h2></div>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar cambio de contraseña">×</button>
      </div>
      <form className="manager-form" onSubmit={onSubmit}>
        <p className="password-target">Cuenta: <strong>{target.name}</strong> ({target.rpe})</p>
        <label>Nueva contraseña<input type="password" value={password} onChange={onPasswordChange} placeholder="Mínimo 6 caracteres" minLength="6" required /></label>
        <label>Confirmar contraseña<input type="password" value={confirmation} onChange={onConfirmationChange} placeholder="Repite la contraseña" minLength="6" required /></label>
        {error && <p className="password-error" role="alert">{error}</p>}
        <button className="btn-cfe" type="submit">{isAdmin ? 'Restablecer contraseña' : 'Guardar contraseña'}</button>
      </form>
    </section>
  </div>
);

export default PasswordModal;
