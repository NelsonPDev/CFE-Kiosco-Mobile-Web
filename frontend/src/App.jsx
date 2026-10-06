import React, { useState } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import ActionFeedback from './components/ActionFeedback'
import { setAuthToken } from './services/api'
import './index.css'

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (account) => {
    setUser(account);
  };

  return (
    <div className="App">
      <ActionFeedback />
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard
          user={user}
          onLogout={() => {
            setAuthToken(null);
            setUser(null);
          }}
        />
      )}
    </div>
  )
}

export default App
