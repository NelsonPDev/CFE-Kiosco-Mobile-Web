import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import ActionFeedback from './components/ActionFeedback'
import { getStoredSession, clearSession } from './services/api'
import './index.css'

function App() {
  const [user, setUser] = useState(() => getStoredSession()?.user || null);

  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth-logout', handleAuthLogout);
    return () => window.removeEventListener('auth-logout', handleAuthLogout);
  }, []);

  const handleLogin = (account) => {
    setUser(account);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  return (
    <div className="App">
      <ActionFeedback />
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard
          user={user}
          onLogout={handleLogout}
        />
      )}
    </div>
  )
}

export default App
