import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, query, where, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, enableIndexedDbPersistence } from 'firebase/firestore';

// Disable Firebase debug logs in production
if (import.meta.env.PROD) {
  window.console = window.console || {};
  const originalWarn = console.warn;
  console.warn = function(...args) {
    if (args[0]?.includes?.('Firebase')) return;
    originalWarn.apply(console, args);
  };
}

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth & Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence for Firestore (only in production for faster dev)
if (import.meta.env.PROD) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('Multiple tabs open, persistence only enabled in one tab');
    } else if (err.code === 'unimplemented') {
      console.log('Browser does not support persistence');
    }
  });
}

// Enable local persistence for Auth
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.log('Auth persistence error:', error);
});

// ============ AUTH FUNCTIONS ============

export const registerUser = async (email, password, username) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      username: username,
      email: email,
      createdAt: serverTimestamp(),
      stats: {
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        favoriteRole: null,
      },
      preferences: {
        audioEnabled: true,
        darkMode: true,
      }
    });

    return { user, uid: user.uid };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, uid: userCredential.user.uid };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(error.message);
  }
};

// ============ USER FUNCTIONS ============

export const getUser = async (uid) => {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const updateUser = async (uid, data) => {
  try {
    await updateDoc(doc(db, 'users', uid), data);
  } catch (error) {
    throw new Error(error.message);
  }
};

// ============ GAME FUNCTIONS ============

export const createGame = async (hostId, gameName, maxPlayers, gameMode = 'classic') => {
  try {
    const gameRef = await addDoc(collection(db, 'games'), {
      host: hostId,
      name: gameName,
      maxPlayers: maxPlayers,
      status: 'waiting', // waiting, in-progress, ended
      phase: 'waiting',
      gameMode: gameMode,
      players: [
        {
          uid: hostId,
          role: 'Narrateur',
          isAlive: true,
          specialRole: null,
          joinedAt: Date.now(),
        }
      ],
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      wolfVotes: {},
      dayVotes: {},
      messages: [],
      gameStartTime: null,
      lastKilledPlayer: null,
      lastVotedPlayer: null,
      announcedDeathPlayer: null,
      announcedEliminationPlayer: null,
    });

    return { id: gameRef.id, code: '' };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getGame = async (gameId) => {
  try {
    const docSnap = await getDoc(doc(db, 'games', gameId));
    return docSnap.exists() ? { id: gameId, ...docSnap.data() } : null;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getGameByCode = async (code) => {
  try {
    console.log('🔍 Searching for game with code:', code);
    const q = query(collection(db, 'games'), where('code', '==', code));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('🔍 No games found with code:', code);
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const gameData = { id: doc.id, ...doc.data() };
    console.log('🔍 Game found:', gameData.name, 'with code:', gameData.code);
    return gameData;
  } catch (error) {
    console.error('🔍 Error in getGameByCode:', error);
    throw new Error(error.message);
  }
};

export const joinGame = async (gameId, userId, username) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) throw new Error('Game not found');

    const game = gameSnap.data();
    if (game.players.length >= game.maxPlayers) throw new Error('Game is full');
    if (game.status !== 'waiting') throw new Error('Game already started');

    // Add player to game
    game.players.push({
      uid: userId,
      username: username,
      role: null,
      isAlive: true,
      specialRole: null,
      joinedAt: Date.now(),
    });

    await updateDoc(gameRef, {
      players: game.players,
      updatedAt: serverTimestamp(),
    });

    return game;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const leaveGame = async (gameId, userId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) throw new Error('Game not found');

    const game = gameSnap.data();
    
    // Remove player from the game
    const updatedPlayers = game.players.filter(p => p.uid !== userId);
    
    // Si la partie est vide, la supprimer
    if (updatedPlayers.length === 0) {
      await deleteDoc(gameRef);
      console.log('🗑️ Game deleted (no players remaining)');
      return { deleted: true };
    }
    
    // Sinon, mettre à jour la liste des joueurs
    await updateDoc(gameRef, {
      players: updatedPlayers,
      updatedAt: serverTimestamp(),
    });
    
    console.log('👋 Player left game, remaining players:', updatedPlayers.length);
    return { deleted: false, playersRemaining: updatedPlayers.length };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const startGame = async (gameId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) throw new Error('Game not found');

    const game = gameSnap.data();
    const players = game.players;
    const playerCount = players.length;

    // Assign roles
    const wolfCount = Math.max(1, Math.floor(playerCount / 3));
    const villagerCount = playerCount - wolfCount - 1;

    let updatedPlayers = [...players];

    // Assign Narrator
    updatedPlayers[0].role = 'Narrateur';

    // Randomly assign wolves
    const wolfIndices = [];
    while (wolfIndices.length < wolfCount) {
      const idx = Math.floor(Math.random() * playerCount);
      if (idx !== 0 && !wolfIndices.includes(idx)) {
        wolfIndices.push(idx);
        updatedPlayers[idx].role = 'Loup-Garou';
      }
    }

    // Assign villagers
    for (let i = 1; i < playerCount; i++) {
      if (!wolfIndices.includes(i)) {
        updatedPlayers[i].role = 'Villageois';
      }
    }

    // Assign special roles
    const specialRoles = [];
    if (playerCount >= 6) specialRoles.push('Voyante');
    if (playerCount >= 7) specialRoles.push('Sorcière');
    if (playerCount >= 8) specialRoles.push('Chasseur');
    if (playerCount >= 10) specialRoles.push('Cupidon');

    // Randomly assign special roles to villagers
    const villagerIndices = updatedPlayers
      .map((p, i) => (p.role === 'Villageois' ? i : -1))
      .filter(i => i !== -1);

    for (const role of specialRoles) {
      if (villagerIndices.length > 0) {
        const randomIdx = villagerIndices[Math.floor(Math.random() * villagerIndices.length)];
        updatedPlayers[randomIdx].specialRole = role;
      }
    }

    await updateDoc(gameRef, {
      status: 'in-progress',
      phase: 'phase1',
      players: updatedPlayers,
      gameStartTime: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { id: gameId, ...game };
  } catch (error) {
    throw new Error(error.message);
  }
};

// ============ CHAT FUNCTIONS ============

export const sendMessage = async (gameId, userId, text, type = 'general') => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) throw new Error('Game not found');

    const game = gameSnap.data();
    const user = await getUser(userId);
    
    const message = {
      userId: userId,
      username: user.username,
      text: text,
      type: type,
      timestamp: Date.now(),
    };

    game.messages = game.messages || [];
    game.messages.push(message);

    await updateDoc(gameRef, {
      messages: game.messages,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

// ============ VOTING FUNCTIONS ============

export const castWolfVote = async (gameId, voterId, targetId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) throw new Error('Game not found');

    const game = gameSnap.data();
    game.wolfVotes = game.wolfVotes || {};

    if (!game.wolfVotes[targetId]) {
      game.wolfVotes[targetId] = [];
    }

    const voteIndex = game.wolfVotes[targetId].indexOf(voterId);
    if (voteIndex > -1) {
      game.wolfVotes[targetId].splice(voteIndex, 1);
    } else {
      game.wolfVotes[targetId].push(voterId);
    }

    await updateDoc(gameRef, {
      wolfVotes: game.wolfVotes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

export const castDayVote = async (gameId, voterId, targetId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) throw new Error('Game not found');

    const game = gameSnap.data();
    game.dayVotes = game.dayVotes || {};

    if (!game.dayVotes[targetId]) {
      game.dayVotes[targetId] = [];
    }

    const voteIndex = game.dayVotes[targetId].indexOf(voterId);
    if (voteIndex > -1) {
      game.dayVotes[targetId].splice(voteIndex, 1);
    } else {
      game.dayVotes[targetId].push(voterId);
    }

    await updateDoc(gameRef, {
      dayVotes: game.dayVotes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

// ============ SPECIAL ROLE FUNCTIONS ============

export const seerAction = async (gameId, userId, targetId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) throw new Error('Game not found');

    const game = gameSnap.data();
    const targetPlayer = game.players.find(p => p.uid === targetId);
    
    if (!targetPlayer) throw new Error('Target player not found');

    await updateDoc(gameRef, {
      [`players.${game.players.findIndex(p => p.uid === userId)}.seenPlayer`]: targetId,
      [`players.${game.players.findIndex(p => p.uid === userId)}.seenPlayerRole`]: targetPlayer.role,
      updatedAt: serverTimestamp(),
    });

    return { seenPlayerRole: targetPlayer.role };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const witchAction = async (gameId, userId, targetId, action) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) throw new Error('Game not found');

    const game = gameSnap.data();
    const targetPlayer = game.players.find(p => p.uid === targetId);
    
    if (!targetPlayer) throw new Error('Target player not found');

    if (action === 'save') {
      await updateDoc(gameRef, {
        [`players.${game.players.findIndex(p => p.uid === userId)}.witchSaveUsed`]: true,
        [`players.${game.players.findIndex(p => p.uid === userId)}.witchSavedPlayer`]: targetId,
        updatedAt: serverTimestamp(),
      });
    } else if (action === 'kill') {
      const targetIndex = game.players.findIndex(p => p.uid === targetId);
      await updateDoc(gameRef, {
        [`players.${game.players.findIndex(p => p.uid === userId)}.witchKillUsed`]: true,
        [`players.${targetIndex}.isAlive`]: false,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

// ============ LIST GAMES ============

export const listGames = async () => {
  try {
    console.log('🔍 Querying games with status=waiting...');
    const q = query(collection(db, 'games'), where('status', '==', 'waiting'));
    const querySnapshot = await getDocs(q);
    console.log('🔍 Found', querySnapshot.size, 'games');
    const gamesList = [];
    
    querySnapshot.forEach((doc) => {
      const gameData = {
        id: doc.id,
        ...doc.data(),
      };
      console.log('🔍 Game:', gameData.name, 'with code:', gameData.code, 'players:', gameData.players?.length);
      gamesList.push(gameData);
    });
    
    return gamesList;
  } catch (error) {
    console.error('🔍 Error listing games:', error);
    throw new Error(error.message);
  }
};

export default app;
