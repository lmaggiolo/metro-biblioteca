import * as skinview3d from 'https://cdn.jsdelivr.net/npm/skinview3d@3.1.0/+esm';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('skinCanvas');
  if (!canvas) return;

  // Recupera il nome utente dal canvas
  const username = canvas.getAttribute('data-username');

  // Recupera la skin dell'utente
  const skinUrl = `https://mc-heads.net/skin/${username}`;

  // Setup animazione
  const animation = new skinview3d.WalkingAnimation();
  animation.headBobbing = false;
  animation.speed = 0.5;

  // Funzione per inizializzare il viewer con la skin e il cape
  const initViewer = (skinUrl, capeUrl) => {
    const viewer = new skinview3d.SkinViewer({
      canvas: canvas,
      width: 400,
      height: 500,
      skin: skinUrl,
      cape: capeUrl,
      animation: animation,
      fov: 10,
      controls: { enableZoom: true },
    });

    // Imposta autoRotate e autoRotateSpeed
    viewer.autoRotate = true;
    viewer.autoRotateSpeed = 0.5;
  };

  // Eseguiamo il fetch per il cape
  fetch(`https://api.capes.dev/load/${username}/optifine`)
    .then(response => response.json())
    .then(capeData => {
      const capeUrl = capeData.imageUrl || '';
      initViewer(skinUrl, capeUrl);
    })
    .catch(() => {
      // In caso di errori, usiamo lo skinUrl e nessun cape
      initViewer(skinUrl, '');
    });
});
