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
    foodModelEntity = document.getElementById('foodModelEntity');

    setupAFrameScene();
    setupARHotspots();
    setupMarkerEvents();
    setupHUDControls();
    setupHotspotHUDHandlers();
    updateARHUD();
    setupMarkerModal();
    setupIngredientsModal();

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
  const modelUrl = resolveUrl(currentDish.optimizedModel || currentDish.model);

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
      statusBadge.innerHTML = 'Tracking Active';
    }
    if (reticle) {
      reticle.style.opacity = '0';
    }
  });

  marker.addEventListener('markerLost', () => {
    if (statusBadge) {
      statusBadge.className = 'ar-status-badge lost';
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
      setupARHotspots();
      updateARHUD();
    });
  }
}

let arHotspotsVisible = true;

/**
 * Configure 3D Ash-Colored Hotspots Anchored to Food Model
 */
function setupARHotspots() {
  if (!foodModelEntity || !currentDish) return;

  // Clear existing hotspot entities
  foodModelEntity.querySelectorAll('.ar-hotspot-group').forEach(el => el.remove());

  const hotspots = currentDish.hotspots || [];
  if (hotspots.length === 0) return;

  hotspots.forEach((h, idx) => {
    const rawPos = (h.position || '0 0.05 0').replace(/m/g, '').trim();
    
    // Create container entity
    const groupEl = document.createElement('a-entity');
    groupEl.setAttribute('class', 'ar-hotspot-group');
    groupEl.setAttribute('position', rawPos);
    groupEl.setAttribute('visible', arHotspotsVisible ? 'true' : 'false');

    // 3D Ash-Gray Interactive Sphere
    const sphereEl = document.createElement('a-sphere');
    sphereEl.setAttribute('radius', '0.016');
    sphereEl.setAttribute('color', '#52525b'); /* Subtle Ash Gray */
    sphereEl.setAttribute('material', 'roughness: 0.45; opacity: 0.88; transparent: true;');
    sphereEl.setAttribute('class', 'clickable ar-hotspot-target');

    // Subtle Ash Outer Ring
    const ringEl = document.createElement('a-ring');
    ringEl.setAttribute('radius-inner', '0.022');
    ringEl.setAttribute('radius-outer', '0.028');
    ringEl.setAttribute('color', '#a1a1aa');
    ringEl.setAttribute('material', 'opacity: 0.6; transparent: true; side: double;');
    ringEl.setAttribute('rotation', '-90 0 0');

    groupEl.appendChild(sphereEl);
    groupEl.appendChild(ringEl);

    // Tap / Click Event Handlers
    const handleTrigger = (e) => {
      if (e) e.stopPropagation();
      displayARHotspotPopup(h, idx);
    };

    sphereEl.addEventListener('click', handleTrigger);
    sphereEl.addEventListener('touchstart', handleTrigger);
    groupEl.addEventListener('click', handleTrigger);

    foodModelEntity.appendChild(groupEl);
  });
}

/**
 * Display In-AR Hotspot Pop-up Card
 */
function displayARHotspotPopup(hotspot, index) {
  const popup = document.getElementById('arHotspotPopup');
  const titleEl = document.getElementById('arHotspotTitle');
  const descEl = document.getElementById('arHotspotDesc');
  const badgeEl = document.getElementById('arHotspotBadge');

  if (!popup) return;

  if (titleEl) titleEl.textContent = hotspot.title;
  if (descEl) descEl.textContent = hotspot.desc;
  if (badgeEl) badgeEl.textContent = `INGREDIENT #${index + 1}`;

  popup.style.display = 'block';
}

/**
 * Setup In-AR HUD Controls for Hotspots
 */
function setupHotspotHUDHandlers() {
  const btnToggle = document.getElementById('btnToggleARHotspots');
  const btnClose = document.getElementById('btnCloseARHotspotPopup');
  const popup = document.getElementById('arHotspotPopup');

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      arHotspotsVisible = !arHotspotsVisible;
      if (foodModelEntity) {
        foodModelEntity.querySelectorAll('.ar-hotspot-group').forEach(el => {
          el.setAttribute('visible', arHotspotsVisible ? 'true' : 'false');
        });
      }
      btnToggle.innerHTML = `<span>✨ Dots (${arHotspotsVisible ? 'ON' : 'OFF'})</span>`;
      btnToggle.style.backgroundColor = arHotspotsVisible ? '#111' : '#444';
      if (!arHotspotsVisible && popup) {
        popup.style.display = 'none';
      }
    });
  }

  if (btnClose && popup) {
    btnClose.addEventListener('click', () => {
      popup.style.display = 'none';
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
