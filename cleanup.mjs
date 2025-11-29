import('mongodb').then(async (m) => {
  const client = new m.MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('loup-garou');
    
    // Supprimer la collection users entièrement
    try {
      await db.collection('users').drop();
      console.log('✅ Collection users supprimée');
    } catch(e) {
      console.log('Collection users n\'existe pas');
    }
    
    // Supprimer la collection games aussi
    try {
      await db.collection('games').drop();
      console.log('✅ Collection games supprimée');
    } catch(e) {
      console.log('Collection games n\'existe pas');
    }
    
    await client.close();
    console.log('✅ Nettoyage réussi - peux créer de nouveaux comptes');
  } catch(e) {
    console.log('❌ Erreur:', e.message);
  }
}).catch(err => console.error(err));
