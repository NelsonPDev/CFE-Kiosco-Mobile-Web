import { useState } from 'react';
import { getPasswordRequirements } from '../utils/validation';
import './PasswordInputWithRules.css';

const PasswordInputWithRules = ({
  password = '',
  confirmPassword = '',
  onPasswordChange,
  onConfirmPasswordChange,
  showConfirm = false,
  passwordLabel = 'Nueva contraseña',
  confirmLabel = 'Confirmar contraseña',
  isRequired = true,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const reqs = getPasswordRequirements(password);

  const requirementList = [
    { key: 'length', text: 'Entre 8 y 16 caracteres', met: reqs.length },
    { key: 'hasUpper', text: 'Al menos una mayuscula', met: reqs.hasUpper },
    { key: 'hasLower', text: 'Al menos una minuscula', met: reqs.hasLower },
    { key: 'hasNumber', text: 'Al menos un numero', met: reqs.hasNumber },
    { key: 'hasSymbol', text: 'Al menos un simbolo (@#$%&...)', met: reqs.hasSymbol },
  ];

  return (
    <div className="password-rules-container">
      <div className="password-field-group">
        <fieldset className="password-fieldset">
          <legend>{passwordLabel}</legend>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              required={isRequired}
              autoComplete="new-password"
            />
          </div>
        </fieldset>

        {showConfirm && (
          <fieldset className="password-fieldset">
            <legend>{confirmLabel}</legend>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange?.(e.target.value)}
                required={isRequired}
                autoComplete="new-password"
              />
            </div>
          </fieldset>
        )}

        <label className="password-show-checkbox">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          <span>Mostrar contraseña</span>
        </label>
      </div>

      <div className="password-requirements-card">
        <h4>Requisitos obligatorios:</h4>
        <ul className="password-requirements-list">
          {requirementList.map((item) => (
            <li key={item.key} className={item.met ? 'met' : ''}>
              <span className="req-icon">
                {item.met ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#007a3d" />
                    <path d="M8 12.5l2.5 2.5 5.5-5.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                )}
              </span>
              <span className="req-text">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PasswordInputWithRules;
