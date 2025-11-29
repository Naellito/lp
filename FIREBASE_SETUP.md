# Firebase Configuration for Loup-Garou

## Environment Variables Required

Add these to your `.env.local` in the client folder:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Firebase Collections Structure

### 1. **users** Collection
```json
{
  "uid": "firebase_user_id",
  "username": "player_name",
  "email": "email@example.com",
  "createdAt": "timestamp",
  "stats": {
    "wins": 0,
    "losses": 0,
    "gamesPlayed": 0,
    "favoriteRole": "Villageois"
  },
  "preferences": {
    "audioEnabled": true,
    "darkMode": true
  }
}
```

### 2. **games** Collection
```json
{
  "id": "game_id",
  "host": "host_uid",
  "name": "Game Name",
  "maxPlayers": 12,
  "status": "waiting|in-progress|ended",
  "phase": "waiting|phase1|phase2|phase3|phase4",
  "gameMode": "classic",
  "code": "ABC123",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "gameStartTime": "timestamp",
  "players": [
    {
      "uid": "player_uid",
      "username": "player_name",
      "role": "Villageois|Loup-Garou|Narrateur",
      "specialRole": "Voyante|Sorcière|Chasseur|Cupidon|null",
      "isAlive": true,
      "linkedPlayer": "linked_uid_for_cupidon",
      "joinedAt": "timestamp",
      "seenPlayer": "player_uid_seen_by_seer",
      "seenPlayerRole": "role_seen",
      "witchSaveUsed": false,
      "witchKillUsed": false,
      "witchSavedPlayer": "player_uid",
      "hunterExtraVote": false
    }
  ],
  "messages": [
    {
      "userId": "user_uid",
      "username": "player_name",
      "text": "message content",
      "type": "general|role",
      "timestamp": "timestamp"
    }
  ],
  "wolfVotes": {
    "target_uid": ["voter1_uid", "voter2_uid"]
  },
  "dayVotes": {
    "target_uid": ["voter1_uid", "voter2_uid"]
  },
  "lastKilledPlayer": "player_uid",
  "lastVotedPlayer": "player_uid",
  "announcedDeathPlayer": "player_uid",
  "announcedEliminationPlayer": "player_uid"
}
```

### 3. **stats** Collection (Optional, for leaderboards)
```json
{
  "userId": "user_uid",
  "eloRating": 1200,
  "rank": 1,
  "rolesStats": {
    "Loup-Garou": { "wins": 5, "losses": 2 },
    "Villageois": { "wins": 10, "losses": 5 },
    "Voyante": { "wins": 3, "losses": 1 }
  }
}
```

## Migration Steps from Express/MongoDB

1. **Authentication**
   - ✅ Created `LoginFirebase.jsx` - Uses Firebase Auth
   - ✅ Created `RegisterFirebase.jsx` - Uses Firebase Auth
   - Replace JWT with Firebase UID in all requests

2. **Game Management**
   - ✅ Created `HomeFirebase.jsx` - Uses Firebase game functions
   - ✅ Created `gameAPIFirebase.js` - Wrapper for game functions
   - Update `Game.jsx` to use Firebase imports

3. **Real-time Updates**
   - Need to implement: Firestore listeners for real-time game updates
   - Use `onSnapshot()` instead of Socket.IO

4. **Database**
   - All data now stored in Firestore
   - No MongoDB needed
   - No Node.js Express server needed

## Files Ready for Firebase Integration

- ✅ `client/src/services/firebase.js` - Core Firebase service
- ✅ `client/src/pages/LoginFirebase.jsx` - Firebase auth
- ✅ `client/src/pages/RegisterFirebase.jsx` - Firebase auth
- ✅ `client/src/pages/HomeFirebase.jsx` - Firebase game creation/joining
- ✅ `client/src/services/gameAPIFirebase.js` - Firebase game API wrapper
- ⏳ `client/src/pages/Game.jsx` - Needs to be updated to use Firebase
- ⏳ `client/src/App.jsx` - Needs route updates to use Firebase components
- ⏳ Firestore Security Rules - Need to be configured in Firebase Console

## Next Steps

1. Get your Firebase SDK config and add to `.env.local`
2. Update `App.jsx` to use `LoginFirebase`, `RegisterFirebase`, `HomeFirebase`
3. Update `Game.jsx` to use `gameAPIFirebase` instead of `gameAPI`
4. Set up Firestore Security Rules in Firebase Console
5. Deploy to Netlify (frontend only - no backend needed!)
6. Delete the `server/` folder (no longer needed)
