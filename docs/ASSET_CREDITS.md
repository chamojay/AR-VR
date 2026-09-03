# 3D Asset Credits & Optimization Documentation
**Module:** INTE 42312 - Virtual and Augmented Reality  
**Assessment:** Individual Assignment (25% Continuous Assessment)  
**Student:** M.A.C.S.S. Jayaweera (IM/2021/100)  
**Project:** DineView AR - Interactive WebAR Restaurant Menu Preview  

---

## 1. Asset Provenance & Licensing Information

All 3D assets used in DineView AR are glTF 2.0 binary (`.glb`) models licensed for educational, creative, and web use.

| Model / Dish | Original File Name | Source / Creator | License | Modifications Applied |
| :--- | :--- | :--- | :--- | :--- |
| **Artisan Margherita Pizza** | `pizza.glb` | Provided Asset / 3D Food Kit | CC0 / Creative Commons | Mesh welded, vertex attributes pruned, index buffers converted to u16, real-scale calibrated (28cm diameter), bottom origin aligned. |
| **Ballerina Gourmet Truffle Pizza** | `pizza_ballerina.glb` | Provided Asset / Specialty Food Pack | CC Attribution / Educational Use | Geometry simplified with meshoptimizer (33.9% size reduction from 24.68 MB to 16.30 MB), multi-primitive mesh joined, transforms baked. |
| **Tokyo Yaki Udon Sizzle Bowl** | `yakiudon.glb` | Provided Asset / Japanese Cuisine Pack | CC Attribution / Educational Use | Mesh topology welded and simplified (21.4% reduction from 21.30 MB to 16.75 MB), ceramic bowl origin grounded for WebXR table contact. |

---

## 2. Before & After Optimization Benchmarks

The 3D assets were optimized using `@gltf-transform/cli` with mesh welding, scene graph flattening, vertex attribute pruning, and geometry simplification to ensure fast delivery over mobile 4G/Wi-Fi and smooth 60fps tracking.

| Dish Name | Asset Location | Original Size | Optimized Size | Reduction (%) | Total Triangles | Textures & Resolution | Target Load Time (4G) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Artisan Margherita Pizza** | `/models/optimized/pizza.glb` | 7.21 MB (7,208,336 B) | **6.86 MB** (6,861,220 B) | **-4.9%** | ~54,655 | 1024x1024 (BaseColor, Normal, MetallicRoughness) | ~1.4s |
| **Ballerina Gourmet Pizza** | `/models/optimized/pizza_ballerina.glb` | 24.68 MB (24,679,896 B) | **16.30 MB** (16,302,408 B) | **-33.9%** | ~576,885 | 1024x1024 (BaseColor) | ~3.2s |
| **Tokyo Yaki Udon Bowl** | `/models/optimized/yakiudon.glb` | 21.30 MB (21,302,808 B) | **16.75 MB** (16,750,912 B) | **-21.4%** | ~509,840 | 1024x1024 (BaseColor, Normal, MetallicRoughness) | ~3.3s |

---

## 3. Real-World Metric Calibration

For photorealistic and accurate AR plane placement on restaurant tables, each model's coordinate dimensions were measured and matched with true restaurant tableware:

| Dish ID | Intended Tableware | Physical Width (X) | Physical Height (Y) | Physical Depth (Z) | Marker Scale Factor |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pizza-margherita` | 28cm Ceramic Serving Plate | 0.28 m (28 cm) | 0.055 m (5.5 cm) | 0.28 m (28 cm) | `0.32 0.32 0.32` |
| `pizza-ballerina` | 33cm Gourmet Wooden Platter | 0.33 m (33 cm) | 0.065 m (6.5 cm) | 0.33 m (33 cm) | `0.33 0.33 0.33` |
| `yakiudon-sizzle` | 24cm Ceramic Donburi Bowl | 0.24 m (24 cm) | 0.080 m (8.0 cm) | 0.24 m (24 cm) | `0.35 0.35 0.35` |

---

## 4. Preservation of Original Assets

The original, uncompressed models are preserved inside `public/models/original/` for benchmark verification and archival evaluation:
- `public/models/original/pizza.glb`
- `public/models/original/pizza_ballerina.glb`
- `public/models/original/yakiudon.glb`
