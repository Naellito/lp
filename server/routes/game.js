import express from 'express';
import Game from '../models/Game.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Générer un code de partie aléatoire
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Créer une nouvelle partie
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name, maxPlayers } = req.body;
    const code = generateGameCode();

    const game = new Game({
      name,
      code,
      host: req.user.userId,
      maxPlayers: maxPlayers || 12,
      players: [{
        user: req.user.userId,
        username: req.user.username
      }],
      messages: []
    });

    await game.save();

    res.status(201).json({
      message: 'Partie créée avec succès',
      game: {
        id: game._id,
        name: game.name,
        code: game.code,
        maxPlayers: game.maxPlayers,
        currentPlayers: game.players.length
      }
    });
  } catch (error) {
    console.error('Erreur création partie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Rejoindre une partie
router.post('/join', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;

    const game = await Game.findOne({ code: code.toUpperCase() });
    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'La partie a déjà commencé' });
    }

    if (game.players.length >= game.maxPlayers) {
      return res.status(400).json({ message: 'La partie est complète' });
    }

    // Vérifier si le joueur n'est pas déjà dans la partie
    const alreadyJoined = game.players.some(
      p => p.user.toString() === req.user.userId
    );
    if (alreadyJoined) {
      return res.status(400).json({ message: 'Vous êtes déjà dans cette partie' });
    }

    console.log(`[JOIN] User ${req.user.username} (${req.user.userId}) joining game ${game.code}`);
    console.log(`[JOIN] Players before: ${game.players.length}`);

    game.players.push({
      user: req.user.userId,
      username: req.user.username
    });

    await game.save();

    res.json({
      message: 'Partie rejointe avec succès',
      game: {
        id: game._id,
        name: game.name,
        code: game.code,
        currentPlayers: game.players.length,
        maxPlayers: game.maxPlayers
      }
    });
  } catch (error) {
    console.error('Erreur rejoindre partie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Lister les parties disponibles
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const games = await Game.find({ status: 'waiting' })
      .populate('host', 'username')
      .sort({ createdAt: -1 })
      .limit(20);

    const gamesList = games.map(game => ({
      id: game._id,
      name: game.name,
      code: game.code,
      host: game.host ? game.host.username : 'Supprimé',
      currentPlayers: game.players.length,
      maxPlayers: game.maxPlayers,
      createdAt: game.createdAt
    }));

    res.json({ games: gamesList });
  } catch (error) {
    console.error('Erreur liste parties:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer les détails d'une partie
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate({
        path: 'host',
        select: 'username _id'
      })
      .populate({
        path: 'players.user',
        select: 'username _id'
      });

    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    res.json({
      game: {
        id: game._id,
        name: game.name,
        code: game.code,
        host: game.host,
        players: game.players,
        maxPlayers: game.maxPlayers,
        status: game.status,
        phase: game.phase,
        messages: game.messages,
        wolfVotes: Object.fromEntries(game.wolfVotes || []),
        dayVotes: Object.fromEntries(game.dayVotes || []),
        lastKilledPlayer: game.lastKilledPlayer,
        lastVotedPlayer: game.lastVotedPlayer,
        announcedDeathPlayer: game.announcedDeathPlayer,
        announcedEliminationPlayer: game.announcedEliminationPlayer,
        createdAt: game.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur récupération partie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Démarrer une partie et attribuer les rôles
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    // Vérifier que c'est l'hôte qui démarre
    if (game.host.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Seul l\'hôte peut démarrer la partie' });
    }

    // Vérifier qu'il y a au moins 4 joueurs (dont le narrateur)
    if (game.players.length < 4) {
      return res.status(400).json({ 
        message: `Au moins 4 joueurs requis (actuellement: ${game.players.length})` 
      });
    }

    // Attribuer "Narrateur" au host
    const narratorPlayer = game.players.find(p => p.user.toString() === game.host.toString());
    if (narratorPlayer) {
      narratorPlayer.role = 'Narrateur';
    }

    // Attribuer les rôles aux autres joueurs (sans le narrateur)
    const otherPlayers = game.players.filter(p => p.user.toString() !== game.host.toString());
    const playerCount = otherPlayers.length;
    const wolfCount = Math.max(1, Math.floor(playerCount / 3)); // 1 loup pour 3 joueurs
    
    // Créer un tableau de rôles avec les spéciaux
    const roles = [];
    const specialRoles = ['Voyante', 'Sorcière', 'Chasseur', 'Cupidon'];
    const specialRolesToAssign = [];
    
    // Ajouter des rôles spéciaux selon le nombre de joueurs
    if (playerCount >= 6) specialRolesToAssign.push('Voyante');
    if (playerCount >= 7) specialRolesToAssign.push('Sorcière');
    if (playerCount >= 8) specialRolesToAssign.push('Chasseur');
    if (playerCount >= 10) specialRolesToAssign.push('Cupidon');
    
    // Ajouter les loups
    for (let i = 0; i < wolfCount; i++) {
      roles.push('Loup-Garou');
    }
    
    // Ajouter les rôles spéciaux
    specialRolesToAssign.forEach(role => {
      roles.push('Villageois'); // Ils sont villageois + rôle spécial
    });
    
    // Remplir avec des villageois normaux
    while (roles.length < playerCount) {
      roles.push('Villageois');
    }

    // Mélanger les rôles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    
    // Mélanger les rôles spéciaux
    for (let i = specialRolesToAssign.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [specialRolesToAssign[i], specialRolesToAssign[j]] = [specialRolesToAssign[j], specialRolesToAssign[i]];
    }

    // Attribuer les rôles aux autres joueurs
    let specialRoleIndex = 0;
    otherPlayers.forEach((player, index) => {
      player.role = roles[index];
      
      // Assigner les rôles spéciaux aux villageois
      if (player.role === 'Villageois' && specialRoleIndex < specialRolesToAssign.length) {
        player.specialRole = specialRolesToAssign[specialRoleIndex];
        specialRoleIndex++;
      }
    });
    
    // Gérer Cupidon - créer le lien au début
    const cupidoPlayer = otherPlayers.find(p => p.specialRole === 'Cupidon');
    if (cupidoPlayer) {
      // Choisir 2 autres joueurs aléatoirement pour le lien
      const otherPlayersCopy = otherPlayers.filter(p => p.user.toString() !== cupidoPlayer.user.toString());
      if (otherPlayersCopy.length >= 2) {
        const linked1 = otherPlayersCopy[Math.floor(Math.random() * otherPlayersCopy.length)];
        const linked2 = otherPlayersCopy.filter(p => p.user.toString() !== linked1.user.toString())[Math.floor(Math.random() * (otherPlayersCopy.length - 1))];
        
        linked1.linkedPlayer = linked2.user.toString();
        linked2.linkedPlayer = linked1.user.toString();
      }
    }

    game.status = 'in-progress';
    game.phase = 'phase1';
    await game.save();

    res.json({
      message: 'Partie démarrée',
      game: {
        id: game._id,
        status: game.status,
        phase: game.phase,
        players: game.players
      }
    });
  } catch (error) {
    console.error('Erreur démarrage partie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Voter pour éliminer un joueur
router.post('/:id/vote', authMiddleware, async (req, res) => {
  try {
    const { targetPlayerId } = req.body;
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    if (game.phase !== 'vote') {
      return res.status(400).json({ message: 'Ce n\'est pas la phase de vote' });
    }

    // Vérifier que le joueur est dans la partie
    const voter = game.players.find(p => p.user.toString() === req.user.userId);
    if (!voter) {
      return res.status(403).json({ message: 'Vous n\'êtes pas dans cette partie' });
    }

    // Vérifier que le joueur n\'est pas mort
    if (!voter.isAlive) {
      return res.status(400).json({ message: 'Les morts ne peuvent pas voter' });
    }

    // Vérifier que la cible existe
    const target = game.players.find(p => p.user.toString() === targetPlayerId);
    if (!target) {
      return res.status(404).json({ message: 'Joueur cible non trouvé' });
    }

    // TODO: Implémenter le système de vote complet
    // Pour l'instant, on supprime juste le joueur
    target.isAlive = false;

    await game.save();

    res.json({
      message: 'Vote enregistré',
      game: {
        id: game._id,
        players: game.players
      }
    });
  } catch (error) {
    console.error('Erreur vote:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Vote des loups
router.post('/:id/wolf-vote', authMiddleware, async (req, res) => {
  try {
    const { targetPlayerId } = req.body;
    const game = await Game.findById(req.params.id);

    if (!game) return res.status(404).json({ message: 'Partie non trouvée' });
    if (game.phase !== 'phase2') return res.status(400).json({ message: 'Ce n\'est pas la phase de vote des loups' });

    const voter = game.players.find(p => p.user.toString() === req.user.userId);
    if (!voter || voter.role !== 'Loup-Garou' || !voter.isAlive) {
      return res.status(403).json({ message: 'Vous ne pouvez pas voter' });
    }

    const target = game.players.find(p => p.user.toString() === targetPlayerId);
    if (!target || !target.isAlive) {
      return res.status(404).json({ message: 'Joueur cible invalide' });
    }

    // Vérifier si le loup a déjà voté pour cette même personne
    let alreadyVoted = false;
    const keysToDelete = []; // Garder trace des clés à supprimer
    
    game.wolfVotes.forEach((voters, targetId) => {
      const voterIndex = voters.indexOf(req.user.userId);
      if (voterIndex > -1) {
        if (targetId === targetPlayerId) {
          // Retirer le vote (désélectionner)
          voters.splice(voterIndex, 1);
          alreadyVoted = true;
          // Si la liste est vide, marquer pour suppression
          if (voters.length === 0) {
            keysToDelete.push(targetId);
          }
        } else {
          // Retirer le vote précédent s'il y en a un autre
          voters.splice(voterIndex, 1);
          // Si la liste est vide, marquer pour suppression
          if (voters.length === 0) {
            keysToDelete.push(targetId);
          }
        }
      }
    });

    // Supprimer les clés vides
    keysToDelete.forEach(key => game.wolfVotes.delete(key));

    // Ajouter le nouveau vote seulement s'il n'y avait pas de vote pour cette cible
    if (!alreadyVoted) {
      if (!game.wolfVotes.has(targetPlayerId)) {
        game.wolfVotes.set(targetPlayerId, []);
      }
      game.wolfVotes.get(targetPlayerId).push(req.user.userId);
    }

    // Marquer pour la sauvegarde
    game.markModified('wolfVotes');
    await game.save();

    res.json({ message: 'Vote de loup enregistré', wolfVotes: Object.fromEntries(game.wolfVotes || []) });
  } catch (error) {
    console.error('Erreur vote loup:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Le narrateur tue un joueur (phase 2 - après le vote des loups)
router.post('/:id/kill-player', authMiddleware, async (req, res) => {
  try {
    const { targetPlayerId } = req.body;
    const game = await Game.findById(req.params.id);

    if (!game) return res.status(404).json({ message: 'Partie non trouvée' });
    if (game.phase !== 'phase2') return res.status(400).json({ message: 'Ce n\'est pas le moment pour tuer' });

    // Vérifier que c'est le narrateur
    if (game.host.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Seul le narrateur peut tuer' });
    }

    const target = game.players.find(p => p.user.toString() === targetPlayerId);
    if (!target || !target.isAlive) {
      return res.status(404).json({ message: 'Joueur cible invalide' });
    }

    // Tuer le joueur
    target.isAlive = false;
    game.lastKilledPlayer = targetPlayerId;
    
    // Réinitialiser les votes
    game.wolfVotes.clear();
    game.markModified('wolfVotes');

    await game.save();

    res.json({ message: 'Joueur éliminé', lastKilledPlayer: game.lastKilledPlayer });
  } catch (error) {
    console.error('Erreur tuer joueur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Vote des villageois (phase 4)
router.post('/:id/day-vote', authMiddleware, async (req, res) => {
  try {
    const { targetPlayerId } = req.body;
    const game = await Game.findById(req.params.id);

    if (!game) return res.status(404).json({ message: 'Partie non trouvée' });
    if (game.phase !== 'phase4') return res.status(400).json({ message: 'Ce n\'est pas la phase de vote des villageois' });

    const voter = game.players.find(p => p.user.toString() === req.user.userId);
    if (!voter || !voter.isAlive) {
      return res.status(403).json({ message: 'Vous ne pouvez pas voter' });
    }

    const target = game.players.find(p => p.user.toString() === targetPlayerId);
    if (!target || !target.isAlive) {
      return res.status(404).json({ message: 'Joueur cible invalide' });
    }

    // Vérifier si le joueur a déjà voté pour cette même personne
    let alreadyVoted = false;
    const keysToDelete = []; // Garder trace des clés à supprimer
    
    game.dayVotes.forEach((voters, targetId) => {
      const voterIndex = voters.indexOf(req.user.userId);
      if (voterIndex > -1) {
        if (targetId === targetPlayerId) {
          // Retirer le vote (désélectionner)
          voters.splice(voterIndex, 1);
          alreadyVoted = true;
          // Si la liste est vide, marquer pour suppression
          if (voters.length === 0) {
            keysToDelete.push(targetId);
          }
        } else {
          // Retirer le vote précédent s'il y en a un autre
          voters.splice(voterIndex, 1);
          // Si la liste est vide, marquer pour suppression
          if (voters.length === 0) {
            keysToDelete.push(targetId);
          }
        }
      }
    });

    // Supprimer les clés vides
    keysToDelete.forEach(key => game.dayVotes.delete(key));

    // Ajouter le nouveau vote seulement s'il n'y avait pas de vote pour cette cible
    if (!alreadyVoted) {
      if (!game.dayVotes.has(targetPlayerId)) {
        game.dayVotes.set(targetPlayerId, []);
      }
      game.dayVotes.get(targetPlayerId).push(req.user.userId);
    }

    game.markModified('dayVotes');
    await game.save();

    res.json({ message: 'Vote enregistré', dayVotes: Object.fromEntries(game.dayVotes || []) });
  } catch (error) {
    console.error('Erreur vote jour:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Le narrateur élimine un joueur par vote (phase 4)
router.post('/:id/eliminate-player', authMiddleware, async (req, res) => {
  try {
    const { targetPlayerId } = req.body;
    const game = await Game.findById(req.params.id);

    if (!game) return res.status(404).json({ message: 'Partie non trouvée' });
    if (game.phase !== 'phase4') return res.status(400).json({ message: 'Ce n\'est pas le moment pour éliminer' });

    // Vérifier que c'est le narrateur
    if (game.host.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Seul le narrateur peut éliminer' });
    }

    const target = game.players.find(p => p.user.toString() === targetPlayerId);
    if (!target || !target.isAlive) {
      return res.status(404).json({ message: 'Joueur cible invalide' });
    }

    // Éliminer le joueur
    target.isAlive = false;
    game.lastVotedPlayer = targetPlayerId;
    
    // Réinitialiser les votes
    game.dayVotes.clear();
    game.markModified('dayVotes');

    await game.save();

    res.json({ message: 'Joueur éliminé', lastVotedPlayer: game.lastVotedPlayer });
  } catch (error) {
    console.error('Erreur éliminer joueur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Changer la phase (seulement pour le narrateur)
router.post('/:id/change-phase', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    // Vérifier que c'est le narrateur (l'hôte)
    if (game.host.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Seul le narrateur peut changer la phase' });
    }

    const { newPhase } = req.body;
    const validPhases = ['phase1', 'phase2', 'phase3', 'phase4', 'ended'];

    if (!validPhases.includes(newPhase)) {
      return res.status(400).json({ message: 'Phase invalide' });
    }

    game.phase = newPhase;
    if (newPhase === 'ended') {
      game.status = 'finished';
    }

    await game.save();

    res.json({
      message: 'Phase changée',
      game: {
        id: game._id,
        phase: game.phase,
        status: game.status
      }
    });
  } catch (error) {
    console.error('Erreur changement phase:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Quitter une partie
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    // Vérifier si l'utilisateur est l'hôte (créateur)
    const isHost = game.host.toString() === req.user.userId;

    if (isHost) {
      // Si l'hôte quitte, supprimer la partie entière
      console.log(`[LEAVE] Host ${req.user.username} quitting game ${game.code}, deleting game`);
      await Game.findByIdAndDelete(req.params.id);
      
      return res.json({
        message: 'Partie supprimée',
        gameDeleted: true
      });
    } else {
      // Si un joueur normal quitte, le supprimer de la liste des joueurs
      console.log(`[LEAVE] Player ${req.user.username} quitting game ${game.code}`);
      game.players = game.players.filter(
        p => p.user.toString() !== req.user.userId
      );

      await game.save();

      return res.json({
        message: 'Vous avez quitté la partie',
        game: {
          id: game._id,
          currentPlayers: game.players.length
        }
      });
    }
  } catch (error) {
    console.error('Erreur quitter partie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Envoyer un message
router.post('/:id/message', authMiddleware, async (req, res) => {
  try {
    const { text, type } = req.body; // type: 'general' ou 'role'
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    // Vérifier que l'utilisateur est dans la partie
    const playerInGame = game.players.some(p => p.user.toString() === req.user.userId);
    if (!playerInGame) {
      return res.status(403).json({ message: 'Vous n\'êtes pas dans cette partie' });
    }

    // Ajouter le message
    game.messages.push({
      user: req.user.userId,
      username: req.user.username,
      text: text.trim(),
      type: type || 'general'
    });

    await game.save();
    console.log(`[MESSAGE] ${req.user.username} sent ${type} message`);

    res.json({ message: 'Message envoyé' });
  } catch (error) {
    console.error('Erreur envoi message:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Annoncer la mort d'un joueur (narrateur seulement)
router.post('/:id/announce-death', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    // Vérifier que c'est le narrateur ou l'hôte
    const playerInGame = game.players.find(p => p.user.toString() === req.user.userId);
    const isNarrator = (playerInGame && playerInGame.role === 'Narrateur') || game.host.toString() === req.user.userId;

    if (!isNarrator) {
      return res.status(403).json({ message: 'Seul le narrateur peut annoncer la mort' });
    }

    // Marquer la mort comme annoncée
    game.announcedDeathPlayer = game.lastKilledPlayer;
    await game.save();

    res.json({ message: 'Mort annoncée à tous les joueurs', announcedDeathPlayer: game.announcedDeathPlayer });
  } catch (error) {
    console.error('Erreur annonce mort:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Annoncer l'élimination d'un joueur (narrateur seulement)
router.post('/:id/announce-elimination', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    // Vérifier que c'est le narrateur ou l'hôte
    const playerInGame = game.players.find(p => p.user.toString() === req.user.userId);
    const isNarrator = (playerInGame && playerInGame.role === 'Narrateur') || game.host.toString() === req.user.userId;

    if (!isNarrator) {
      return res.status(403).json({ message: 'Seul le narrateur peut annoncer l\'élimination' });
    }

    // Marquer l'élimination comme annoncée
    game.announcedEliminationPlayer = game.lastVotedPlayer;
    await game.save();

    res.json({ message: 'Élimination annoncée à tous les joueurs', announcedEliminationPlayer: game.announcedEliminationPlayer });
  } catch (error) {
    console.error('Erreur annonce élimination:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Voyante voit un joueur (phase 2)
router.post('/:id/seer-action', authMiddleware, async (req, res) => {
  try {
    const { targetPlayerId } = req.body;
    const game = await Game.findById(req.params.id);

    if (!game) return res.status(404).json({ message: 'Partie non trouvée' });
    if (game.phase !== 'phase2') return res.status(400).json({ message: 'Ce n\'est pas la phase pour la voyante' });

    // Vérifier que le joueur est voyante
    const seer = game.players.find(p => p.user.toString() === req.user.userId && p.specialRole === 'Voyante' && p.isAlive);
    if (!seer) return res.status(403).json({ message: 'Vous n\'êtes pas la voyante' });

    const target = game.players.find(p => p.user.toString() === targetPlayerId && p.isAlive);
    if (!target) return res.status(404).json({ message: 'Joueur cible invalide' });

    // Enregistrer le joueur vu
    game.seenPlayer = targetPlayerId;
    game.seenPlayerRole = target.role;
    
    await game.save();

    res.json({ message: 'Voyante a vu le joueur', seenPlayerRole: target.role });
  } catch (error) {
    console.error('Erreur action voyante:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Sorcière sauve ou tue (phase 2)
router.post('/:id/witch-action', authMiddleware, async (req, res) => {
  try {
    const { action, targetPlayerId } = req.body; // action: 'save' ou 'kill'
    const game = await Game.findById(req.params.id);

    if (!game) return res.status(404).json({ message: 'Partie non trouvée' });
    if (game.phase !== 'phase2') return res.status(400).json({ message: 'Ce n\'est pas la phase pour la sorcière' });

    // Vérifier que le joueur est sorcière
    const witch = game.players.find(p => p.user.toString() === req.user.userId && p.specialRole === 'Sorcière' && p.isAlive);
    if (!witch) return res.status(403).json({ message: 'Vous n\'êtes pas la sorcière' });

    const target = game.players.find(p => p.user.toString() === targetPlayerId && p.isAlive);
    if (!target) return res.status(404).json({ message: 'Joueur cible invalide' });

    if (action === 'save') {
      game.witchSaveUsed = true;
      game.witchSavedPlayer = targetPlayerId;
    } else if (action === 'kill') {
      game.witchKillUsed = true;
      target.isAlive = false;
    }

    await game.save();

    res.json({ message: `Sorcière a ${action === 'save' ? 'sauvé' : 'tué'} ${target.username}` });
  } catch (error) {
    console.error('Erreur action sorcière:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;

