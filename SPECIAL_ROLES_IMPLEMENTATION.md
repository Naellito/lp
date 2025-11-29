# Implémentation des Rôles Spéciaux - Frontend UI Components

## 📋 Résumé des Changements

### Backend Routes (Déjà implémentées)
✅ `POST /:id/seer-action` - Voyante voit un joueur
✅ `POST /:id/witch-action` - Sorcière sauve ou tue

### Frontend Modifications

#### 1. **State Variables** (Game.jsx)
```javascript
const [userSpecialRole, setUserSpecialRole] = useState(null); // Rôle spécial de l'utilisateur
const [seerTarget, setSeerTarget] = useState(null); // Cible de la voyante
const [seerResult, setSeerResult] = useState(null); // Résultat vu par la voyante
const [witchAction, setWitchAction] = useState(null); // Action de la sorcière
const [witchTarget, setWitchTarget] = useState(null); // Cible de la sorcière
```

#### 2. **Action Handlers** (Game.jsx)
- `handleSeerAction(targetPlayerId)` - Voyante voit un rôle
- `handleWitchAction(targetPlayerId, action)` - Sorcière sauve ou tue

#### 3. **API Methods** (api.js)
```javascript
seerAction: (gameId, targetPlayerId) =>
  api.post(`/game/${gameId}/seer-action`, { targetPlayerId }),

witchAction: (gameId, action, targetPlayerId) =>
  api.post(`/game/${gameId}/witch-action`, { action, targetPlayerId }),
```

#### 4. **UI Components** (Game.jsx Phase 2)
- Special role panels pour Voyante et Sorcière
- Affichage conditionnel basé sur `userSpecialRole`
- Boutons d'action avec emojis pour chaque rôle

#### 5. **Player Action Buttons** (Game.jsx)
```
Voyante:     👁️ - Voir un joueur
Sorcière:    🛡️ - Sauver | 💀 - Tuer
Loups:       🐺 - Vote pour tuer
Narrateur:   ☠️ - Tuer | ⚖️ - Éliminer
```

#### 6. **Styling** (Game.css)
- `.special-role-panel` - Panel pour les rôles spéciaux
- `.seer-result` / `.witch-result` - Affichage des résultats
- `.seer-btn`, `.witch-save`, `.witch-kill` - Boutons avec couleurs spécifiques

## 🎮 Flux de Jeu - Phase 2

### Phase 2: La Nuit (Loups Actifs)

**Voyante:**
1. Voir un liste des joueurs vivants
2. Cliquer sur 👁️ pour voir le rôle
3. Notification affichée: ✨ "Vous avez vu que ce joueur est 🐺 Loup-Garou"
4. Résultat stocké dans `game.seenPlayerRole`

**Sorcière:**
1. Voir une liste des joueurs vivants
2. Cliquer sur 🛡️ pour sauver (protège d'une mort de loup)
   - Stocké dans `game.witchSaveUsed` et `game.witchSavedPlayer`
3. OU cliquer sur 💀 pour tuer (élimine le joueur)
   - Stocké dans `game.witchKillUsed` et le joueur devient `isAlive: false`
4. Notification: ✨ "Vous avez sauvé/tué ce joueur"

**Loups-Garous:**
- Votent avec 🐺 (comportement existant)

**Autres Joueurs + Narrateur:**
- Dorment / Observent
- Narrateur peut tuer directement avec ☠️

## 🔄 Intégration avec le Système Existant

### Assignation des Rôles (Déjà implémentée)
- **6+ joueurs:** 1 Voyante
- **7+ joueurs:** 1 Sorcière
- **8+ joueurs:** 1 Chasseur
- **10+ joueurs:** 1 Cupidon

Rôles assignés aléatoirement aux **Villageois**

### Données Stockées dans Game Schema
```javascript
specialRole: String, // 'Voyante', 'Sorcière', 'Chasseur', 'Cupidon'
linkedPlayer: ObjectId, // Pour Cupidon
hunterVotedThisRound: Boolean,
seenPlayer: ObjectId, // Pour Voyante
seenPlayerRole: String, // Rôle vu par Voyante
witchSaveUsed: Boolean,
witchKillUsed: Boolean,
witchSavedPlayer: ObjectId,
```

## ✨ Fonctionnalités

### Voyante (Seer)
- ✅ Voir le rôle d'un joueur pendant phase 2
- ✅ Affichage du résultat en notification
- ✅ Stockage du rôle vu

### Sorcière (Witch)
- ✅ Sauver un joueur (protège d'une mort de loup)
- ✅ Tuer un joueur (élimine directement)
- ✅ Feedback immédiat de l'action

### UI/UX
- ✅ Blur overlay désactivé pour les rôles spéciaux
- ✅ Panneau spécial affichant le rôle et ses pouvoirs
- ✅ Boutons intuitifs avec emojis
- ✅ Messages de confirmation
- ✅ Styling cohérent avec le thème du jeu

## 🚀 Prochaines Étapes

1. **Mécanique Chasseur:**
   - Quand Chasseur est éliminé en phase 4, lui donner un vote final
   - Utiliser le flag `hunterVotedThisRound`

2. **Mécanique Cupidon:**
   - Quand un joueur lié à Cupidon meurt, l'autre meurt aussi
   - Gérer la chaîne de morts avec `linkedPlayer`

3. **Conditions de Victoire:**
   - Déterminer le gagnant basé sur les loups/villageois restants
   - Créer écran de fin de partie

4. **Auto-Transitions:**
   - Ajouter des timers pour chaque phase
   - Auto-passer à la phase suivante

5. **Écran de Fin:**
   - Afficher tous les rôles
   - Statistiques du jeu
   - MVP
   - Bouton rejouer

## 📝 Notes Techniques

### Changements CSS
- Suppression de `position: relative` sur `.game-container` (causait des problèmes de positionnement)
- Z-index augmenté pour `.game-message` (9999)
- Nouveaux styles pour panneaux spéciaux avec gradients

### Gestion d'État
- `userSpecialRole` synchronisé avec les données du serveur
- États locaux pour résultats (`seerResult`, `witchAction`)
- Messages de jeu typés (`setGameMessageType`)

### Appels API
- Méthodes axe synchrones pour cohérence
- Rechargement du jeu après chaque action
- Gestion d'erreur avec `setError`

## 🧪 Testing

Pour tester les rôles spéciaux:
1. Créer une partie avec 6+ joueurs
2. Démarrer la partie
3. Phase 2 activée
4. Les joueurs avec rôles spéciaux voient les panneaux
5. Cliquer sur les boutons d'action
6. Vérifier les notifications et résultats

## 🎨 Palette de Couleurs

- **Voyante:** Bleu (#4169e1)
- **Sorcière Sauve:** Vert (#32cd32)
- **Sorcière Tue:** Rouge (#ff6347)
- **Loups:** Rouge sombre (#8b0000)
- **Jour:** Jaune (#ffc107)
