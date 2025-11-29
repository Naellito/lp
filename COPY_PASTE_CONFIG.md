# 📋 Copy-Paste Guide: SDK Firebase Configuration

## 🎯 Où Trouver Ta Config Firebase

### Étape 1: Accédez à Firebase Console
```
https://console.firebase.google.com
↓
Sélectionnez "loup-41537"
↓
Cliquez sur ⚙️ (Settings)
↓
Onglet "Your apps"
```

### Étape 2: Trouvez votre Web App

Vous verrez quelque chose comme:
```
📱 Apps
└── 🌐 loup-garou (Web)
    └── Cliquez ici
```

### Étape 3: Copiez la Config JavaScript

Vous verrez un bloc comme ceci:

```javascript
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, download your service account key file
const firebaseConfig = {
  apiKey: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "loup-41537.firebaseapp.com",
  projectId: "loup-41537",
  storageBucket: "loup-41537.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456ghij"
};
```

---

## 📝 Créez `.env.local`

### Chemin:
```
c:\loup garou\client\.env.local
```

### Contenu à copier-coller:

```env
VITE_FIREBASE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=loup-41537.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=loup-41537
VITE_FIREBASE_STORAGE_BUCKET=loup-41537.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456ghij
```

### ⚠️ Important

- **Ne commitez JAMAIS ce fichier!**
- `.gitignore` le protège ✅
- Chaque développeur a sa propre copie locale
- Les valeurs changent par projet Firebase

---

## 🔐 Configuration Firestore Rules

### Accédez à Firestore

```
Firebase Console
↓
loup-41537 (project)
↓
Build > Firestore Database
↓
Onglet "Rules"
```

### Remplacez TOUT le contenu par:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only read/write their own data
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
      allow create: if request.auth.uid == userId;
    }
    
    // Games - authenticated users can create and interact
    match /games/{gameId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && request.resource.data.host == request.auth.uid;
      allow update: if request.auth != null;
      allow delete: if request.auth != null 
        && resource.data.host == request.auth.uid;
    }
    
    // Stats - everyone can read, only own stats can be written
    match /stats/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Cliquez "Publish"

---

## ✅ Vérification

### Test 1: Variable d'env chargée

Ouvrez `client/src/services/firebase.js`:
- Vérifiez que `import.meta.env.VITE_FIREBASE_*` charges bien
- Console devrait pas afficher d'erreur

### Test 2: Auth fonctionnelle

```powershell
cd c:\loup garou\client
npm run dev
```

Allez à `http://localhost:5173/register`:
- Créez un compte test
- Vérifiez dans **Firebase Console > Authentication**
  - L'utilisateur doit apparaître

### Test 3: Firestore fonctionnelle

Quand vous créez une partie:
- Vérifiez dans **Firebase Console > Firestore Database**
  - Collection `games` doit être créée
  - Document avec votre partie doit exister

### Test 4: Security Rules

- Essayez de lire depuis un autre compte
- Vérifiez que vous ne pouvez pas accéder les données des autres

---

## 🚨 Troubleshooting

### Erreur: "Missing environment variables"

**Vérifiez:**
```
✓ client/.env.local existe
✓ Les clés sont bonnes (copie exacte de Firebase)
✓ Avez relancé `npm run dev` après ajouter .env.local
```

### Erreur: "Authentication is not initialized"

**Vérifiez:**
```
✓ Firebase Console > Authentication > Email/Password activé
✓ `.env.local` a les bonnes valeurs
```

### Erreur: "Permission denied" en Firestore

**Vérifiez:**
```
✓ Firestore Rules copié correctement
✓ Cliquez "Publish" après copie
✓ Vous êtes authentifié (check Firebase Auth state)
```

### Utilisateur créé mais donnée pas dans Firestore

**Vérifiez:**
```
✓ Function registerUser() appelée (register page)
✓ await setDoc() pas bloqué par erreur
✓ Firestore Database active (mode production ok)
```

---

## 📊 Valeurs Exemple Réelles

Voici des exemples réalistes (ne sont pas vrais!):

### Firebase Config Example:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDNe7xgelmuQ-A3WKDZ3vIGVryzltmSn2w",
  authDomain: "loup-41537.firebaseapp.com",
  projectId: "loup-41537",
  storageBucket: "loup-41537.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefgh12345678"
};
```

### .env.local Example:
```env
VITE_FIREBASE_API_KEY=AIzaSyDNe7xgelmuQ-A3WKDZ3vIGVryzltmSn2w
VITE_FIREBASE_AUTH_DOMAIN=loup-41537.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=loup-41537
VITE_FIREBASE_STORAGE_BUCKET=loup-41537.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefgh12345678
```

---

## ✨ Next Steps

1. ✅ Copiez la config Firebase
2. ✅ Créez `.env.local`
3. ✅ Publiez les Firestore Rules
4. ✅ Testez en local (`npm run dev`)
5. ✅ Déployez sur Netlify
6. 🎉 Done!

Prêt? 🚀
