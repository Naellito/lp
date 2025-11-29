import { useEffect } from 'react';
import './AtmosphereEffects.css';

function AtmosphereEffects() {
  useEffect(() => {
    // Créer les étoiles statiques
    const starsContainer = document.getElementById('stars-container');
    if (!starsContainer) return;

    starsContainer.innerHTML = '';

    // Créer 100 étoiles aléatoires
    for (let i = 0; i < 100; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 3 + 's';
      star.style.opacity = Math.random() * 0.6 + 0.2;
      starsContainer.appendChild(star);
    }

    // Créer les étoiles filantes
    const shootingStarsContainer = document.getElementById('shooting-stars-container');
    if (shootingStarsContainer) {
      // Créer une étoile filante toutes les 3-5 secondes
      const interval = setInterval(() => {
        const shootingStar = document.createElement('div');
        shootingStar.className = 'shooting-star';
        shootingStar.style.left = Math.random() * 100 + '%';
        shootingStar.style.top = Math.random() * 50 + '%';
        shootingStarsContainer.appendChild(shootingStar);
        
        // Supprimer l'étoile après l'animation
        setTimeout(() => shootingStar.remove(), 1500);
      }, 4000 + Math.random() * 2000);

      return () => clearInterval(interval);
    }
  }, []);

  return (
    <>
      <div id="stars-container" className="stars-container"></div>
      <div id="shooting-stars-container" className="shooting-stars-container"></div>
      <div className="moon-container">
        <div className="wolf-moon"></div>
      </div>
      <div className="fog-overlay fog-1"></div>
      <div className="fog-overlay fog-2"></div>
      <div className="fog-overlay fog-3"></div>
      <div className="fog-overlay fog-4"></div>
    </>
  );
}

export default AtmosphereEffects;
