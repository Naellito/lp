import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import LoginFirebase from './pages/LoginFirebase';
import RegisterFirebase from './pages/RegisterFirebase';
import HomeFirebase from './pages/HomeFirebase';
import Game from './pages/Game';
import AtmosphereEffects from './components/AtmosphereEffects';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // User is signed in
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          username: currentUser.displayName || currentUser.email.split('@')[0],
        });
        localStorage.setItem('userId', currentUser.uid);
      } else {
        // User is signed out
        setUser(null);
        localStorage.removeItem('userId');
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.clear();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#1a0f0f',
        color: '#fff',
        fontSize: '24px',
      }}>
        🐺 Chargement...
      </div>
    );
  }

  return (
    <Router>
      <AtmosphereEffects />
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/home" /> : <LoginFirebase onLogin={(uid, userData) => setUser({ uid, ...userData })} />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/home" /> : <RegisterFirebase onLogin={(uid, userData) => setUser({ uid, ...userData })} />} 
        />
        <Route 
          path="/home" 
          element={user ? <HomeFirebase user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/game/:gameId" 
          element={user ? <Game user={user} /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to={user ? "/home" : "/login"} />} />
      </Routes>
    </Router>
  );
}
