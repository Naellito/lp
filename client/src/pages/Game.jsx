import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gameAPIFirebase } from '../services/gameAPIFirebase';
import './Game.css';

function Game({ user }) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  
  // Alias pour compatibilité avec le code existant
  const gameAPI = gameAPIFirebase;
  
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gamePhase, setGamePhase] = useState('waiting');
  const [isHost, setIsHost] = useState(false);
  const [isNarrator, setIsNarrator] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [generalChat, setGeneralChat] = useState([]);
  const [roleChat, setRoleChat] = useState([]);
  const [generalChatMessage, setGeneralChatMessage] = useState('');
  const [roleChatMessage, setRoleChatMessage] = useState('');
  const [canWriteRoleChat, setCanWriteRoleChat] = useState(false);
  const [canWriteGeneralChat, setCanWriteGeneralChat] = useState(true); // Chat général accessible sauf la nuit
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [gameEndMessage, setGameEndMessage] = useState('');
  const [showGameEndMessage, setShowGameEndMessage] = useState(false);
  const [showGameStartAnimation, setShowGameStartAnimation] = useState(false);
  const [gameStartStep, setGameStartStep] = useState(0);
  const previousStatusRef = useRef(null);
  const previousPhaseRef = useRef(null);
  const [showPhaseAnimation, setShowPhaseAnimation] = useState(false);
  const [phaseAnimationStep, setPhaseAnimationStep] = useState(0);
  const [phaseAnimationClosing, setPhaseAnimationClosing] = useState(false);
  const [currentPhaseMessage, setCurrentPhaseMessage] = useState('');
  const [wolfVotes, setWolfVotes] = useState({}); // Votes des loups
  const [dayVotes, setDayVotes] = useState({}); // Votes des villageois
  const [gameMessage, setGameMessage] = useState(''); // Message immersif
  const [gameMessageType, setGameMessageType] = useState('info'); // 'info', 'death', 'elimination', 'success'
  const [showGameMessage, setShowGameMessage] = useState(false); // Afficher le message
  const [voteProgress, setVoteProgress] = useState(0); // Progression du vote en %
  const [audioEnabled, setAudioEnabled] = useState(true); // Activer/désactiver l'audio
  const audioRef = useRef(null); // Référence audio pour la musique de fond
  const previousPhaseForAudioRef = useRef(null); // Pour tracker le changement de musique
  const wolfHowlIntervalRef = useRef(null); // Pour l'intervalle du hurlement de loup
  const [announcedDeathPlayer, setAnnouncedDeathPlayer] = useState(null); // Track la mort annoncée
  const [announcedEliminationPlayer, setAnnouncedEliminationPlayer] = useState(null); // Track l'élimination annoncée
  const [userSpecialRole, setUserSpecialRole] = useState(null); // Rôle spécial de l'utilisateur
  const [seerTarget, setSeerTarget] = useState(null); // Cible de la voyante
  const [seerResult, setSeerResult] = useState(null); // Résultat vu par la voyante
  const [witchAction, setWitchAction] = useState(null); // Action de la sorcière
  const [witchTarget, setWitchTarget] = useState(null); // Cible de la sorcière

  useEffect(() => {
    loadGame();
    // Rafraîchir toutes les 2 secondes
    const interval = setInterval(loadGame, 2000);
    
    // Cleanup: quitter la partie si le composant est démonté
    return () => {
      clearInterval(interval);
      // Supprimer la partie si le joueur est le seul et quitte
      if (user?.uid && gameId && game?.players?.length === 1) {
        gameAPI.leaveGame(gameId, user.uid).catch(err => {
          console.error('Error leaving game on unmount:', err);
        });
      }
    };
  }, [gameId, user?.uid]);

  // Jouer la musique de fond quand la phase change
  useEffect(() => {
    if (gamePhase !== previousPhaseForAudioRef.current && gamePhase !== 'waiting') {
      // Jouer musique seulement pendant la nuit (phase1 et phase2)
      if (gamePhase === 'phase1' || gamePhase === 'phase2') {
        if (audioEnabled) {
          playBackgroundMusic(gamePhase);
          startWolfHowlCycle(); // Ajouter hurlement de loup
        }
      } else {
        stopBackgroundMusic(); // Arrêter musique le jour
        stopWolfHowlCycle();
      }
      previousPhaseForAudioRef.current = gamePhase;
    }
  }, [gamePhase, audioEnabled]);

  // Gérer l'activation/désactivation de l'audio
  useEffect(() => {
    if (!audioEnabled) {
      // Arrêter tous les sons quand on désactive l'audio
      stopBackgroundMusic();
      stopWolfHowlCycle();
    } else {
      // Redémarrer la musique si on est dans une phase de nuit
      if (gamePhase === 'phase1' || gamePhase === 'phase2') {
        playBackgroundMusic(gamePhase);
        startWolfHowlCycle();
      }
    }
  }, [audioEnabled]);

  // Surveiller les annonces de mort
  useEffect(() => {
    if (game && game.announcedDeathPlayer && game.announcedDeathPlayer !== announcedDeathPlayer) {
      const killedPlayer = game.players.find(p => p.uid === game.announcedDeathPlayer);
      if (killedPlayer) {
        const username = killedPlayer.username || (killedPlayer.user?.username);
        setGameMessage(`💀 ${username} a été tué par les loups cette nuit...`);
        setGameMessageType('death');
        setShowGameMessage(true);
        setAnnouncedDeathPlayer(game.announcedDeathPlayer);
        setTimeout(() => setShowGameMessage(false), 5000);
      }
    }
  }, [game?.announcedDeathPlayer, announcedDeathPlayer]);

  // Surveiller les annonces d'élimination
  useEffect(() => {
    if (game && game.announcedEliminationPlayer && game.announcedEliminationPlayer !== announcedEliminationPlayer) {
      const votedPlayer = game.players.find(p => p.uid === game.announcedEliminationPlayer);
      if (votedPlayer) {
        const username = votedPlayer.username || (votedPlayer.user?.username);
        setGameMessage(`⚖️ ${username} a été éliminé par le vote...`);
        setGameMessageType('elimination');
        setShowGameMessage(true);
        setAnnouncedEliminationPlayer(game.announcedEliminationPlayer);
        setTimeout(() => setShowGameMessage(false), 5000);
      }
    }
  }, [game?.announcedEliminationPlayer, announcedEliminationPlayer]);

  const loadGame = async () => {
    try {
      const gameData = await gameAPIFirebase.getGame(gameId);
      
      // Si le jeu n'existe pas
      if (!gameData) {
        console.error('Game not found:', gameId);
        stopBackgroundMusic();
        stopWolfHowlCycle();
        setError('Partie non trouvée');
        setTimeout(() => {
          navigate('/home');
        }, 2000);
        setLoading(false);
        return;
      }
      
      // Détecter si la partie vient de démarrer (utiliser ref pour suivre l'état précédent)
      if (previousStatusRef.current === 'waiting' && gameData.status === 'in-progress') {
        setShowGameStartAnimation(true);
        setGameStartStep(1);
        
        // Étape 1: "La partie commence..."
        setTimeout(() => setGameStartStep(2), 2000);
        
        // Étape 2: "La nuit tombe sur le village..."
        setTimeout(() => setGameStartStep(3), 4000);
        
        // Fin de l'animation
        setTimeout(() => {
          setShowGameStartAnimation(false);
          setGameStartStep(0);
        }, 6500);
      }
      
      // Détecter si la phase a changé
      if (previousPhaseRef.current && previousPhaseRef.current !== gameData.phase && gameData.status === 'in-progress') {
        triggerPhaseAnimation(gameData.phase);
      }
      previousPhaseRef.current = gameData.phase;
      
      // Mettre à jour le status précédent
      previousStatusRef.current = gameData.status;
      
      setGame(gameData);
      setGamePhase(gameData.phase);
      setWolfVotes(gameData.wolfVotes || {});
      setDayVotes(gameData.dayVotes || {});

      // Calculer la progression des votes
      if (gameData.phase === 'phase2') {
        const wolves = gameData.players.filter(p => p.role === 'Loup-Garou' && p.isAlive);
        const totalVoters = wolves.length;
        const voteCount = gameData.wolfVotes ? Object.values(gameData.wolfVotes).reduce((sum, voters) => sum + voters.length, 0) : 0;
        setVoteProgress(totalVoters > 0 ? (voteCount / totalVoters) * 100 : 0);
      } else if (gameData.phase === 'phase3') {
        // Phase 3 : Le matin se lève
      } else if (gameData.phase === 'phase4') {
        const aliveCount = gameData.players.filter(p => p.isAlive).length;
        const totalVoters = aliveCount;
        const voteCount = gameData.dayVotes ? Object.values(gameData.dayVotes).reduce((sum, voters) => sum + voters.length, 0) : 0;
        setVoteProgress(totalVoters > 0 ? (voteCount / totalVoters) * 100 : 0);
      }

      // Charger les messages depuis le serveur
      if (gameData.messages && Array.isArray(gameData.messages)) {
        const generalMessages = gameData.messages.filter(m => !m.type || m.type === 'general');
        const roleMessages = gameData.messages.filter(m => m.type === 'role');
        setGeneralChat(generalMessages.map(m => ({ ...m, username: m.username || m.user || 'Anonyme' })));
        setRoleChat(roleMessages.map(m => ({ ...m, username: m.username || m.user || 'Anonyme' })));
      }
      
      // Vérifier si l'utilisateur est l'hôte
      const userIsHost = gameData.host === user?.uid;
      if (userIsHost) {
        setIsHost(true);
      }

      // Récupérer le rôle de l'utilisateur
      const playerData = gameData.players.find(p => p.uid === user?.uid);
      
      if (playerData) {
        setUserRole(playerData.role);
        setUserSpecialRole(playerData.specialRole || null);
        // Si le rôle est "Narrateur" OU si c'est l'hôte et que la partie est en attente
        if (playerData.role === 'Narrateur' || (userIsHost && gameData.status === 'waiting')) {
          setIsNarrator(true);
        } else {
          setIsNarrator(false);
        }

        // Déterminer si le joueur peut écrire dans le chat rôle
        // Loups-Garous peuvent écrire pendant la phase 2 (nuit active)
        // Narrateur peut toujours lire et écrire
        if ((playerData.role === 'Loup-Garou' && gameData.phase === 'phase2') || playerData.role === 'Narrateur') {
          setCanWriteRoleChat(true);
        } else {
          setCanWriteRoleChat(false);
        }

        // Chat général: accessible seulement pendant le jour (phase3 et phase4)
        // La nuit (phase1 et phase2), seul le chat des loups est accessible
        if (gameData.phase === 'phase3' || gameData.phase === 'phase4' || gameData.phase === 'waiting') {
          setCanWriteGeneralChat(true);
        } else {
          setCanWriteGeneralChat(false);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading game:', err);
      setError(err.message || 'Erreur chargement partie');
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    try {
      await gameAPIFirebase.startGame(gameId);
      // Le polling via loadGame va détecter le changement de status et afficher l'animation
      loadGame();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur démarrage partie');
    }
  };

  const triggerPhaseAnimation = (newPhase) => {
    // Déterminer le message et la durée selon la phase
    let message1 = '';
    let message2 = '';
    let totalDuration = 6500;

    switch (newPhase) {
      case 'phase1':
        message1 = 'La nuit tombe...';
        message2 = 'Les villageois s\'endorment';
        break;
      case 'phase2':
        message1 = 'Les Loups-Garous se réveillent';
        message2 = 'À vous de choisir votre proie...';
        break;
      case 'phase3':
        message1 = 'L\'aube se lève';
        message2 = 'Un joueur a disparu...';
        break;
      case 'phase4':
        message1 = 'C\'est l\'heure du vote';
        message2 = 'Qui faut-il éliminer ?';
        break;
      default:
        return;
    }

    setShowPhaseAnimation(true);
    setPhaseAnimationClosing(false);
    setPhaseAnimationStep(1);
    setCurrentPhaseMessage(message1);

    // Étape 2: deuxième message
    setTimeout(() => {
      setPhaseAnimationStep(2);
      setCurrentPhaseMessage(message2);
    }, 2000);

    // Étape 3: commencer le fade out (1 seconde avant la fin)
    setTimeout(() => {
      setPhaseAnimationClosing(true);
    }, totalDuration - 1000);

    // Fin de l'animation
    setTimeout(() => {
      setShowPhaseAnimation(false);
      setPhaseAnimationStep(0);
      setPhaseAnimationClosing(false);
    }, totalDuration);
  };

  // Gérer la musique de fond selon la phase
  const playBackgroundMusic = (phase) => {
    if (!audioEnabled) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }

    let musicFile = '';
    let volume = 0.3; // Volume par défaut
    
    switch (phase) {
      case 'phase1':
        musicFile = '/audio/night-ambient.mp3';
        volume = 0.3;
        break;
      case 'phase2':
        musicFile = '/audio/wolf-night.mp3';
        volume = 0.3;
        break;
      case 'phase3':
        musicFile = '/audio/dawn.mp3';
        volume = 0.1; // Très bas pour Discord
        break;
      case 'phase4':
        musicFile = '/audio/night-ambient.mp3'; // Réutiliser nuit calme
        volume = 0.2;
        break;
      default:
        return;
    }

    // Fade out et changer la musique
    if (audioRef.current.src && audioRef.current.src !== musicFile) {
      audioRef.current.volume = 0;
      audioRef.current.pause();
      audioRef.current.src = musicFile;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(err => console.log('Audio play error:', err));
    } else if (!audioRef.current.src) {
      audioRef.current.src = musicFile;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(err => console.log('Audio play error:', err));
    }
  };

  // Arrêter la musique de fond
  const stopBackgroundMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  // Démarrer le cycle de hurlement de loup (toutes les 12 secondes)
  const startWolfHowlCycle = () => {
    // Arrêter l'intervalle précédent s'il existe
    if (wolfHowlIntervalRef.current) {
      clearInterval(wolfHowlIntervalRef.current);
    }

    // Jouer un hurlement immédiatement
    if (audioEnabled) {
      playSoundEffect('wolfHowl');
    }

    // Puis tous les 12 secondes
    wolfHowlIntervalRef.current = setInterval(() => {
      if (audioEnabled) {
        playSoundEffect('wolfHowl');
      }
    }, 12000);
  };

  // Arrêter le cycle de hurlement de loup
  const stopWolfHowlCycle = () => {
    if (wolfHowlIntervalRef.current) {
      clearInterval(wolfHowlIntervalRef.current);
      wolfHowlIntervalRef.current = null;
    }
  };

  // Jouer un effet sonore
  const playSoundEffect = (effect) => {
    if (!audioEnabled) return;
    
    const audioMap = {
      'vote': '/audio/vote-sound.mp3',
      'death': '/audio/death-sound.mp3',
      'elimination': '/audio/death-sound.mp3', // Réutiliser death-sound
      'wolfHowl': '/audio/wolf-howl.mp3' // Hurlement de loup
    };

    const src = audioMap[effect];
    if (src) {
      const audio = new Audio(src);
      audio.volume = effect === 'wolfHowl' ? 0.4 : 0.5; // Volume légèrement moins haut pour le hurlement
      audio.play().catch(err => console.log('Audio play error:', err));
    }
  };

  const handleVote = async (targetPlayerId) => {
    try {
      playSoundEffect('vote');
      await gameAPI.castDayVote(gameId, user?.uid, targetPlayerId);
      loadGame();
    } catch (err) {
      setError(err.message || 'Erreur vote');
    }
  };

  const handleWolfVote = async (targetPlayerId) => {
    try {
      playSoundEffect('vote');
      await gameAPI.castWolfVote(gameId, user?.uid, targetPlayerId);
      loadGame();
    } catch (err) {
      setError(err.message || 'Erreur vote loup');
    }
  };

  const handleKillPlayer = async (targetPlayerId) => {
    try {
      await gameAPI.killPlayer(gameId, targetPlayerId);
      loadGame();
    } catch (err) {
      setError(err.message || 'Erreur élimination');
    }
  };

  // Annoncer le joueur tué (à appeler le matin)
  const announceDeath = async () => {
    try {
      console.log('Announcing death for game:', gameId);
      const response = await gameAPI.announceDeath(gameId);
      console.log('Death announcement response:', response);
      loadGame(); // Recharger pour récupérer l'état mis à jour
    } catch (err) {
      console.error('Error announcing death:', err);
      setError(err.message || 'Erreur annonce mort');
    }
  };

  // Annoncer le joueur éliminé (à appeler après le vote)
  const announceElimination = async () => {
    try {
      console.log('Announcing elimination for game:', gameId);
      const response = await gameAPI.announceElimination(gameId);
      console.log('Elimination announcement response:', response);
      loadGame(); // Recharger pour récupérer l'état mis à jour
    } catch (err) {
      console.error('Error announcing elimination:', err);
      setError(err.message || 'Erreur annonce élimination');
    }
  };

  // Voyante voit un joueur
  const handleSeerAction = async (targetPlayerId) => {
    try {
      playSoundEffect('magic');
      const response = await gameAPI.seerAction(gameId, user?.uid, targetPlayerId);
      setSeerResult(response.seenPlayerRole);
      setSeerTarget(targetPlayerId);
      setGameMessage(`✨ Vous avez vu que ce joueur est ${response.seenPlayerRole === 'Loup-Garou' ? '🐺 Loup-Garou' : '👤 Villageois'}`);
      setGameMessageType('success');
      setShowGameMessage(true);
      setTimeout(() => setShowGameMessage(false), 4000);
      loadGame();
    } catch (err) {
      setError(err.message || 'Erreur action voyante');
    }
  };

  // Sorcière sauve ou tue
  const handleWitchAction = async (targetPlayerId, action) => {
    try {
      playSoundEffect('magic');
      const response = await gameAPI.witchAction(gameId, user?.uid, targetPlayerId, action);
      setWitchAction(action);
      setWitchTarget(targetPlayerId);
      const actionMsg = action === 'save' ? '🛡️ sauvé' : '💀 tué';
      setGameMessage(`✨ Vous avez ${actionMsg} ce joueur`);
      setGameMessageType('success');
      setShowGameMessage(true);
      setTimeout(() => setShowGameMessage(false), 4000);
      loadGame();
    } catch (err) {
      setError(err.message || 'Erreur action sorcière');
    }
  };

  const handleDayVote = async (targetPlayerId) => {
    try {
      playSoundEffect('vote');
      await gameAPI.castDayVote(gameId, user?.uid, targetPlayerId);
      loadGame();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur vote jour');
    }
  };

  const handleEliminatePlayer = async (targetPlayerId) => {
    try {
      await gameAPI.eliminatePlayer(gameId, targetPlayerId);
      loadGame();
    } catch (err) {
      setError(err.message || 'Erreur élimination');
    }
  };

  // Détermine quel rôle afficher pour un joueur
  const getDisplayRole = (player) => {
    if (!game) return '?';
    
    // Toujours '?' en phase d'attente
    if (gamePhase === 'waiting') {
      return '?';
    }
    
    // Vérifier si c'est le joueur actuel
    const isCurrentPlayer = (player.uid || player.user?._id) === user?.uid;
    
    // Le joueur voit toujours son propre rôle
    if (isCurrentPlayer) {
      return player.role || '?';
    }
    
    // Le Narrateur voit les rôles de tous
    if (isNarrator) {
      return player.role || '?';
    }
    
    // Trouver le rôle du joueur actuel pour vérifier les loups
    const currentPlayerData = game.players.find(p => {
      const pUserId = p.uid || (typeof p.user === 'object' ? p.user._id : p.user);
      return pUserId === user?.uid;
    });
    
    // Les Loups-Garous voient les rôles des autres Loups
    if (currentPlayerData && currentPlayerData.role === 'Loup-Garou' && player.role === 'Loup-Garou') {
      return player.role || '?';
    }
    
    // Sinon, on cache le rôle
    return '?';
  };

  const handleSendGeneralChat = (e) => {
    e.preventDefault();
    if (!generalChatMessage.trim()) return;
    
    const messageText = generalChatMessage;
    
    // Ajouter localement immédiatement
    const newMessage = {
      username: user?.username || 'Anonyme',
      text: messageText,
      type: 'general'
    };
    setGeneralChat([...generalChat, newMessage]);
    setGeneralChatMessage('');
    
    // Envoyer au serveur (sans recharger)
    gameAPI.sendMessage(gameId, user?.uid, messageText, 'general')
      .catch(err => console.error('Erreur envoi message:', err));
  };

  const handleSendRoleChat = (e) => {
    e.preventDefault();
    if (!roleChatMessage.trim()) return;
    
    const messageText = roleChatMessage;
    
    // Ajouter localement immédiatement
    const newMessage = {
      username: user?.username || 'Anonyme',
      text: messageText,
      type: 'role'
    };
    setRoleChat([...roleChat, newMessage]);
    setRoleChatMessage('');
    
    // Envoyer au serveur (sans recharger)
    gameAPI.sendMessage(gameId, user?.uid, messageText, 'role')
      .catch(err => console.error('Erreur envoi message:', err));
  };

  const handleEndGame = async () => {
    try {
      await gameAPI.endGame(gameId);
      loadGame();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur fin de partie');
    }
  };

  // Map les rôles aux images

  const handleChangePhase = async (newPhase) => {
    try {
      await gameAPI.changePhase(gameId, newPhase);
      loadGame();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur changement phase');
    }
  };

  const handleLeaveGameClick = () => {
    setShowLeaveConfirm(true);
  };

  const handleLeaveGameConfirm = async () => {
    setShowLeaveConfirm(false);
    try {
      const response = await gameAPI.leaveGame(gameId, user?.uid);
      
      // Afficher le message
      if (isHost) {
        setGameEndMessage('Le créateur a mis fin à la partie');
      } else {
        setGameEndMessage('Vous avez quitté la partie');
      }
      setShowGameEndMessage(true);
      
      // Rediriger après 2 secondes
      setTimeout(() => {
        navigate('/home');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la quittance');
    }
  };

  const handleLeaveGameCancel = () => {
    setShowLeaveConfirm(false);
  };

  if (loading) {
    return (
      <div className="game-container">
        <div className="loading">Chargement de la partie...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="game-container">
        <div className="loading">
          <p>{error || 'Partie introuvable'}</p>
          <button 
            onClick={() => navigate('/home')}
            className="action-button"
            style={{ marginTop: '20px' }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="game-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Ambiance atmosphérique */}
      <div className="fog-layer">
        <div className="fog fog-1"></div>
        <div className="fog fog-2"></div>
        <div className="fog fog-3"></div>
      </div>

      {/* Éléments visuels */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>
      <div className="ambient-glow glow-3"></div>

      {/* Lune */}
      <div className="moon"></div>

      {/* Étoiles filantes */}
      <div className="shooting-stars">
        <div className="shooting-star star-1"></div>
        <div className="shooting-star star-2"></div>
        <div className="shooting-star star-3"></div>
        <div className="shooting-star star-4"></div>
        <div className="shooting-star star-5"></div>
      </div>

      {/* Écran de chargement */}
      {loading || !game ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          color: '#fff',
          fontSize: '24px',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{animation: 'spin 1s linear infinite'}} >🐺</div>
          <div>Chargement de la partie...</div>
          <div style={{fontSize: '12px', color: '#aaa'}}>loading={String(loading)} game={String(!!game)}</div>
        </div>
      ) : (
      <>

      <motion.header 
        className="game-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="game-title">
          <h1>{game.name}</h1>
          <div className="game-controls">
            <button 
              className="audio-button"
              onClick={() => setAudioEnabled(!audioEnabled)}
              title={audioEnabled ? 'Désactiver l\'audio' : 'Activer l\'audio'}
            >
              {audioEnabled ? '🔊' : '🔇'}
            </button>
            <button 
              className="leave-button"
              onClick={handleLeaveGameClick}
            >
              {isHost ? '🚪 Quitter (supprime la partie)' : '🚪 Quitter'}
            </button>
          </div>
        </div>
        <div className="phase-info">
          <span className={`phase-badge ${gamePhase}`}>
            {gamePhase === 'waiting' && 'En attente'}
            {gamePhase === 'phase1' && '🌙 Phase 1 - Nuit (Sommeil)'}
            {gamePhase === 'phase2' && '🐺 Phase 2 - Nuit (Loups)'}
            {gamePhase === 'phase3' && '☀️ Phase 3 - Jour'}
            {gamePhase === 'phase4' && '🗳️ Phase 4 - Vote'}
            {gamePhase === 'ended' && '⚰️ Terminée'}
          </span>
          {userRole && isNarrator && (
            <span className="narrator-badge">👑 NARRATEUR</span>
          )}
          {userRole && !isNarrator && (
            <span className="user-role-badge">{userRole}</span>
          )}
        </div>
      </motion.header>

      {/* Message immersif */}
      {showGameMessage && (
        <motion.div 
          className={`game-message ${gameMessageType}`}
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          {gameMessage}
        </motion.div>
      )}

      {/* Barre de progression des votes */}
      {(gamePhase === 'phase2' || gamePhase === 'phase4') && (
        <motion.div 
          className="vote-progress-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="vote-progress-label">
            {gamePhase === 'phase2' ? '🐺 Votes des loups' : '🗳️ Votes des villageois'}
          </div>
          <div className="vote-progress-bar">
            <div 
              className="vote-progress-fill"
              style={{ width: `${voteProgress}%` }}
            ></div>
          </div>
          <div className="vote-progress-text">
            {Math.round(voteProgress)}% complété
          </div>
        </motion.div>
      )}

      <motion.div 
        className="game-layout"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {/* Colonne gauche: Joueurs */}
        <div className="players-column">
          <h2>Joueurs ({game.players.length}/{game.maxPlayers})</h2>
          <div className="players-list">
            {game.players.map((player) => (
              <div 
                key={player.uid} 
                className={`player-item ${!player.isAlive ? 'dead' : ''} ${
                  gamePhase === 'phase2' && wolfVotes[player.uid] && (isNarrator || userRole === 'Loup-Garou') ? 'voted-for' : ''
                } ${
                  gamePhase === 'phase4' && dayVotes[player.uid] ? 'voted-for' : ''
                }`}
              >
                <div className="player-avatar">
                  <span className={`status-dot ${player.isAlive ? 'alive' : 'dead'}`}></span>
                </div>
                <div className="player-info">
                  <div className="player-name">
                    {player.username}
                    {isNarrator && gamePhase === 'phase2' && wolfVotes[player.uid] && (
                      <span className="vote-count">({wolfVotes[player.uid].length} 🐺)</span>
                    )}
                    {gamePhase === 'phase4' && dayVotes[player.uid] && (
                      <span className="vote-count">({dayVotes[player.uid].length} ✓)</span>
                    )}
                  </div>
                  <div className="player-role-small">
                    {getDisplayRole(player)}
                  </div>
                </div>

                {/* Boutons pour Phase 2 - Vote des loups */}
                {gamePhase === 'phase2' && userRole === 'Loup-Garou' && player.isAlive && player.role !== 'Loup-Garou' && (
                  <button className="vote-btn wolf-btn" onClick={() => handleWolfVote(player.uid)} title="Voter pour tuer">
                    🐺
                  </button>
                )}

                {/* Bouton Voyante - Voir rôle */}
                {gamePhase === 'phase2' && userSpecialRole === 'Voyante' && player.isAlive && (player.uid || player.user?._id) !== user?.uid && (
                  <button className="vote-btn seer-btn" onClick={() => handleSeerAction(player.uid)} title="Voir le rôle">
                    👁️
                  </button>
                )}

                {/* Boutons Sorcière - Sauver ou Tuer */}
                {gamePhase === 'phase2' && userSpecialRole === 'Sorcière' && player.isAlive && (player.uid || player.user?._id) !== user?.uid && (
                  <div className="witch-action-buttons">
                    <button className="vote-btn witch-save" onClick={() => handleWitchAction(player.uid, 'save')} title="Sauver">
                      🛡️
                    </button>
                    <button className="vote-btn witch-kill" onClick={() => handleWitchAction(player.uid, 'kill')} title="Tuer">
                      💀
                    </button>
                  </div>
                )}

                {/* Bouton pour narrateur tuer en phase 2 */}
                {gamePhase === 'phase2' && isNarrator && player.isAlive && (
                  <button className="kill-btn" onClick={() => handleKillPlayer(player.uid)} title="Tuer ce joueur">
                    ☠️
                  </button>
                )}

                {/* Boutons pour Phase 4 - Vote des villageois */}
                {gamePhase === 'phase4' && player.isAlive && (player.uid || player.user?._id) !== user?.uid && (
                  <button className="vote-btn day-btn" onClick={() => handleDayVote(player.uid)} title="Voter pour éliminer">
                    🗳️
                  </button>
                )}

                {/* Bouton pour narrateur éliminer en phase 4 */}
                {gamePhase === 'phase4' && isNarrator && player.isAlive && (
                  <button className="eliminate-btn" onClick={() => handleEliminatePlayer(player.uid)} title="Éliminer ce joueur">
                    ⚖️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Colonne centre: Écran de jeu */}
        <div className="game-screen-column">
          <div className="game-screen">
            {error && (
              <div className="error-box">{error}</div>
            )}

            {gamePhase === 'waiting' && (
              <div className="screen-content waiting">
                <h3>En attente de joueurs...</h3>
                <p>Le village va bientôt s'endormir 🌙</p>
                {isNarrator && (
                  <button 
                    className="action-button primary"
                    onClick={handleStartGame}
                  >
                    Démarrer la partie
                  </button>
                )}
              </div>
            )}

            {gamePhase === 'phase1' && (
              <div className="screen-content phase1">
                {userRole !== 'Loup-Garou' && !isNarrator && <div className="blur-overlay"></div>}
                <h3>🌙 Phase 1 - Le village s'endort...</h3>
                <p>Attendez le réveil des loups...</p>
              </div>
            )}

            {gamePhase === 'phase2' && (
              <div className="screen-content phase2">
                {userRole !== 'Loup-Garou' && !isNarrator && userSpecialRole !== 'Voyante' && userSpecialRole !== 'Sorcière' && <div className="blur-overlay"></div>}
                <h3>🐺 Phase 2 - Les loups se réveillent</h3>
                
                {/* Loups-Garous */}
                {userRole === 'Loup-Garou' && (
                  <div>
                    <p>Concertez-vous avec vos compagnons</p>
                    <p className="role-message">Votez pour éliminer un villageois.</p>
                  </div>
                )}
                
                {/* Voyante */}
                {userSpecialRole === 'Voyante' && userRole !== 'Loup-Garou' && (
                  <div className="special-role-panel">
                    <h4>👁️ Voyante - Voir un joueur</h4>
                    <p className="role-message">Choisissez un joueur pour connaître son rôle</p>
                    {seerResult && (
                      <div className="seer-result">
                        ✨ Résultat: {seerResult === 'Loup-Garou' ? '🐺 Loup-Garou' : '👤 Villageois/Rôle spécial'}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Sorcière */}
                {userSpecialRole === 'Sorcière' && userRole !== 'Loup-Garou' && (
                  <div className="special-role-panel">
                    <h4>🔮 Sorcière - Sauver ou Tuer</h4>
                    <p className="role-message">
                      Vous pouvez sauver quelqu'un d'une mort certaine ou tuer un joueur
                    </p>
                    {witchAction && (
                      <div className="witch-result">
                        ✨ Action effectuée: {witchAction === 'save' ? '🛡️ Sauvegarde' : '💀 Tuerie'}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Autres joueurs */}
                {userRole !== 'Loup-Garou' && userSpecialRole !== 'Voyante' && userSpecialRole !== 'Sorcière' && (
                  <div>
                    <p>Vous dormez profondément...</p>
                    <p className="role-message">Attendez le matin...</p>
                  </div>
                )}
                
                {isNarrator && (
                  <div className="narrator-controls">
                    <button 
                      className="action-button secondary"
                      onClick={() => handleChangePhase('phase3')}
                    >
                      ☀️ Passer à la Phase 3 (Jour)
                    </button>
                  </div>
                )}
              </div>
            )}

            {gamePhase === 'phase3' && (
              <div className="screen-content phase3">
                <h3>☀️ Phase 3 - Le jour se lève</h3>
                <p>Débattez pour découvrir les loups</p>
                <div className="day-info">
                  <span>Joueurs vivants: {game.players.filter(p => p.isAlive).length}</span>
                  <span>Loups: {game.players.filter(p => p.role === 'Loup-Garou' && p.isAlive).length}</span>
                </div>
                {isNarrator && (
                  <div className="narrator-controls">
                    {game && game.lastKilledPlayer && (
                      <button 
                        className="action-button announce"
                        onClick={announceDeath}
                      >
                        📢 Annoncer la mort
                      </button>
                    )}
                    <button 
                      className="action-button secondary"
                      onClick={() => handleChangePhase('phase4')}
                    >
                      🗳️ Passer à la Phase 4 (Vote)
                    </button>
                  </div>
                )}
              </div>
            )}

            {gamePhase === 'phase4' && (
              <div className="screen-content phase4">
                <h3>🗳️ Phase 4 - Vote d'élimination</h3>
                <p>Votez pour éliminer un joueur</p>
                <div className="vote-buttons">
                  {game.players.filter(p => p.isAlive && (p.uid || p.user?._id) !== user?.uid).map((player) => (
                    <button 
                      key={player.uid || player.user?._id}
                      className="vote-button"
                      onClick={() => handleVote(player.uid || player.user?._id)}
                    >
                      {player.username || (player.user?.username)}
                    </button>
                  ))}
                </div>
                {isNarrator && (
                  <div className="narrator-controls">
                    {game && game.lastVotedPlayer && (
                      <button 
                        className="action-button announce"
                        onClick={announceElimination}
                      >
                        📢 Annoncer l'élimination
                      </button>
                    )}
                    <button 
                      className="action-button secondary"
                      onClick={() => handleChangePhase('phase2')}
                    >
                      🌙 Revenir à la Phase 2 (Nuit)
                    </button>
                  </div>
                )}
              </div>
            )}

            {gamePhase === 'ended' && (
              <div className="screen-content ended">
                <h3>⚰️ Partie Terminée</h3>
                <p>Merci d'avoir joué!</p>
                <button 
                  className="action-button primary"
                  onClick={() => navigate('/home')}
                >
                  Retour à l'accueil
                </button>
              </div>
            )}

            {/* Stats panel */}
            <div className="stats-panel">
              <div className="stat">
                <span className="label">Vivants</span>
                <span className="value">{game.players.filter(p => p.isAlive).length}</span>
              </div>
              <div className="stat">
                <span className="label">🐺 Loups</span>
                <span className="value">{game.players.filter(p => p.role === 'Loup-Garou').length}</span>
              </div>
              <div className="stat">
                <span className="label">👨 Villageois</span>
                <span className="value">{game.players.filter(p => p.role === 'Villageois').length}</span>
              </div>
            </div>

            {/* Contrôles du Narrateur */}
            {isNarrator && gamePhase !== 'waiting' && (
              <div className="narrator-controls">
                <h4>Contrôles Narrateur</h4>
                <div className="phase-buttons">
                  <button 
                    className={`phase-btn ${gamePhase === 'phase1' ? 'active' : ''}`}
                    onClick={() => handleChangePhase('phase1')}
                  >
                    Phase 1
                  </button>
                  <button 
                    className={`phase-btn ${gamePhase === 'phase2' ? 'active' : ''}`}
                    onClick={() => handleChangePhase('phase2')}
                  >
                    Phase 2
                  </button>
                  <button 
                    className={`phase-btn ${gamePhase === 'phase3' ? 'active' : ''}`}
                    onClick={() => handleChangePhase('phase3')}
                  >
                    Phase 3
                  </button>
                  <button 
                    className={`phase-btn ${gamePhase === 'phase4' ? 'active' : ''}`}
                    onClick={() => handleChangePhase('phase4')}
                  >
                    Phase 4
                  </button>
                  <button 
                    className="phase-btn end"
                    onClick={() => handleChangePhase('ended')}
                  >
                    Terminer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite: Chats */}
        <div className="chat-column">
          {canWriteRoleChat && (
            <div className="chat-container role-chat">
              <h4>Chat des {userRole === 'Loup-Garou' ? 'Loups-Garous' : 'Narrateur'}</h4>
              <div className="chat-messages">
                {roleChat.map((msg, index) => (
                  <p key={index}><strong>{msg.username}:</strong> {msg.text}</p>
                ))}
              </div>
              <form onSubmit={handleSendRoleChat} className="chat-form">
                <input
                  type="text"
                  value={roleChatMessage}
                  onChange={(e) => setRoleChatMessage(e.target.value)}
                  placeholder="Discutez avec votre rôle..."
                />
                <button type="submit" className="send-btn">📤</button>
              </form>
            </div>
          )}
          <div className="chat-container general-chat" style={{ opacity: canWriteGeneralChat ? 1 : 0.5, pointerEvents: canWriteGeneralChat ? 'auto' : 'none' }}>
            <h4>Chat Général {!canWriteGeneralChat && '🤐 (Fermé la nuit)'}</h4>
            <div className="chat-messages">
              {generalChat.map((msg, idx) => (
                <p key={idx}><strong>{msg.username}:</strong> {msg.text}</p>
              ))}
            </div>
            <form className="chat-form" onSubmit={handleSendGeneralChat}>
              <input 
                type="text" 
                placeholder={canWriteGeneralChat ? "Discutez avec tout le monde..." : "Chat fermé la nuit..."}
                value={generalChatMessage}
                onChange={(e) => setGeneralChatMessage(e.target.value)}
                disabled={!canWriteGeneralChat}
              />
              <button type="submit" className="send-btn" disabled={!canWriteGeneralChat}>📤</button>
            </form>
          </div>
        </div>
      </motion.div>

      {/* Animation de début de partie */}
      {showGameStartAnimation && (
        <motion.div 
          className="game-start-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="game-start-content">
            {gameStartStep >= 1 && (
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="start-message"
              >
                {gameStartStep === 1 && '🎭 La partie commence...'}
                {gameStartStep === 2 && '🌙 La nuit tombe sur le village...'}
                {gameStartStep === 3 && 'Le village s\'endort...'}
              </motion.h2>
            )}
          </div>
        </motion.div>
      )}

      {/* Animation de transition de phase */}
      {showPhaseAnimation && (
        <motion.div 
          className={`phase-transition-overlay ${phaseAnimationClosing ? 'closing' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: phaseAnimationClosing ? 0 : 1 }}
          transition={{ duration: 1 }}
        >
          <div className="phase-transition-content">
            {phaseAnimationStep >= 1 && (
              <motion.h2
                key={currentPhaseMessage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: phaseAnimationClosing ? 0 : 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="phase-message"
              >
                {currentPhaseMessage}
              </motion.h2>
            )}
          </div>
        </motion.div>
      )}

      {/* Modal de confirmation pour quitter */}
      {showLeaveConfirm && (
        <div className="modal-overlay">
          <div className="modal-content leave-confirm-modal">
            <h2>Confirmation de quittance</h2>
            <p>
              {isHost 
                ? '⚠️ Vous êtes le créateur de cette partie. Si vous quittez, la partie sera supprimée et tous les joueurs seront expulsés.'
                : 'Êtes-vous sûr de vouloir quitter cette partie ?'}
            </p>
            <div className="modal-buttons">
              <button 
                className="modal-button cancel"
                onClick={handleLeaveGameCancel}
              >
                Annuler
              </button>
              <button 
                className="modal-button confirm danger"
                onClick={handleLeaveGameConfirm}
              >
                {isHost ? 'Quitter & Supprimer' : 'Quitter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message de fin de partie */}
      {showGameEndMessage && (
        <div className="modal-overlay">
          <div className="modal-content game-end-message">
            <div className="message-icon">⚰️</div>
            <h2>{gameEndMessage}</h2>
            <p>Redirection vers l'accueil...</p>
          </div>
        </div>
      )}

      {isNarrator && game.status === 'in-progress' && (
        <motion.footer 
          className="narrator-footer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="narrator-actions">
            <button 
              onClick={handleEndGame}
              className="action-button danger"
            >
              Terminer la partie
            </button>
          </div>
        </motion.footer>
      )}
      </>
    )}
    </motion.div>
  );
}

export default Game;
