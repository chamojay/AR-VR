import { ConfiguratorState } from './configurator-state.js';

/**
 * Marker-based AR Experience (A-Frame + AR.js)
 * Implements continuous Hiro marker tracking, dynamic model loading,
 * tracking state lifecycle, rotation controls, and dish switching.
 */

const baseUrl = import.meta.env.BASE_URL || '/';

function resolveUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return `${baseUrl}${path.replace(/^\//, '')}`;
}

let menuData = null;
let configurator = null;
let currentDish = null;
let foodModelEntity = null;
let currentRotationY = 0;

async function initMarkerAR() {
  try {
    const res = await fetch(resolveUrl('data/menu.json'));
    if (!res.ok) throw new Error('Failed to load menu data');
    menuData = await res.json();

    const urlParams = new URLSearchParams(window.location.search);
    const dishId = urlParams.get('dish') || 'pizza-margherita';
    const portionKey = urlParams.get('portion') || 'regular';

    configurator = new ConfiguratorState(menuData);
    configurator.setDish(dishId);
    configurator.setPortion(portionKey);

    currentDish = configurator.getCurrentDish();
    setupAFrameScene();
    setupMarkerEvents();
    setupHUDControls();
    updateARHUD();
    setupMarkerModal();
    setupIngredientsModal();
    ensureVideoPlayback();

  } catch (err) {
    console.error('Error initializing marker AR:', err);
  }
}

/**
 * Mobile Camera Video Stream Streamlines for Safari & Chrome
 */
function ensureVideoPlayback() {
  const checkVideo = () => {
    const video = document.querySelector('#arjs-video') || document.querySelector('video');
    if (video) {
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('muted', 'true');
      video.muted = true;
      if (video.paused) {
        video.play().catch(() => {});
      }
    }
  };
  checkVideo();
  const timer = setInterval(checkVideo, 500);
  window.addEventListener('touchstart', () => {
    checkVideo();
  }, { once: true });
}

let currentScaleFactor = 1.0;

/**
 * Configure A-Frame Model Source, Scale, and Position
 */
function setupAFrameScene() {
  if (!foodModelEntity || !currentDish) return;

  const modelUrl = resolveUrl(currentDish.optimizedModel || currentDish.model);

  // Set GLB source
  foodModelEntity.setAttribute('gltf-model', modelUrl);

  foodModelEntity.addEventListener('model-loaded', () => {
    console.log('3D GLTF Food Model loaded successfully:', modelUrl);
    const obj = foodModelEntity.getObject3D('mesh');
    if (obj) {
      obj.traverse((child) => {
        if (child.isMesh && child.material) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material.map) {
            child.material.map.anisotropy = 8;
            child.material.map.needsUpdate = true;
          }
          child.material.roughness = Math.max(0.15, child.material.roughness || 0.4);
          child.material.needsUpdate = true;
        }
      });
    }
  });

  foodModelEntity.addEventListener('model-error', (e) => {
    console.error('Failed to load 3D GLTF Food Model:', modelUrl, e);
  });

  // Apply default large scale
  updateModelScale();

  // Set calibrated position above the marker
  const markerPos = currentDish.markerPosition || '0 0.03 0';
  foodModelEntity.setAttribute('position', markerPos);

  // Set initial rotation
  currentRotationY = 0;
  foodModelEntity.setAttribute('rotation', `0 ${currentRotationY} 0`);
}

/**
 * Update 3D Food Model Scale
 */
function updateModelScale() {
  if (!foodModelEntity || !currentDish) return;
  const snapshot = configurator ? configurator.getStateSnapshot() : {};
  const baseScaleStr = snapshot.markerScale || currentDish.markerScale || '3.2 3.2 3.2';
  const parts = baseScaleStr.split(' ').map(parseFloat);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const finalScale = `${(parts[0] * currentScaleFactor).toFixed(3)} ${(parts[1] * currentScaleFactor).toFixed(3)} ${(parts[2] * currentScaleFactor).toFixed(3)}`;
    foodModelEntity.setAttribute('scale', finalScale);
  } else {
    foodModelEntity.setAttribute('scale', `${3.2 * currentScaleFactor} ${3.2 * currentScaleFactor} ${3.2 * currentScaleFactor}`);
  }
}

/**
 * AR.js Marker Tracking Lifecycle Listeners
 */
function setupMarkerEvents() {
  const marker = document.getElementById('hiroMarker');
  const statusBadge = document.getElementById('arStatusBadge');
  const reticle = document.getElementById('arReticle');

  if (!marker) return;

  marker.addEventListener('markerFound', () => {
    console.log('Hiro Marker Found!');
    if (statusBadge) {
      statusBadge.className = 'ar-status-pill locked';
      statusBadge.innerHTML = 'Tracking Active';
    }
    if (reticle) {
      reticle.style.opacity = '0';
    }
  });

  marker.addEventListener('markerLost', () => {
    console.log('Hiro Marker Lost');
    if (statusBadge) {
      statusBadge.className = 'ar-status-pill lost';
      statusBadge.innerHTML = 'Marker Lost - Realign';
    }
    if (reticle) {
      reticle.style.opacity = '1';
    }
  });

  // Handle AR.js Camera Initialization
  window.addEventListener('camera-init', () => {
    console.log('AR Camera initialized successfully');
  });

  window.addEventListener('camera-error', (err) => {
    console.error('AR Camera error:', err);
    alert('Camera permission is required to view food in Augmented Reality. Please allow camera access in browser settings.');
  });
}

/**
 * Setup On-Screen In-AR HUD Controls
 */
function setupHUDControls() {
  // Rotate Left / Right Buttons
  const btnRotateLeft = document.getElementById('btnRotateLeft');
  const btnRotateRight = document.getElementById('btnRotateRight');
  const btnResetRotation = document.getElementById('btnResetRotation');

  if (btnRotateLeft) {
    btnRotateLeft.addEventListener('click', () => {
      currentRotationY = (currentRotationY - 45) % 360;
      updateModelRotation();
    });
  }

  if (btnRotateRight) {
    btnRotateRight.addEventListener('click', () => {
      currentRotationY = (currentRotationY + 45) % 360;
      updateModelRotation();
    });
  }

  if (btnResetRotation) {
    btnResetRotation.addEventListener('click', () => {
      currentRotationY = 0;
      currentScaleFactor = 1.0;
      updateModelRotation();
      updateModelScale();
    });
  }

  // Size / Scale Adjustment Buttons
  const btnScaleUp = document.getElementById('btnScaleUp');
  const btnScaleDown = document.getElementById('btnScaleDown');

  if (btnScaleUp) {
    btnScaleUp.addEventListener('click', () => {
      currentScaleFactor = Math.min(6.0, currentScaleFactor + 0.4);
      updateModelScale();
    });
  }

  if (btnScaleDown) {
    btnScaleDown.addEventListener('click', () => {
      currentScaleFactor = Math.max(0.3, currentScaleFactor - 0.3);
      updateModelScale();
    });
  }

  // Dish Switcher Dropdown / Buttons
  const dishSelectEl = document.getElementById('arDishSelector');
  if (dishSelectEl && menuData.dishes) {
    dishSelectEl.innerHTML = menuData.dishes.map(d => `
      <option value="${d.id}" ${d.id === currentDish.id ? 'selected' : ''}>
        ${d.name}
      </option>
    `).join('');

    dishSelectEl.addEventListener('change', (e) => {
      configurator.setDish(e.target.value);
      currentDish = configurator.getCurrentDish();
      setupAFrameScene();
      updateARHUD();
    });
  }
}

/**
 * Setup Full Recipe & Ingredients Modal for Marker AR
 */
function setupIngredientsModal() {
  const modal = document.getElementById('ingredientsModal');
  const openBtn = document.getElementById('btnShowIngredientsModal');
  const closeBtn = document.getElementById('btnCloseIngredientsModal');
  const nameEl = document.getElementById('arModalDishName');
  const descEl = document.getElementById('arModalDishDesc');
  const listEl = document.getElementById('arModalIngredientsList');
  const allergensEl = document.getElementById('arModalAllergensBlock');

  if (!modal) return;

  const openModal = () => {
    if (currentDish) {
      if (nameEl) nameEl.textContent = currentDish.name;
      if (descEl) descEl.textContent = currentDish.fullDescription || currentDish.shortDescription || '';
      if (listEl) {
        const ingredients = currentDish.ingredients || [];
        listEl.innerHTML = ingredients.map(ing => `
          <span class="ingredient-chip">
            <span style="color: #4ade80;">•</span>
            <span>${ing}</span>
          </span>
        `).join('');
      }
      if (allergensEl) {
        const allergens = currentDish.allergens || [];
        const dietary = currentDish.dietary || [];
        allergensEl.innerHTML = `
          <div><strong>Allergens:</strong> ${allergens.length ? allergens.join(', ') : 'None listed'}</div>
          <div style="margin-top: 4px;"><strong>Dietary:</strong> ${dietary.join(' • ')}</div>
        `;
      }
    }
    modal.classList.add('active');
  };

  const closeModal = () => modal.classList.remove('active');

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

/**
 * Update A-Frame entity rotation
 */
function updateModelRotation() {
  if (!foodModelEntity) return;
  foodModelEntity.setAttribute('rotation', `0 ${currentRotationY} 0`);
}

/**
 * Update HUD Labels & Details
 */
function updateARHUD() {
  const snapshot = configurator.getStateSnapshot();

  const titleEl = document.getElementById('arDishTitle');
  const priceEl = document.getElementById('arDishPrice');
  const backLink = document.getElementById('arBackLink');

  if (titleEl) titleEl.textContent = snapshot.dishName;
  if (priceEl) priceEl.textContent = `Rs. ${Number(snapshot.basePrice || snapshot.totalPrice).toLocaleString('en-US')}`;
  if (backLink) backLink.href = resolveUrl(`dish.html?dish=${snapshot.dishId}`);
}

/**
 * Show / Hide Marker Reference Modal
 */
function setupMarkerModal() {
  const modal = document.getElementById('markerModal');
  const openBtn = document.getElementById('btnShowMarkerHelp');
  const closeBtn = document.getElementById('btnCloseMarkerModal');

  if (!modal) return;

  const openModal = () => modal.classList.add('active');
  const closeModal = () => modal.classList.remove('active');

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// Start AR experience
document.addEventListener('DOMContentLoaded', initMarkerAR);
