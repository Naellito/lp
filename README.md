# 🐺 LOUP-GAROU ONLINE - Jeu d'horreur multijoueur

Un jeu de Loup-Garou en ligne moderne avec un design horrifique pour jouer avec vos amis !

## 🌙 Fonctionnalités actuelles

- ✅ Authentification (Login/Register) avec JWT
- ✅ Design moderne et effrayant avec animations
- ✅ Création de parties de jeu
- ✅ Rejoindre une partie avec un code
- ✅ Liste des parties disponibles en temps réel
- ✅ Connexion MongoDB
- ✅ Socket.IO prêt pour le temps réel

## 🛠️ Technologies

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT pour l'authentification
- Socket.IO pour le temps réel
- bcryptjs pour le hashage des mots de passe

**Frontend:**
- React 18
- Vite
- React Router
- Framer Motion (animations)
- Axios
- CSS moderne avec effets horrifiques

## 📦 Installation

### Prérequis
- Node.js (v16+)
- MongoDB en cours d'exécution sur localhost:27017

### Étapes d'installation

1. **Installer les dépendances backend:**
```powershell
npm install
```

2. **Installer les dépendances frontend:**
```powershell
cd client
npm install
cd ..
```

Ou utiliser la commande combinée:
```powershell
npm run install-all
```

3. **Configurer les variables d'environnement:**

Éditez le fichier `.env` à la racine:
```env
MONGODB_URI=mongodb://localhost:27017/loup-garou
JWT_SECRET=votre_secret_jwt_super_securise_changez_moi
PORT=5000
```

⚠️ **IMPORTANT:** Changez le `JWT_SECRET` par une valeur sécurisée unique !

## 🚀 Lancement

### Démarrage en mode développement (tout en une commande):
```powershell
npm run dev
```

Cela lance:
- Le serveur backend sur `http://localhost:5000`
- Le client React sur `http://localhost:5173`

### Ou démarrer séparément:

**Backend uniquement:**
```powershell
npm run server
```

**Frontend uniquement:**
```powershell
npm run client
```

## 🎮 Utilisation

1. Ouvrez `http://localhost:5173` dans votre navigateur
2. Créez un compte ou connectez-vous
3. Sur la page d'accueil:
   - **Créer une partie**: Donnez un nom et choisissez le nombre de joueurs
   - **Rejoindre une partie**: Entrez le code à 6 caractères
   - Voir la liste des parties disponibles sur le côté droit

## 📁 Structure du projet

```
loup-garou/
├── server/
│   ├── index.js              # Point d'entrée du serveur
│   ├── models/
│   │   ├── User.js          # Modèle utilisateur
│   │   └── Game.js          # Modèle partie de jeu
│   ├── routes/
│   │   ├── auth.js          # Routes authentification
│   │   └── game.js          # Routes gestion des parties
│   └── middleware/
│       └── auth.js          # Middleware JWT
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx    # Page de connexion
│   │   │   ├── Register.jsx # Page d'inscription
│   │   │   ├── Home.jsx     # Page d'accueil
│   │   │   ├── Auth.css     # Styles auth
│   │   │   └── Home.css     # Styles accueil
│   │   ├── services/
│   │   │   └── api.js       # Client API Axios
│   │   ├── App.jsx          # Composant principal
│   │   ├── main.jsx         # Point d'entrée React
│   │   └── index.css        # Styles globaux
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .env                      # Variables d'environnement
├── package.json
└── README.md
```

## 🎯 Prochaines étapes

Le code du jeu lui-même sera implémenté dans une prochaine phase. Actuellement, le système de base est en place:
- Authentification fonctionnelle
- Système de parties (création/rejoindre)
- Infrastructure temps réel avec Socket.IO

Pour ajouter la logique du jeu:
1. Définir les rôles (Loup-Garou, Villageois, Sorcière, etc.)
2. Implémenter les phases (Nuit, Jour, Vote)
3. Ajouter la page de jeu avec les actions des joueurs
4. Gérer les événements en temps réel via Socket.IO

## 🎨 Design

Le thème horrifique utilise:
- Couleurs sang et minuit
- Animations de brouillard et d'éclat
- Polices effrayantes (Nosifer, Creepster)
- Effets de lueur rouge
- Animations fluides avec Framer Motion

## 🐛 Dépannage

**MongoDB ne se connecte pas:**
- Vérifiez que MongoDB est lancé
- Vérifiez l'URI dans `.env`

**Port déjà utilisé:**
- Changez le port dans `.env` (backend)
- Changez le port dans `client/vite.config.js` (frontend)

**Erreurs d'authentification:**
- Vérifiez que le `JWT_SECRET` est défini
- Effacez le localStorage du navigateur

## 📝 Licence

MIT

---

Créé avec 🐺 et beaucoup de sang virtuel 🩸
