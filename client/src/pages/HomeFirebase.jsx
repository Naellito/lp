import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame, getGameByCode, joinGame, listGames } from '../services/firebase';
import './Home.css';

function HomeFirebase({ user, onLogout }) {
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
      // À implémenter avec Firestore
      console.log('Loading games from Firestore...');
      setGames([]);
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
      const gameRef = await createGame(user.uid, gameName, maxPlayers, 'classic');
      setGameName('');
      
      // Rediriger vers la partie créée après 300ms pour la transition
      setTimeout(() => {
        navigate(`/game/${gameRef.id}`);
      }, 300);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création');
      setLoading(false);
    }
  };

  const handleJoinGame = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const game = await getGameByCode(gameCode);
      if (!game) {
        setError('Partie non trouvée');
        setLoading(false);
        return;
      }

      await joinGame(game.id, user.uid, user.username);
      setGameCode('');
      
      // Rediriger vers la partie après 300ms pour la transition
      setTimeout(() => {
        navigate(`/game/${game.id}`);
      }, 300);
    } catch (err) {
      setError(err.message || 'Erreur lors de la connexion');
      setLoading(false);
    }
  };

  const handleJoinGameFromList = async (gameId) => {
    setError('');
    setLoading(true);

    try {
      await joinGame(gameId, user.uid, user.username);
      
      // Rediriger vers la partie après 300ms pour la transition
      setTimeout(() => {
        navigate(`/game/${gameId}`);
      }, 300);
    } catch (err) {
      setError(err.message || 'Erreur lors de la connexion à la partie');
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>LOUP-GAROU ONLINE</h1>
        <p>Jeu d'horreur en ligne</p>
        
        <div className="user-info">
          <span className="welcome-text">Bienvenue, <strong>{user?.username || user?.email}</strong></span>
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
            {success && <div className="message success-message">{success}</div>}

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
                  <label htmlFor="maxPlayers">Nombre de joueurs max</label>
                  <select
                    id="maxPlayers"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="horror-input"
                  >
                    <option value={4}>4 joueurs</option>
                    <option value={6}>6 joueurs</option>
                    <option value={8}>8 joueurs</option>
                    <option value={10}>10 joueurs</option>
                    <option value={12}>12 joueurs</option>
                    <option value={15}>15 joueurs</option>
                    <option value={20}>20 joueurs</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="horror-button"
                  disabled={loading}
                >
                  {loading ? '⏳ Création...' : '🐺 CRÉER LA PARTIE'}
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
                    className="horror-input"
                  />
                </div>

                <button 
                  type="submit"
                  className="horror-button"
                  disabled={loading}
                >
                  {loading ? '⏳ Connexion...' : '🔗 REJOINDRE'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="games-list-panel">
          <h2>🎮 Parties disponibles</h2>
          <div className="games-grid">
            {games.length === 0 ? (
              <p className="no-games">Aucune partie disponible</p>
            ) : (
              games.map(game => (
                <div key={game.id} className="game-card">
                  <h3>{game.name}</h3>
                  <p>Joueurs: {game.players?.length || 0}/{game.maxPlayers}</p>
                  <p>Code: <strong>{game.code}</strong></p>
                  <button 
                    onClick={() => handleJoinGameFromList(game.id)}
                    className="join-button"
                    disabled={loading}
                  >
                    Rejoindre
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeFirebase;
