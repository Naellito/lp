# Checklist: Firebase Migration Complete ✅

## Files Created/Ready for Firebase

### Core Services
- [x] `client/src/services/firebase.js` - Firebase initialization & core functions
  - Auth: registerUser, loginUser, logoutUser
  - Users: getUser, updateUser
  - Games: createGame, getGame, getGameByCode, joinGame, startGame
  - Chat: sendMessage
  - Voting: castWolfVote, castDayVote
  - Special Roles: seerAction, witchAction

- [x] `client/src/services/gameAPIFirebase.js` - Game API wrapper for Firebase

### Pages (Firebase Versions)
- [x] `client/src/pages/LoginFirebase.jsx` - Uses `loginUser()` from Firebase
- [x] `client/src/pages/RegisterFirebase.jsx` - Uses `registerUser()` from Firebase
- [x] `client/src/pages/HomeFirebase.jsx` - Uses `createGame()`, `joinGame()`, `getGameByCode()`

### Documentation
- [x] `FIREBASE_SETUP.md` - Complete Firebase setup guide
  - Environment variables template
  - Firestore collections structure
  - Migration steps
  - Next steps for integration

## Environment Variables Template

Create `.env.local` in `client/` folder with:
```env
VITE_FIREBASE_API_KEY=paste_your_sdk_config_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## What's Ready to Do

### Phase 1: Auth Integration (Ready Now ✅)
1. Replace routes in `App.jsx`:
   - `/login` → `LoginFirebase`
   - `/register` → `RegisterFirebase`
2. Update auth context to use Firebase UID instead of JWT

### Phase 2: Game Integration (Ready Now ✅)
1. Replace route in `App.jsx`:
   - `/home` → `HomeFirebase`
2. Update `Game.jsx` to import from `gameAPIFirebase` instead of `gameAPI`

### Phase 3: Real-time Updates (Needs Implementation)
1. Add Firestore listeners to `Game.jsx`:
   ```javascript
   import { onSnapshot } from 'firebase/firestore';
   
   useEffect(() => {
     const unsubscribe = onSnapshot(doc(db, 'games', gameId), (doc) => {
       setGameData(doc.data());
     });
     return () => unsubscribe();
   }, [gameId]);
   ```

### Phase 4: Cleanup (After Testing)
1. Delete `server/` folder (no longer needed)
2. Delete `client/src/services/api.js` (no longer needed)
3. Update `.gitignore` to remove server-related entries
4. Remove backend env variables from docs

## Security Checklist

⚠️ **URGENT - Credentials Exposed:**
- [ ] Rotate Firebase API key (regenerate in Firebase Console)
- [ ] Change MongoDB password (already exposed, migrate to Firestore)
- [ ] Revoke GitHub token (regenerate PAT in GitHub Settings)

## Firestore Security Rules (To Configure)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Games - authenticated users can create
    match /games/{gameId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if resource.data.host == request.auth.uid;
    }
    
    // Everyone can read stats
    match /stats/{userId} {
      allow read: if request.auth != null;
    }
  }
}
```

## Ready for SDK

You can now paste your Firebase SDK config into `.env.local` and:
1. Update `App.jsx` routes
2. Update imports in Game.jsx
3. Test authentication
4. Test game creation/joining
5. Deploy to Netlify! 🚀

All files are prepared and ready to use. Just add your Firebase credentials!
