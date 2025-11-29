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

  // Cast a wolf vote during night phase (proper implementation)
  castWolfVote: async (gameId, voterId, targetId) => {
    return await castWolfVote(gameId, voterId, targetId);
  },

  // Cast a day vote during day phase (proper implementation)
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

  // Kill a player (used by narrator during night)
  killPlayer: async (gameId, targetId) => {
    console.log(`Kill player ${targetId} in game ${gameId}`);
    // This will be implemented with updateDoc to mark player isAlive = false
  },

  // Eliminate a player (used by narrator during day vote)
  eliminatePlayer: async (gameId, targetId) => {
    console.log(`Eliminate player ${targetId} in game ${gameId}`);
    // This will be implemented with updateDoc
  },

  // Announce death (reveal who was killed at night)
  announceDeath: async (gameId) => {
    console.log(`Announce death for game ${gameId}`);
    return { status: 'ok' };
  },

  // Announce elimination (reveal who was voted out during day)
  announceElimination: async (gameId) => {
    console.log(`Announce elimination for game ${gameId}`);
    return { status: 'ok' };
  },

  // Change game phase
  changePhase: async (gameId, newPhase) => {
    console.log(`Change game ${gameId} to phase ${newPhase}`);
    return { status: 'ok' };
  },

  // End the game
  endGame: async (gameId) => {
    console.log(`End game ${gameId}`);
    return { status: 'ok' };
  },

  // Leave a game
  leaveGame: async (gameId, userId) => {
    const { leaveGame } = await import('./firebase.js');
    return await leaveGame(gameId, userId);
  },
};

export default gameAPIFirebase;
