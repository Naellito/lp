import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Game from './pages/Game';
import AtmosphereEffects from './components/AtmosphereEffects';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
  );

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const handleLogin = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    // Clear token from state FIRST
    setToken(null);
    setUser(null);
    // Then clear ALL localStorage entries explicitly
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('gameId');
    localStorage.removeItem('gameCode');
    // Full clear as backup
    localStorage.clear();
  };

  return (
    <Router>
      <AtmosphereEffects />
      <Routes>
        <Route 
          path="/login" 
          element={token ? <Navigate to="/home" /> : <Login onLogin={handleLogin} />} 
        />
        <Route 
          path="/register" 
          element={token ? <Navigate to="/home" /> : <Register onLogin={handleLogin} />} 
        />
        <Route 
          path="/home" 
          element={token ? <Home user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/game/:gameId" 
          element={token ? <Game user={user} /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to={token ? "/home" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
