import { useEffect, useState } from 'react';

const ActionFeedback = () => {
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const showFeedback = (event) => setFeedback(event.detail);
    window.addEventListener('app-feedback', showFeedback);
    return () => window.removeEventListener('app-feedback', showFeedback);
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 4200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  if (!feedback) return null;

  return (
    <div className={`action-feedback action-feedback-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
      <div>
        <strong>{feedback.type === 'success' ? 'Operación realizada' : 'No se pudo completar'}</strong>
        <span>{feedback.message}</span>
      </div>
      <button type="button" onClick={() => setFeedback(null)} aria-label="Cerrar notificación">×</button>
    </div>
  );
};

export default ActionFeedback;
