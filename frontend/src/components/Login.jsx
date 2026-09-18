import React, { useState } from 'react';
import { api } from '../services/api';
import './Login.css';

const logo = '/logocfekioscomobile-circulo.png';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

      onLogin({
        username: data.user?.username || username.trim(),
        role: data.user?.role || 'admin',
        nombre: data.user?.nombre || username.trim(),
        area: data.user?.area || null,
      });
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
              onChange={(e) => setUsername(e.target.value)}
              placeholder=""
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              required
            />
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
