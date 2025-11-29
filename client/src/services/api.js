import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajouter le token JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalide/expiré, nettoyer le localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('gameId');
      localStorage.removeItem('gameCode');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (username, password) => 
    api.post('/auth/register', { username, password }),
  
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
};

export const gameAPI = {
  createGame: (name, maxPlayers) => 
    api.post('/game/create', { name, maxPlayers }),
  
  joinGame: (code) => 
    api.post('/game/join', { code }),
  
  listGames: () => 
    api.get('/game/list'),

  getGame: (gameId) =>
    api.get(`/game/${gameId}`),

  startGame: (gameId) =>
    api.post(`/game/${gameId}/start`),

  endGame: (gameId) => 
    api.post(`/game/${gameId}/end`),

  wolfVote: (gameId, targetPlayerId) =>
    api.post(`/game/${gameId}/wolf-vote`, { targetPlayerId }),

  killPlayer: (gameId, targetPlayerId) =>
    api.post(`/game/${gameId}/kill-player`, { targetPlayerId }),

  dayVote: (gameId, targetPlayerId) =>
    api.post(`/game/${gameId}/day-vote`, { targetPlayerId }),

  eliminatePlayer: (gameId, targetPlayerId) =>
    api.post(`/game/${gameId}/eliminate-player`, { targetPlayerId }),

  changePhase: (gameId, newPhase) =>
    api.post(`/game/${gameId}/change-phase`, { newPhase }),

  leaveGame: (gameId) =>
    api.post(`/game/${gameId}/leave`),

  sendMessage: (gameId, text, type) =>
    api.post(`/game/${gameId}/message`, { text, type }),

  announceDeath: (gameId) =>
    api.post(`/game/${gameId}/announce-death`),

  announceElimination: (gameId) =>
    api.post(`/game/${gameId}/announce-elimination`),

  seerAction: (gameId, targetPlayerId) =>
    api.post(`/game/${gameId}/seer-action`, { targetPlayerId }),

  witchAction: (gameId, action, targetPlayerId) =>
    api.post(`/game/${gameId}/witch-action`, { action, targetPlayerId }),
};

export default api;
