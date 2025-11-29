import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  players: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    role: String, // 'Villageois', 'Loup-Garou', 'Voyante', 'Sorcière', 'Chasseur', 'Cupidon', 'Narrateur'
    specialRole: String, // Role spécial si applicable
    isAlive: {
      type: Boolean,
      default: true
    },
    linkedPlayer: String, // Pour Cupidon - l'ID du joueur lié
    hunterVotedThisRound: Boolean, // Pour Chasseur - a-t-il voté après élimination
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxPlayers: {
    type: Number,
    default: 12,
    min: 4,
    max: 20
  },
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'finished'],
    default: 'waiting'
  },
  phase: {
    type: String,
    enum: ['waiting', 'phase1', 'phase2', 'phase3', 'phase4', 'ended'],
    default: 'waiting'
  },
  messages: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    text: String,
    type: { type: String, enum: ['general', 'role'] },
    createdAt: { type: Date, default: Date.now }
  }],
  wolfVotes: {
    type: Map,
    of: [String], // key: targetPlayerId, value: array of wolf voterIds
    default: {}
  },
  dayVotes: {
    type: Map,
    of: [String], // key: targetPlayerId, value: array of voterIds
    default: {}
  },
  lastKilledPlayer: String, // ID du dernier joueur tué par les loups
  lastVotedPlayer: String, // ID du dernier joueur éliminé par vote
  announcedDeathPlayer: String, // ID du joueur dont la mort a été annoncée
  announcedEliminationPlayer: String, // ID du joueur dont l'élimination a été annoncée
  
  // Actions spéciales des rôles
  seenPlayer: String, // Voyante - le dernier joueur vu
  seenPlayerRole: String, // Le rôle du joueur vu par la voyante
  witchSaveUsed: Boolean, // Sorcière - a-t-elle sauvé cette nuit
  witchKillUsed: Boolean, // Sorcière - a-t-elle tué cette nuit
  witchSavedPlayer: String, // ID du joueur sauvé par la sorcière
  
  winner: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Game', gameSchema);
