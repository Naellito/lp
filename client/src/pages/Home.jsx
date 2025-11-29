import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameAPI } from '../services/api';
import './Home.css';

function Home({ user, onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('create');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [gameCode, setGameCode] = useState('');

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const response = await gameAPI.listGames();
      setGames(response.data.games || []);
    } catch (err) {
      console.error('Erreur chargement parties:', err);
      setGames([]);
    }
  };

  const handleCreateGame = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await gameAPI.createGame(gameName, maxPlayers);
      setGameName('');
      
      // Rediriger vers la partie créée après 300ms pour la transition
      setTimeout(() => {
        navigate(`/game/${response.data.game.id}`);
      }, 300);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
      setLoading(false);
    }
  };

  const handleJoinGame = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await gameAPI.joinGame(gameCode);
      setGameCode('');
      
      // Rediriger vers la partie après 300ms pour la transition
      setTimeout(() => {
        navigate(`/game/${response.data.game.id}`);
      }, 300);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la connexion');
      setLoading(false);
    }
  };

  const handleJoinGameFromList = async (code) => {
    setError('');
    setLoading(true);

    try {
      const response = await gameAPI.joinGame(code);
      
      // Rediriger vers la partie après 300ms pour la transition
      setTimeout(() => {
        navigate(`/game/${response.data.game.id}`);
      }, 300);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la connexion à la partie');
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>LOUP-GAROU ONLINE</h1>
        <p>Jeu d'horreur en ligne</p>
        
        <div className="user-info">
          <span className="welcome-text">Bienvenue, <strong>{user?.username}</strong></span>
          <div className="header-buttons">
            <a 
              href="https://discord.gg/5gaGgcvWMC"
              target="_blank"
              rel="noopener noreferrer"
              className="discord-button"
            >
              Discord
            </a>
            <button 
              onClick={onLogout}
              className="logout-button"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="home-content">
        <div className="forms-panel">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Créer une partie
            </button>
            <button 
              className={`tab ${activeTab === 'join' ? 'active' : ''}`}
              onClick={() => setActiveTab('join')}
            >
              Rejoindre
            </button>
          </div>

          <div className="tab-content">
            {error && <div className="message error-message">{error}</div>}

            {activeTab === 'create' ? (
              <form onSubmit={handleCreateGame} className="game-form">
                <div className="input-group">
                  <label htmlFor="gameName">Nom de la partie</label>
                  <input
                    id="gameName"
                    type="text"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="Village maudit..."
                    required
                    className="horror-input"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="maxPlayers">Nombre de joueurs max (4-20)</label>
                  <input
                    id="maxPlayers"
                    type="number"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    min="4"
                    max="20"
                    className="horror-input"
                  />
                </div>

                <button
                  type="submit"
                  className="horror-button"
                  disabled={loading}
                >
                  {loading ? 'Création...' : 'CRÉER LA PARTIE'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinGame} className="game-form">
                <div className="input-group">
                  <label htmlFor="gameCode">Code de la partie</label>
                  <input
                    id="gameCode"
                    type="text"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    required
                    maxLength="6"
                    className="horror-input code-input"
                  />
                </div>

                <button
                  type="submit"
                  className="horror-button"
                  disabled={loading}
                >
                  {loading ? 'Connexion...' : 'REJOINDRE'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="games-list-panel">
          <div className="panel-header">
            <h2>Parties disponibles</h2>
            <button 
              onClick={loadGames}
              className="refresh-button"
            >
              ↻
            </button>
          </div>

          <div className="games-list">
            {games.length === 0 ? (
              <div className="no-games">
                <p>Aucune partie disponible</p>
                <p className="hint">Créez-en une !</p>
              </div>
            ) : (
              games.map((game) => (
                <div
                  key={game.id}
                  className="game-card"
                  onClick={() => handleJoinGameFromList(game.code)}
                >
                  <div className="game-card-header">
                    <h3>{game.name}</h3>
                    <span className="game-code">{game.code}</span>
                  </div>
                  <div className="game-card-info">
                    <span>{game.host}</span>
                    <span>{game.currentPlayers}/{game.maxPlayers}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <footer className="community-footer">
        <span className="community-text">Sabrina x Marwa</span>
      </footer>
    </div>
  );
}

export default Home;
