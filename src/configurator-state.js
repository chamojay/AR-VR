/**
 * DineView AR - Central State Manager
 * Handles multi-step dish customization, portion multipliers, add-ons,
 * dynamic pricing/calorie calculations, and persistence between pages.
 */

const STORAGE_KEY = 'dineview_plate_config';

export class ConfiguratorState {
  constructor(menuData) {
    this.menuData = menuData;
    this.dishes = menuData.dishes || [];
    this.listeners = new Set();
    
    // Default initial state
    const firstDish = this.dishes[0] || {};
    this.state = {
      dishId: firstDish.id || 'pizza-margherita',
      portion: 'regular',
      selectedAddOns: [],
      isConfirmed: false,
      timestamp: Date.now()
    };

    // Hydrate from localStorage if valid
    this.loadPersistedState();
  }

  /**
   * Load saved configuration from localStorage
   */
  loadPersistedState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (this.getDishById(parsed.dishId)) {
          this.state = { ...this.state, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Could not restore plate state:', e);
    }
  }

  /**
   * Persist current state to localStorage
   */
  persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Could not save plate state:', e);
    }
  }

  /**
   * Register a state update listener
   */
  subscribe(listener) {
    this.listeners.add(listener);
    // Initial callback
    listener(this.getStateSnapshot());
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all registered listeners
   */
  notify() {
    this.persistState();
    const snapshot = this.getStateSnapshot();
    this.listeners.forEach(fn => fn(snapshot));
    window.dispatchEvent(new CustomEvent('dineview:plate-updated', { detail: snapshot }));
  }

  /**
   * Find dish by ID
   */
  getDishById(id) {
    return this.dishes.find(d => d.id === id) || this.dishes[0];
  }

  /**
   * Select a different dish
   */
  setDish(dishId) {
    const dish = this.getDishById(dishId);
    if (!dish) return;
    this.state.dishId = dish.id;
    this.state.selectedAddOns = []; // reset addons when changing dish
    this.state.isConfirmed = false;
    this.notify();
  }

  /**
   * Select portion (small, regular, large)
   */
  setPortion(portionKey) {
    const dish = this.getCurrentDish();
    if (dish && dish.portions && dish.portions[portionKey]) {
      this.state.portion = portionKey;
      this.notify();
    }
  }

  /**
   * Toggle an add-on on/off
   */
  toggleAddOn(addonId) {
    const dish = this.getCurrentDish();
    const addon = (dish.addOns || []).find(a => a.id === addonId);
    if (!addon) return;

    const index = this.state.selectedAddOns.indexOf(addonId);
    if (index > -1) {
      this.state.selectedAddOns.splice(index, 1);
    } else {
      this.state.selectedAddOns.push(addonId);
    }
    this.notify();
  }

  /**
   * Confirm plate configuration
   */
  confirmPlate() {
    this.state.isConfirmed = true;
    this.notify();
  }

  /**
   * Reset configuration to regular defaults
   */
  resetConfiguration() {
    this.state.portion = 'regular';
    this.state.selectedAddOns = [];
    this.state.isConfirmed = false;
    this.notify();
  }

  /**
   * Get active dish object
   */
  getCurrentDish() {
    return this.getDishById(this.state.dishId);
  }

  /**
   * Get comprehensive snapshot of current calculated values
   */
  getStateSnapshot() {
    const dish = this.getCurrentDish();
    const portionData = (dish.portions && dish.portions[this.state.portion]) || {
      label: 'Regular',
      scale: 1.0,
      priceMultiplier: 1.0,
      calorieMultiplier: 1.0,
      realWidthM: dish.realWidthM
    };

    // Calculate add-on cost and calories
    const selectedAddonObjects = (dish.addOns || []).filter(a =>
      this.state.selectedAddOns.includes(a.id)
    );
    const addonsPrice = selectedAddonObjects.reduce((sum, a) => sum + (a.price || 0), 0);
    const addonsCalories = selectedAddonObjects.reduce((sum, a) => sum + (a.calories || 0), 0);

    const basePriceCalc = Math.round(dish.basePrice * (portionData.priceMultiplier || 1.0));
    const totalPrice = basePriceCalc + addonsPrice;

    const baseCalCalc = Math.round(dish.baseCalories * (portionData.calorieMultiplier || 1.0));
    const totalCalories = baseCalCalc + addonsCalories;

    const scale = portionData.scale || 1.0;
    const realWidthM = portionData.realWidthM || (dish.realWidthM * scale);

    return {
      dish,
      dishId: dish.id,
      dishName: dish.name,
      modelPath: dish.optimizedModel || dish.model,
      portionKey: this.state.portion,
      portionData,
      selectedAddOns: [...this.state.selectedAddOns],
      selectedAddonObjects,
      totalPrice,
      totalCalories,
      scale,
      realWidthM,
      realWidthCm: Math.round(realWidthM * 100),
      isConfirmed: this.state.isConfirmed,
      markerScale: this.calculateMarkerScale(dish.markerScale, scale)
    };
  }

  /**
   * Multiplies marker scale string by portion scale
   */
  calculateMarkerScale(baseMarkerScaleStr, portionScale) {
    if (!baseMarkerScaleStr) return '0.35 0.35 0.35';
    const parts = baseMarkerScaleStr.split(' ').map(parseFloat);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return `${(parts[0] * portionScale).toFixed(3)} ${(parts[1] * portionScale).toFixed(3)} ${(parts[2] * portionScale).toFixed(3)}`;
    }
    return baseMarkerScaleStr;
  }
}
