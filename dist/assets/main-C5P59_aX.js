import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css               */import"./model-viewer-6q-beTJl.js";const m="/AR-VR/";function i(e){return e?e.startsWith("http://")||e.startsWith("https://")||e.startsWith("data:")?e:`${m}${e.replace(/^\//,"")}`:""}let r=null,o="all";async function u(){try{const e=await fetch(i("data/menu.json"));if(!e.ok)throw new Error("Failed to load menu data");r=await e.json(),p(),l(),f(),v()}catch(e){console.error("Menu initialization error:",e);const t=document.getElementById("dishGrid");t&&(t.innerHTML=`
        <div style="grid-column: 1/-1; padding: 3rem; background: var(--color-soft-cloud); text-align: center;">
          <p style="color: var(--color-sale); font-weight: 700; margin-bottom: 0.5rem;">Failed to load menu data</p>
          <p class="caption-md">Please check public/data/menu.json.</p>
        </div>
      `)}}function p(){const e=document.getElementById("categoryBar");!e||!r.categories||(e.innerHTML=r.categories.map(t=>`
    <button 
      class="filter-chip ${t.id===o?"active":""}" 
      data-category="${t.id}"
      id="cat-tab-${t.id}"
      aria-label="Filter by ${t.name}"
    >
      <span>${t.name}</span>
    </button>
  `).join(""),e.querySelectorAll(".filter-chip").forEach(t=>{t.addEventListener("click",()=>{o=t.dataset.category,e.querySelectorAll(".filter-chip").forEach(a=>a.classList.remove("active")),t.classList.add("active"),l()})}))}function g(e){return`Rs. ${Number(e).toLocaleString("en-US")}`}function l(){const e=document.getElementById("dishGrid"),t=document.getElementById("dishCountLabel");if(!e||!r.dishes)return;const a=o==="all"?r.dishes:r.dishes.filter(n=>n.category===o);if(t&&(t.textContent=`${a.length} Dishes`),a.length===0){e.innerHTML=`
      <div style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--color-mute);">
        No dishes available in this category.
      </div>
    `;return}e.innerHTML=a.map(n=>`
      <article class="product-card" id="product-${n.id}">
        <!-- 3D Interactive Stage -->
        <div class="product-card-image">
          <span class="badge-promo card-badge-top">${n.badge||"Chef Selection"}</span>
          <span class="card-ar-indicator">3D & WebAR</span>
          
          <model-viewer
            class="product-3d-model"
            src="${i(n.optimizedModel||n.model)}"
            alt="${n.name} 3D model"
            camera-controls
            touch-action="pan-y"
            auto-rotate
            auto-rotate-delay="1000"
            rotation-per-second="20deg"
            shadow-intensity="1.0"
            shadow-softness="0.9"
            exposure="1.05"
            camera-orbit="${n.cameraOrbit||"45deg 65deg 0.75m"}"
            loading="lazy"
            reveal="auto"
          ></model-viewer>
          
          <div class="card-touch-hint">Touch & Spin 3D</div>
        </div>

        <!-- Clean Meta: Name, Price & Action Buttons -->
        <div class="product-card-meta">
          <h3 class="product-name" style="font-size: 1.15rem; font-weight: 700;">${n.name}</h3>

          <div class="product-price-row" style="margin-top: 4px; margin-bottom: 8px;">
            <div class="product-price" style="font-size: 1.35rem; font-weight: 800;">${g(n.basePrice)}</div>
          </div>

          <div class="product-cta-row">
            <a 
              href="${i(`dish.html?dish=${n.id}`)}" 
              class="btn-primary"
              id="btn-inspect-${n.id}"
              style="flex: 1; padding: 12px 16px; min-height: 44px; font-size: 0.875rem; text-align: center;"
            >
              <span>View in AR</span>
            </a>
            <a 
              href="${i(`marker-ar.html?dish=${n.id}`)}" 
              class="btn-secondary"
              id="btn-ar-${n.id}"
              style="padding: 12px 16px; min-height: 44px; font-size: 0.875rem;"
              title="Scan with Hiro Marker"
            >
              <span>Scan Marker</span>
            </a>
          </div>
        </div>
      </article>
    `).join("")}function f(){const e=document.getElementById("markerModal"),t=document.getElementById("btnShowMarkerModal"),a=document.getElementById("btnTopMarkerGuide"),n=document.getElementById("btnCloseMarkerModal");if(!e)return;const s=()=>e.classList.add("active"),c=()=>e.classList.remove("active");t&&t.addEventListener("click",s),a&&a.addEventListener("click",s),n&&n.addEventListener("click",c),e.addEventListener("click",d=>{d.target===e&&c()}),document.addEventListener("keydown",d=>{d.key==="Escape"&&e.classList.contains("active")&&c()})}function v(){const e=document.getElementById("btnExploreHero"),t=document.getElementById("markerModal");e&&t&&e.addEventListener("click",()=>{t.classList.add("active")})}document.addEventListener("DOMContentLoaded",u);
