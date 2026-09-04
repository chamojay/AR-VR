import '@google/model-viewer';

/**
 * DineView AR - Streamlined Dish 3D & AR Controller
 */

let menuData = null;
let currentDish = null;
let modelViewerEl = null;

async function initDishStudio() {
  try {
    const res = await fetch('./data/menu.json');
    if (!res.ok) throw new Error('Failed to load menu data');
    menuData = await res.json();

    const urlParams = new URLSearchParams(window.location.search);
    const requestedDishId = urlParams.get('dish') || 'pizza-margherita';

    currentDish = menuData.dishes.find(d => d.id === requestedDishId) || menuData.dishes[0];
    modelViewerEl = document.getElementById('studioViewer');

    renderDishDetails();
    setupModelViewerControls();
    setupARLaunchers();
    renderOtherDishesSwitcher();
    setupMarkerModal();

  } catch (error) {
    console.error('Error initializing dish studio:', error);
  }
}

/**
 * Render Clean Dish Information: Name, Price & Short Description
 */
function renderDishDetails() {
  if (!currentDish) return;

  document.title = `${currentDish.name} - Cjay's DINER`;

  const titleEl = document.getElementById('dishName');
  const priceDisplayEl = document.getElementById('pdpPriceDisplay');
  const descEl = document.getElementById('dishShortDesc');
  const badgeEl = document.getElementById('pdpBadge');
  const breadcrumbEl = document.getElementById('pdpBreadcrumb');

  if (titleEl) titleEl.textContent = currentDish.name;
  if (priceDisplayEl) priceDisplayEl.textContent = `Rs. ${Number(currentDish.basePrice).toLocaleString('en-US')}`;
  if (descEl) descEl.textContent = currentDish.shortDescription || currentDish.fullDescription || '';
  if (badgeEl) badgeEl.textContent = currentDish.badge || 'Chef Selection';
  if (breadcrumbEl) breadcrumbEl.textContent = `Cjay's Menu / ${currentDish.name}`;

  // Update Marker AR link
  const btnMarkerAR = document.getElementById('btnLaunchMarkerAR');
  if (btnMarkerAR) {
    btnMarkerAR.href = `./marker-ar.html?dish=${currentDish.id}`;
  }
}

/**
 * Configure <model-viewer> 3D Stage
 */
function setupModelViewerControls() {
  if (!modelViewerEl || !currentDish) return;

  modelViewerEl.src = currentDish.optimizedModel || currentDish.model;
  modelViewerEl.alt = `${currentDish.name} in 3D WebAR`;
  if (currentDish.cameraOrbit) modelViewerEl.cameraOrbit = currentDish.cameraOrbit;
  if (currentDish.minCameraOrbit) modelViewerEl.minCameraOrbit = currentDish.minCameraOrbit;
  if (currentDish.maxCameraOrbit) modelViewerEl.maxCameraOrbit = currentDish.maxCameraOrbit;
  if (currentDish.fieldOfView) modelViewerEl.fieldOfView = currentDish.fieldOfView;

  const btnResetCamera = document.getElementById('btnResetCamera');
  if (btnResetCamera) {
    btnResetCamera.addEventListener('click', () => {
      modelViewerEl.cameraOrbit = currentDish.cameraOrbit || '45deg 65deg 0.75m';
      modelViewerEl.fieldOfView = currentDish.fieldOfView || '35deg';
      modelViewerEl.jumpCameraToGoal();
    });
  }

  const btnToggleAutoRotate = document.getElementById('btnToggleAutoRotate');
  if (btnToggleAutoRotate) {
    btnToggleAutoRotate.addEventListener('click', () => {
      modelViewerEl.autoRotate = !modelViewerEl.autoRotate;
    });
  }

  const btnToggleLighting = document.getElementById('btnToggleLighting');
  if (btnToggleLighting) {
    let lightMode = 0;
    btnToggleLighting.addEventListener('click', () => {
      lightMode = (lightMode + 1) % 3;
      if (lightMode === 0) {
        modelViewerEl.exposure = 1.05;
        modelViewerEl.shadowIntensity = 1.1;
      } else if (lightMode === 1) {
        modelViewerEl.exposure = 1.35;
        modelViewerEl.shadowIntensity = 1.4;
      } else {
        modelViewerEl.exposure = 0.8;
        modelViewerEl.shadowIntensity = 0.8;
      }
    });
  }
}

/**
 * Setup AR Launchers
 */
function setupARLaunchers() {
  const btnPlaceTable = document.getElementById('btnPlaceOnTable');
  if (btnPlaceTable && modelViewerEl) {
    btnPlaceTable.addEventListener('click', (e) => {
      e.preventDefault();
      if (modelViewerEl.canActivateAR) {
        modelViewerEl.activateAR();
      } else {
        alert('WebAR Surface Placement: Please open this page on your smartphone via Chrome or Safari to place this dish on your physical table!');
      }
    });
  }
}

/**
 * Render Quick Switcher for other dishes
 */
function renderOtherDishesSwitcher() {
  const container = document.getElementById('otherDishesList');
  if (!container || !menuData.dishes) return;

  container.innerHTML = menuData.dishes.map(d => `
    <a 
      href="./dish.html?dish=${d.id}" 
      class="filter-chip ${d.id === currentDish.id ? 'active' : ''}"
      style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 0.8125rem;"
    >
      <span>${d.name}</span>
      <span style="opacity: 0.7; font-weight: 600;">(Rs. ${d.basePrice.toLocaleString()})</span>
    </a>
  `).join('');
}

/**
 * Setup Marker Reference Modal
 */
function setupMarkerModal() {
  const modal = document.getElementById('markerModal');
  const openBtn = document.getElementById('btnShowMarkerModal');
  const topGuideBtn = document.getElementById('btnTopMarkerGuide');
  const closeBtn = document.getElementById('btnCloseMarkerModal');

  if (!modal) return;

  const openModal = () => modal.classList.add('active');
  const closeModal = () => modal.classList.remove('active');

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (topGuideBtn) topGuideBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

document.addEventListener('DOMContentLoaded', initDishStudio);
