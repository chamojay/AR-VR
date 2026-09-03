import { ConfiguratorState } from './configurator-state.js';

/**
 * Marker-based AR Experience (A-Frame + AR.js)
 * Implements continuous Hiro marker tracking, dynamic model loading,
 * tracking state lifecycle, rotation controls, and dish switching.
 */

let menuData = null;
let configurator = null;
let currentDish = null;
let foodModelEntity = null;
let currentRotationY = 0;

async function initMarkerAR() {
  try {
    const res = await fetch('/data/menu.json');
    if (!res.ok) throw new Error('Failed to load menu data');
    menuData = await res.json();

    const urlParams = new URLSearchParams(window.location.search);
    const dishId = urlParams.get('dish') || 'pizza-margherita';
    const portionKey = urlParams.get('portion') || 'regular';

    configurator = new ConfiguratorState(menuData);
    configurator.setDish(dishId);
    configurator.setPortion(portionKey);

    currentDish = configurator.getCurrentDish();
    foodModelEntity = document.getElementById('foodModelEntity');

    setupAFrameScene();
    setupMarkerEvents();
    setupHUDControls();
    updateARHUD();
    setupMarkerModal();

  } catch (err) {
    console.error('Error initializing marker AR:', err);
  }
}

/**
 * Configure A-Frame Model Source, Scale, and Position
 */
function setupAFrameScene() {
  if (!foodModelEntity || !currentDish) return;

  const snapshot = configurator.getStateSnapshot();
  const modelUrl = currentDish.optimizedModel || currentDish.model;

  // Set GLB source
  foodModelEntity.setAttribute('gltf-model', modelUrl);

  // Set calibrated scale based on dish & portion multiplier
  const markerScale = snapshot.markerScale || '0.35 0.35 0.35';
  foodModelEntity.setAttribute('scale', markerScale);

  // Set calibrated position above the marker
  const markerPos = currentDish.markerPosition || '0 0.03 0';
  foodModelEntity.setAttribute('position', markerPos);

  // Set initial rotation
  currentRotationY = 0;
  foodModelEntity.setAttribute('rotation', `0 ${currentRotationY} 0`);
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
    if (statusBadge) {
      statusBadge.className = 'ar-status-badge locked';
      statusBadge.innerHTML = '🟢 Tracking Locked';
    }
    if (reticle) {
      reticle.style.opacity = '0';
    }
  });

  marker.addEventListener('markerLost', () => {
    if (statusBadge) {
      statusBadge.className = 'ar-status-badge lost';
      statusBadge.innerHTML = '⚠️ Marker Lost - Realign';
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
      updateModelRotation();
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
  if (backLink) backLink.href = `/dish.html?dish=${snapshot.dishId}`;
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
