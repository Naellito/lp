import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté à MongoDB');
    
    // Nettoyer les anciennes parties au démarrage
    try {
      const Game = mongoose.model('Game');
      const result = await Game.deleteMany({});
      console.log(`🧹 ${result.deletedCount} parties supprimées`);
    } catch (err) {
      console.log('Pas de parties à supprimer ou erreur:', err.message);
    }
  })
  .catch(err => console.error('❌ Erreur MongoDB:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// Socket.IO pour le temps réel
io.on('connection', (socket) => {
  console.log('🔌 Utilisateur connecté:', socket.id);

  socket.on('join-game', (gameId) => {
    socket.join(gameId);
    console.log(`Joueur ${socket.id} a rejoint la partie ${gameId}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Utilisateur déconnecté:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});

export { io };
