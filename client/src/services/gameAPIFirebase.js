// Firebase API wrapper for Game functions
// To be used instead of the current API client

import { 
  getGame, 
  startGame, 
  sendMessage, 
  castWolfVote, 
  castDayVote,
  seerAction,
  witchAction,
} from './firebase';

export const gameAPIFirebase = {
  
  // Get game details
  getGame: async (gameId) => {
    return await getGame(gameId);
  },

  // Start the game (assign roles)
  startGame: async (gameId) => {
    return await startGame(gameId);
  },

  // Send a message in the game
  sendMessage: async (gameId, userId, text, type = 'general') => {
    return await sendMessage(gameId, userId, text, type);
  },

  // Cast a wolf vote during night phase
  castWolfVote: async (gameId, voterId, targetId) => {
    return await castWolfVote(gameId, voterId, targetId);
  },

  // Cast a day vote during day phase
  castDayVote: async (gameId, voterId, targetId) => {
    return await castDayVote(gameId, voterId, targetId);
  },

  // Seer action - reveal a player's role
  seerAction: async (gameId, userId, targetId) => {
    return await seerAction(gameId, userId, targetId);
  },

  // Witch action - save or kill
  witchAction: async (gameId, userId, targetId, action) => {
    return await witchAction(gameId, userId, targetId, action);
  },

  // Update game phase
  updateGamePhase: async (gameId, newPhase) => {
    // To be implemented
    console.log(`Update game ${gameId} to phase ${newPhase}`);
  },

  // End the game
  endGame: async (gameId, winners) => {
    // To be implemented
    console.log(`End game ${gameId}`, winners);
  },

  // Get game stats
  getGameStats: async (gameId) => {
    // To be implemented
    console.log(`Get stats for game ${gameId}`);
  },
};

export default gameAPIFirebase;
