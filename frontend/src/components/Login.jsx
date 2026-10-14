import React, { useState } from 'react';
import { api, saveSession } from '../services/api';
import { sanitizeRpe } from '../utils/validation';
import './Login.css';

const logo = '/logocfekioscomobile-circulo.png';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Escribe un usuario y una contraseña para continuar.');
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.post('/api/auth/login', {
        username: username.trim(),
        password,
      });

      const userAccount = {
        username: data.user?.username || username.trim(),
        role: data.user?.role || 'admin',
        nombre: data.user?.nombre || username.trim(),
        areas: data.user?.departamentos || (data.user?.departamento ? [data.user.departamento] : []),
      };

      saveSession(data.token, userAccount);
      onLogin(userAccount);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Usuario o contraseña incorrectos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="CFE Kiosco Mobile" className="logo" />
          <h2>CFE Kiosco Mobile</h2>
          <p>Plataforma de Monitoreo</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario (RPE)</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(sanitizeRpe(e.target.value))}
              maxLength={5}
              placeholder=""
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input 
              type={showPassword ? 'text' : 'password'} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              required
            />
            <label className="login-show-password">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              <span>Mostrar contraseña</span>
            </label>
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" className="btn-cfe w-100" disabled={isLoading}>
            {isLoading ? 'Validando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
