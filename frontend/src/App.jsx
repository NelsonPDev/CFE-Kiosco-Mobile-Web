import React, { useState } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import './index.css'

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (account) => {
    setUser(account);
  };

  return (
    <div className="App">
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard
          user={user}
          onLogout={() => setUser(null)}
        />
      )}
    </div>
  )
}

export default App
