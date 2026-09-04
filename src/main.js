import '@google/model-viewer';

/**
 * DineView AR - Main Menu Controller
 */

let menuData = null;
let activeCategory = 'all';

async function initMenu() {
  try {
    const res = await fetch('./data/menu.json');
    if (!res.ok) throw new Error('Failed to load menu data');
    menuData = await res.json();
    
    renderCategoryFilter();
    renderDishGrid();
    setupMarkerModal();
    setupHeroButton();
  } catch (error) {
    console.error('Menu initialization error:', error);
    const container = document.getElementById('dishGrid');
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; padding: 3rem; background: var(--color-soft-cloud); text-align: center;">
          <p style="color: var(--color-sale); font-weight: 700; margin-bottom: 0.5rem;">Failed to load menu data</p>
          <p class="caption-md">Please check public/data/menu.json.</p>
        </div>
      `;
    }
  }
}

/**
 * Render Category Filter Chips
 */
function renderCategoryFilter() {
  const container = document.getElementById('categoryBar');
  if (!container || !menuData.categories) return;

  container.innerHTML = menuData.categories.map(cat => `
    <button 
      class="filter-chip ${cat.id === activeCategory ? 'active' : ''}" 
      data-category="${cat.id}"
      id="cat-tab-${cat.id}"
      aria-label="Filter by ${cat.name}"
    >
      <span>${cat.name}</span>
    </button>
  `).join('');

  container.querySelectorAll('.filter-chip').forEach(tab => {
    tab.addEventListener('click', () => {
      activeCategory = tab.dataset.category;
      container.querySelectorAll('.filter-chip').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderDishGrid();
    });
  });
}

/**
 * Format currency to LKR
 */
function formatLKR(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-US')}`;
}

/**
 * Render Product Cards Grid - Clean, Focused Design
 */
function renderDishGrid() {
  const container = document.getElementById('dishGrid');
  const countLabel = document.getElementById('dishCountLabel');
  if (!container || !menuData.dishes) return;

  const filtered = activeCategory === 'all'
    ? menuData.dishes
    : menuData.dishes.filter(d => d.category === activeCategory);

  if (countLabel) {
    countLabel.textContent = `${filtered.length} Dishes`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--color-mute);">
        No dishes available in this category.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(dish => {
    return `
      <article class="product-card" id="product-${dish.id}">
        <!-- 3D Interactive Stage -->
        <div class="product-card-image">
          <span class="badge-promo card-badge-top">${dish.badge || 'Chef Selection'}</span>
          <span class="card-ar-indicator">3D & WebAR</span>
          
          <model-viewer
            class="product-3d-model"
            src="${dish.optimizedModel || dish.model}"
            alt="${dish.name} 3D model"
            camera-controls
            touch-action="pan-y"
            auto-rotate
            auto-rotate-delay="1000"
            rotation-per-second="20deg"
            shadow-intensity="1.0"
            shadow-softness="0.9"
            exposure="1.05"
            camera-orbit="${dish.cameraOrbit || '45deg 65deg 0.75m'}"
            loading="lazy"
            reveal="auto"
          ></model-viewer>
          
          <div class="card-touch-hint">Touch & Spin 3D</div>
        </div>

        <!-- Clean Meta: Name, Price & Action Buttons -->
        <div class="product-card-meta">
          <h3 class="product-name" style="font-size: 1.15rem; font-weight: 700;">${dish.name}</h3>

          <div class="product-price-row" style="margin-top: 4px; margin-bottom: 8px;">
            <div class="product-price" style="font-size: 1.35rem; font-weight: 800;">${formatLKR(dish.basePrice)}</div>
          </div>

          <div class="product-cta-row">
            <a 
              href="./dish.html?dish=${dish.id}" 
              class="btn-primary"
              id="btn-inspect-${dish.id}"
              style="flex: 1; padding: 12px 16px; min-height: 44px; font-size: 0.875rem; text-align: center;"
            >
              <span>View in AR</span>
            </a>
            <a 
              href="./marker-ar.html?dish=${dish.id}" 
              class="btn-secondary"
              id="btn-ar-${dish.id}"
              style="padding: 12px 16px; min-height: 44px; font-size: 0.875rem;"
              title="Scan with Hiro Marker"
            >
              <span>Scan Marker</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}

function setupHeroButton() {
  const heroBtn = document.getElementById('btnExploreHero');
  const modal = document.getElementById('markerModal');
  if (heroBtn && modal) {
    heroBtn.addEventListener('click', () => {
      modal.classList.add('active');
    });
  }
}

document.addEventListener('DOMContentLoaded', initMenu);
