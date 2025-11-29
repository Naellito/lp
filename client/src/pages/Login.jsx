import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../services/api';
import './Auth.css';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(username, password);
      onLogin(response.data.token, response.data.user);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        className="auth-box"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div 
          className="wolf-icon"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          🐺
        </motion.div>

        <h1 className="horror-title blood-drip">LOUP-GAROU</h1>
        <p className="subtitle creepy-text">Entrez dans l'obscurité</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <motion.div 
              className="error-message"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              ⚠️ {error}
            </motion.div>
          )}

          <div className="input-group">
            <label htmlFor="username">Pseudo</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Votre pseudo"
              required
              className="horror-input"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="horror-input"
            />
          </div>

          <motion.button
            type="submit"
            className="horror-button"
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? 'Connexion...' : 'SE CONNECTER'}
          </motion.button>
        </form>

        <div className="auth-footer">
          <p>Pas encore de compte ?</p>
          <Link to="/register" className="link-button">
            Rejoindre la meute
          </Link>
        </div>
      </motion.div>

      <div className="fog-layer"></div>
      <div className="fog-layer fog-layer-2"></div>
    </div>
  );
}

export default Login;
