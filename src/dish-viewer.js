import '@google/model-viewer';

/**
 * DineView AR - Streamlined Dish 3D & AR Controller
 */

const baseUrl = import.meta.env.BASE_URL || '/';

function resolveUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return `${baseUrl}${path.replace(/^\//, '')}`;
}

let menuData = null;
let currentDish = null;
let modelViewerEl = null;

async function initDishStudio() {
  try {
    const res = await fetch(resolveUrl('data/menu.json'));
    if (!res.ok) throw new Error('Failed to load menu data');
    menuData = await res.json();

    const urlParams = new URLSearchParams(window.location.search);
    const requestedDishId = urlParams.get('dish') || 'pizza-margherita';

    currentDish = menuData.dishes.find(d => d.id === requestedDishId) || menuData.dishes[0];
    modelViewerEl = document.getElementById('studioViewer');

    renderDishDetails();
    setupModelViewerControls();
    setupARLaunchers();
    renderIngredientsAndDietary();
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
    btnMarkerAR.href = resolveUrl(`marker-ar.html?dish=${currentDish.id}`);
  }
}

/**
 * Configure <model-viewer> 3D Stage
 */
function setupModelViewerControls() {
  if (!modelViewerEl || !currentDish) return;

  modelViewerEl.src = resolveUrl(currentDish.optimizedModel || currentDish.model);
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

let activeHotspotIndex = -1;
let hotspotsVisible = true;

/**
 * Configure Ash-Colored Hotspots on <model-viewer>
 */
function setupDishHotspots() {
  if (!modelViewerEl || !currentDish) return;

  // Clear existing hotspot buttons from previous dish
  modelViewerEl.querySelectorAll('.hotspot-dot').forEach(btn => btn.remove());

  const hotspots = currentDish.hotspots || [];
  if (hotspots.length === 0) {
    const hint = document.getElementById('pdpStageHint');
    if (hint) hint.textContent = 'Touch to spin 360°';
    return;
  }

  hotspots.forEach((h, idx) => {
    const btn = document.createElement('button');
    btn.className = 'hotspot-dot';
    btn.slot = h.slot || `hotspot-${idx}`;
    btn.dataset.position = h.position;
    btn.dataset.normal = h.normal || '0 1 0';
    btn.dataset.visibilityAttribute = 'visible';
    btn.setAttribute('aria-label', `Ingredient highlight: ${h.title}`);
    btn.setAttribute('title', h.title);

    // Inner subtle ash-gray core and pulsing ring
    btn.innerHTML = `
      <div class="hotspot-dot-core"></div>
      <div class="hotspot-dot-ring"></div>
    `;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      displayHotspotDetail(h, idx, btn);
    });

    btn.addEventListener('touchend', (e) => {
      e.stopPropagation();
      displayHotspotDetail(h, idx, btn);
    });

    modelViewerEl.appendChild(btn);
  });
}

/**
 * Display Hotspot Detail Card Popup
 */
function displayHotspotDetail(hotspot, index, triggerBtn) {
  const card = document.getElementById('hotspotDetailCard');
  const titleEl = document.getElementById('hotspotTitle');
  const descEl = document.getElementById('hotspotDesc');
  const badgeEl = document.getElementById('hotspotBadge');

  if (!card) return;

  activeHotspotIndex = index;

  if (titleEl) titleEl.textContent = hotspot.title;
  if (descEl) descEl.textContent = hotspot.desc;
  if (badgeEl) badgeEl.textContent = `INGREDIENT #${index + 1} • CHEF NOTE`;

  // Highlight active dot
  modelViewerEl.querySelectorAll('.hotspot-dot').forEach((b, i) => {
    b.classList.toggle('active', i === index);
  });

  card.classList.add('active');

  // Center / nudge view slightly towards hotspot
  if (hotspot.position && modelViewerEl) {
    const posParts = hotspot.position.replace(/m/g, '').trim().split(/\s+/);
    if (posParts.length === 3) {
      modelViewerEl.target = `${posParts[0]}m ${posParts[1]}m ${posParts[2]}m`;
    }
  }
}

/**
 * Setup Hotspot Visibility Toggle & Card Interactions
 */
function setupHotspotToggleAndControls() {
  const btnToggle = document.getElementById('btnToggleHotspots');
  const btnClose = document.getElementById('btnCloseHotspotCard');
  const btnFocus = document.getElementById('btnFocusHotspot');
  const btnTriggerFromPanel = document.getElementById('btnTriggerHotspotsFromPanel');
  const card = document.getElementById('hotspotDetailCard');
  const hint = document.getElementById('pdpStageHint');

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      hotspotsVisible = !hotspotsVisible;
      if (modelViewerEl) {
        modelViewerEl.classList.toggle('hotspots-hidden', !hotspotsVisible);
      }
      btnToggle.classList.toggle('active', hotspotsVisible);
      btnToggle.style.background = hotspotsVisible ? 'var(--color-ink)' : 'var(--color-canvas)';
      btnToggle.style.color = hotspotsVisible ? '#fff' : 'var(--color-ink)';
      if (hint) {
        hint.textContent = hotspotsVisible ? 'Touch ash dots to view ingredients' : 'Ingredient dots hidden';
      }
      if (!hotspotsVisible && card) {
        card.classList.remove('active');
      }
    });
  }

  if (btnClose && card) {
    btnClose.addEventListener('click', () => {
      card.classList.remove('active');
      modelViewerEl.querySelectorAll('.hotspot-dot').forEach(b => b.classList.remove('active'));
    });
  }

  if (btnFocus && modelViewerEl && currentDish) {
    btnFocus.addEventListener('click', () => {
      const hotspots = currentDish.hotspots || [];
      if (activeHotspotIndex >= 0 && hotspots[activeHotspotIndex]) {
        const h = hotspots[activeHotspotIndex];
        const posParts = h.position.replace(/m/g, '').trim().split(/\s+/);
        if (posParts.length === 3) {
          modelViewerEl.target = `${posParts[0]}m ${posParts[1]}m ${posParts[2]}m`;
          modelViewerEl.cameraOrbit = 'auto auto 0.45m';
          modelViewerEl.jumpCameraToGoal();
        }
      }
    });
  }

  if (btnTriggerFromPanel) {
    btnTriggerFromPanel.addEventListener('click', () => {
      // Turn on hotspots if hidden
      hotspotsVisible = true;
      if (modelViewerEl) modelViewerEl.classList.remove('hotspots-hidden');
      if (btnToggle) {
        btnToggle.classList.add('active');
        btnToggle.style.background = 'var(--color-ink)';
        btnToggle.style.color = '#fff';
      }
      // Trigger first hotspot
      const hotspots = currentDish.hotspots || [];
      if (hotspots.length > 0) {
        const firstBtn = modelViewerEl.querySelector('.hotspot-dot');
        displayHotspotDetail(hotspots[0], 0, firstBtn);
      }
      // Scroll to stage smoothly on mobile
      const stage = document.querySelector('.pdp-stage-container');
      if (stage) stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

function getIngredientIcon(ing) {
  const lower = ing.toLowerCase();
  if (lower.includes('sourdough') || lower.includes('flour') || lower.includes('crust')) return '🌾';
  if (lower.includes('mozzarella') || lower.includes('cheese') || lower.includes('stracciatella') || lower.includes('taleggio') || lower.includes('fior di latte')) return '🧀';
  if (lower.includes('tomato') || lower.includes('passata') || lower.includes('marzano')) return '🍅';
  if (lower.includes('basil') || lower.includes('thyme') || lower.includes('arugula') || lower.includes('herb') || lower.includes('cabbage') || lower.includes('greens') || lower.includes('scallion')) return '🌿';
  if (lower.includes('truffle') || lower.includes('mushroom') || lower.includes('porcini') || lower.includes('shiitake')) return '🍄';
  if (lower.includes('oil') || lower.includes('olive') || lower.includes('drizzle')) return '🫒';
  if (lower.includes('udon') || lower.includes('noodle')) return '🍜';
  if (lower.includes('katsuobushi') || lower.includes('bonito') || lower.includes('fish') || lower.includes('dashi')) return '🐟';
  if (lower.includes('salt') || lower.includes('pepper') || lower.includes('sesame')) return '🧂';
  if (lower.includes('garlic') || lower.includes('butter')) return '🧄';
  return '✨';
}

/**
 * Render Ingredients & Nutritional Highlights in PDP
 */
function renderIngredientsAndDietary() {
  const listEl = document.getElementById('pdpIngredientsList');
  const allergensEl = document.getElementById('pdpAllergensNotice');

  if (!currentDish) return;

  if (listEl) {
    const ingredients = currentDish.ingredients || [];
    listEl.innerHTML = ingredients.map((ing, idx) => {
      const icon = getIngredientIcon(ing);
      return `
        <div 
          class="interactive-ingredient-card" 
          data-index="${idx}"
          style="background: var(--color-canvas); border: 1px solid var(--color-hairline); border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.03);"
        >
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--color-soft-cloud); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0;">
              ${icon}
            </div>
            <div>
              <div style="font-weight: 700; font-size: 0.9375rem; color: var(--color-ink);">${ing}</div>
              <div style="font-size: 0.75rem; color: var(--color-mute); margin-top: 2px;">Fresh authentic artisan component</div>
            </div>
          </div>
          <span style="font-size: 0.75rem; font-weight: 700; color: #16a34a; background: rgba(34, 197, 94, 0.1); padding: 4px 10px; border-radius: 9999px; white-space: nowrap;">
            Inspect 3D ➔
          </span>
        </div>
      `;
    }).join('');

    // Attach click listeners to cards to rotate & spotlight 3D model
    listEl.querySelectorAll('.interactive-ingredient-card').forEach((card, idx) => {
      card.addEventListener('click', () => {
        listEl.querySelectorAll('.interactive-ingredient-card').forEach(c => {
          c.style.borderColor = 'var(--color-hairline)';
          c.style.background = 'var(--color-canvas)';
        });
        card.style.borderColor = '#16a34a';
        card.style.background = 'rgba(34, 197, 94, 0.05)';

        if (modelViewerEl) {
          const angles = ['35deg 65deg 0.7m', '-45deg 55deg 0.72m', '55deg 70deg 0.65m', '0deg 50deg 0.68m', '-80deg 60deg 0.7m', '70deg 50deg 0.68m'];
          modelViewerEl.cameraOrbit = angles[idx % angles.length];
          modelViewerEl.jumpCameraToGoal();
        }
      });
    });
  }

  if (allergensEl) {
    const allergens = currentDish.allergens || [];
    const dietary = currentDish.dietary || [];
    const prep = currentDish.prepTime || '12-15 mins';
    allergensEl.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-md); justify-content: space-between; align-items: center;">
        <div><strong>Allergens:</strong> ${allergens.length ? allergens.join(', ') : 'None listed'}</div>
        <div><strong>Dietary:</strong> ${dietary.join(' • ')}</div>
        <div><strong>Prep Time:</strong> ${prep}</div>
      </div>
    `;
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
      href="${resolveUrl(`dish.html?dish=${d.id}`)}" 
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
