export const sanitizeRpe = (val) => String(val || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
export const validateRpe = (val) => /^[a-zA-Z0-9]{5}$/.test(val);

export const sanitizeNombre = (val) => String(val || '').replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '').slice(0, 70);
export const validateNombre = (val) => {
  const trimmed = String(val || '').trim();
  return trimmed.length >= 2 && trimmed.length <= 70 && /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/.test(trimmed);
};

export const sanitizePuesto = (val) => String(val || '').replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '').slice(0, 60);
export const validatePuesto = (val) => {
  const trimmed = String(val || '').trim();
  return trimmed.length >= 2 && trimmed.length <= 60 && /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/.test(trimmed);
};

export const sanitizeInventario = (val) => String(val || '').replace(/[^0-9]/g, '').slice(0, 8);
export const validateInventario = (val) => /^[0-9]{8}$/.test(String(val || '').trim());

export const sanitizeSerie = (val) => String(val || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20).toUpperCase();
export const validateSerie = (val) => {
  const trimmed = String(val || '').trim();
  return trimmed.length >= 1 && trimmed.length <= 20 && /^[a-zA-Z0-9]+$/.test(trimmed);
};

export const sanitizePhone = (val) => String(val || '').replace(/[^0-9]/g, '').slice(0, 10);
export const validatePhone = (val) => /^[0-9]{10}$/.test(String(val || '').trim());

export const getPasswordRequirements = (password = '') => {
  const length = password.length >= 8 && password.length <= 16;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[@#$%&!^*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  return {
    length,
    hasUpper,
    hasLower,
    hasNumber,
    hasSymbol,
    isValid: length && hasUpper && hasLower && hasNumber && hasSymbol,
  };
};
