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
let markerTracked = false;
let modelReady = false;

/**
 * A-Frame loads GLB animation clips but does not play them automatically.
 * This component keeps the embedded steam animation running in marker AR.
 */
function registerGltfAnimationMixer() {
  if (!window.AFRAME || window.AFRAME.components['dineview-animation-mixer']) return;

  window.AFRAME.registerComponent('dineview-animation-mixer', {
    init() {
      this.mixer = null;
      this.onModelLoaded = (event) => {
        const model = event.detail.model;
        const clips = model?.animations || [];
        if (!model || clips.length === 0) return;
        this.mixer = new window.AFRAME.THREE.AnimationMixer(model);
        clips.forEach(clip => this.mixer.clipAction(clip).play());
      };
      this.el.addEventListener('model-loaded', this.onModelLoaded);
    },
    tick(_time, delta) {
      if (this.mixer) this.mixer.update(delta / 1000);
    },
    remove() {
      this.el.removeEventListener('model-loaded', this.onModelLoaded);
      if (this.mixer) this.mixer.stopAllAction();
      this.mixer = null;
    }
  });
}

function setTrackingStatus(message, state = '') {
  const statusBadge = document.getElementById('arStatusBadge');
  if (!statusBadge) return;
  statusBadge.className = `ar-status-pill${state ? ` ${state}` : ''}`;
  statusBadge.textContent = message;
}

function getBaseMarkerRotationY() {
  const parts = (currentDish?.markerRotation || '0 0 0').split(/\s+/).map(Number);
  return Number.isFinite(parts[1]) ? parts[1] : 0;
}

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
    registerGltfAnimationMixer();
    foodModelEntity = document.getElementById('foodModelEntity');
    if (!foodModelEntity) throw new Error('Marker AR food model entity was not found');
    foodModelEntity.setAttribute('dineview-animation-mixer', '');
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
  modelReady = false;
  setTrackingStatus(markerTracked ? 'Marker Found - Loading Dish...' : 'Loading 3D Dish...', markerTracked ? 'locked' : '');

  // Configure the transform before starting the asynchronous model request.
  updateModelScale();
  foodModelEntity.setAttribute('position', currentDish.markerPosition || '0 0.03 0');
  currentRotationY = getBaseMarkerRotationY();
  foodModelEntity.setAttribute('rotation', `0 ${currentRotationY} 0`);
  foodModelEntity.setAttribute('visible', true);

  // Remove handlers left by a very fast dish switch before its prior load ended.
  if (foodModelEntity._dineviewModelLoaded) {
    foodModelEntity.removeEventListener('model-loaded', foodModelEntity._dineviewModelLoaded);
    foodModelEntity.removeEventListener('model-error', foodModelEntity._dineviewModelError);
  }

  const onModelLoaded = () => {
    modelReady = true;
    console.log('3D GLTF Food Model loaded successfully:', modelUrl);
    setTrackingStatus(markerTracked ? 'Tracking Active' : 'Dish Ready - Find Marker', markerTracked ? 'locked' : '');

    const obj = foodModelEntity.getObject3D('mesh');
    if (obj) {
      obj.visible = true;
      obj.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        child.castShadow = true;
        child.receiveShadow = true;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material.map) {
            material.map.anisotropy = 8;
            material.map.needsUpdate = true;
          }
          if (typeof material.roughness === 'number') {
            material.roughness = Math.max(0.15, material.roughness);
          }
          material.needsUpdate = true;
        });
      });
    }
  };

  const onModelError = (event) => {
    modelReady = false;
    console.error('Failed to load 3D GLTF Food Model:', modelUrl, event.detail || event);
    setTrackingStatus('Dish Model Failed to Load', 'lost');
  };

  foodModelEntity._dineviewModelLoaded = onModelLoaded;
  foodModelEntity._dineviewModelError = onModelError;
  foodModelEntity.addEventListener('model-loaded', onModelLoaded, { once: true });
  foodModelEntity.addEventListener('model-error', onModelError, { once: true });

  // Attach listeners first so even a cached model cannot finish unnoticed.
  foodModelEntity.setAttribute('gltf-model', modelUrl);
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
    markerTracked = true;
    if (foodModelEntity) {
      foodModelEntity.setAttribute('visible', true);
      if (foodModelEntity.object3D) foodModelEntity.object3D.visible = true;
    }
    setTrackingStatus(modelReady ? 'Tracking Active' : 'Marker Found - Loading Dish...', 'locked');
    if (reticle) reticle.style.opacity = '0';
  });

  marker.addEventListener('markerLost', () => {
    console.log('Hiro Marker Lost');
    markerTracked = false;
    setTrackingStatus(modelReady ? 'Marker Lost - Realign' : 'Loading Dish - Find Marker', 'lost');
    if (reticle) reticle.style.opacity = '1';
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
      currentRotationY = getBaseMarkerRotationY();
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
      const creditEl = document.getElementById('arModalCreditBlock');
      if (creditEl && currentDish.modelCredits) {
        const c = currentDish.modelCredits;
        creditEl.innerHTML = `
          <div style="font-weight: 700; font-size: 0.75rem; text-transform: uppercase; color: var(--color-mute); margin-bottom: 4px;">
            3D Model Attribution
          </div>
          <div style="color: var(--color-ink);">
            &ldquo;${c.title}&rdquo; by ${c.author}, available on <a href="${c.modelUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--color-ink); font-weight: 600; text-decoration: underline;">${c.platform}</a> (<a href="${c.modelUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--color-mute); word-break: break-all;">${c.modelUrl}</a>), licensed under <a href="${c.licenseUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--color-ink); font-weight: 600; text-decoration: underline;">${c.license}</a> (<a href="${c.licenseUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--color-mute); word-break: break-all;">${c.licenseUrl}</a>).
          </div>
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
