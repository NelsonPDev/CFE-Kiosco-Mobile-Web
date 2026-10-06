const ConfirmDialog = ({ title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }) => (
  <div className="confirm-dialog-backdrop" role="presentation">
    <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
      <h2 id="confirm-dialog-title">{title}</h2>
      <p id="confirm-dialog-message">{message}</p>
      <div className="confirm-dialog-actions">
        <button type="button" className="btn-cfe btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="button" className="device-danger-button" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </section>
  </div>
);

export default ConfirmDialog;
