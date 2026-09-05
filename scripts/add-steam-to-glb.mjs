import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Embeds a lightweight looping steam animation directly in each optimized GLB.
 * As part of the asset, the effect follows the dish in markerless AR.
 */
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const modelDir = path.join(scriptDir, '..', 'public', 'models', 'optimized');
const effectVersion = 2;

// Per-model surface origins in the GLBs' existing local metre coordinates.
const dishes = [
  { file: 'pizza.glb', center: [-0.031, 0.047, -0.018], radius: 0.16, height: 0.115 },
  { file: 'pizza_ballerina.glb', center: [0.002, 0.113, 0], radius: 0.115, height: 0.105 },
  { file: 'yakiudon.glb', center: [0.040, 0.068, 0], radius: 0.095, height: 0.12 },
];

const FLOAT = 5126;
const UNSIGNED_SHORT = 5123;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;
const align4 = value => (value + 3) & ~3;

function parseGlb(filePath) {
  const data = fs.readFileSync(filePath);
  if (data.readUInt32LE(0) !== 0x46546c67 || data.readUInt32LE(4) !== 2) {
    throw new Error(`${path.basename(filePath)} is not a GLB 2.0 file.`);
  }

  let offset = 12;
  let json;
  let binary = Buffer.alloc(0);
  while (offset < data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.readUInt32LE(offset + 4);
    const chunk = data.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8').trimEnd());
    if (type === 0x004e4942) binary = Buffer.from(chunk);
    offset += 8 + length;
  }
  if (!json) throw new Error(`${path.basename(filePath)} has no JSON chunk.`);
  return { json, binary };
}

function floatBuffer(values) {
  const array = new Float32Array(values);
  return Buffer.from(array.buffer, array.byteOffset, array.byteLength);
}

function ushortBuffer(values) {
  const array = new Uint16Array(values);
  return Buffer.from(array.buffer, array.byteOffset, array.byteLength);
}

function embedSteam(gltf, originalBinary, settings) {
  gltf.bufferViews ||= [];
  gltf.accessors ||= [];
  gltf.materials ||= [];
  gltf.meshes ||= [];
  gltf.nodes ||= [];
  gltf.animations ||= [];
  gltf.extensionsUsed ||= [];
  if (!gltf.extensionsUsed.includes('KHR_materials_unlit')) {
    gltf.extensionsUsed.push('KHR_materials_unlit');
  }

  const pieces = [originalBinary];
  let binaryLength = originalBinary.length;

  function addBufferView(buffer, target) {
    const paddedOffset = align4(binaryLength);
    if (paddedOffset > binaryLength) pieces.push(Buffer.alloc(paddedOffset - binaryLength));
    pieces.push(buffer);
    binaryLength = paddedOffset + buffer.length;
    const view = { buffer: 0, byteOffset: paddedOffset, byteLength: buffer.length };
    if (target) view.target = target;
    gltf.bufferViews.push(view);
    return gltf.bufferViews.length - 1;
  }

  function addAccessor(buffer, { componentType, count, type, min, max, target }) {
    const accessor = {
      bufferView: addBufferView(buffer, target),
      componentType,
      count,
      type,
    };
    if (min) accessor.min = min;
    if (max) accessor.max = max;
    gltf.accessors.push(accessor);
    return gltf.accessors.length - 1;
  }

  // Three crossed radial fans give every wisp soft, volumetric-looking edges
  // from any camera angle, without an extra texture download.
  const segments = 12;
  const positions = [];
  const colors = [];
  const indices = [];
  for (const planeAngle of [0, Math.PI / 3, Math.PI * 2 / 3]) {
    const base = positions.length / 3;
    const dx = Math.cos(planeAngle);
    const dz = Math.sin(planeAngle);
    positions.push(0, 0, 0);
    colors.push(0.96, 0.97, 0.98, 0.34);
    for (let i = 0; i < segments; i += 1) {
      const angle = i / segments * Math.PI * 2;
      const horizontal = Math.cos(angle);
      positions.push(dx * horizontal, Math.sin(angle), dz * horizontal);
      colors.push(0.96, 0.97, 0.98, 0);
    }
    for (let i = 0; i < segments; i += 1) {
      indices.push(base, base + 1 + i, base + 1 + (i + 1) % segments);
    }
  }

  const positionAccessor = addAccessor(floatBuffer(positions), {
    componentType: FLOAT,
    count: positions.length / 3,
    type: 'VEC3',
    min: [-1, -1, -1],
    max: [1, 1, 1],
    target: ARRAY_BUFFER,
  });
  const colorAccessor = addAccessor(floatBuffer(colors), {
    componentType: FLOAT,
    count: colors.length / 4,
    type: 'VEC4',
    min: [0.96, 0.97, 0.98, 0],
    max: [0.96, 0.97, 0.98, 0.34],
    target: ARRAY_BUFFER,
  });
  const indexAccessor = addAccessor(ushortBuffer(indices), {
    componentType: UNSIGNED_SHORT,
    count: indices.length,
    type: 'SCALAR',
    min: [0],
    max: [positions.length / 3 - 1],
    target: ELEMENT_ARRAY_BUFFER,
  });

  const materialIndex = gltf.materials.push({
    name: 'DineView_Steam_Translucent',
    pbrMetallicRoughness: {
      baseColorFactor: [0.96, 0.97, 0.98, 0.90],
      metallicFactor: 0,
      roughnessFactor: 1,
    },
    alphaMode: 'BLEND',
    doubleSided: true,
    extensions: { KHR_materials_unlit: {} },
    extras: { dineviewEffect: 'steam' },
  }) - 1;
  const meshIndex = gltf.meshes.push({
    name: 'DineView_Steam_Wisp',
    primitives: [{
      attributes: { POSITION: positionAccessor, COLOR_0: colorAccessor },
      indices: indexAccessor,
      material: materialIndex,
      mode: 4,
    }],
  }) - 1;

  const animation = { name: 'DineView Steam', samplers: [], channels: [] };
  const scene = gltf.scenes[gltf.scene ?? 0];
  const duration = 8;
  const life = 1.8;

  for (let i = 0; i < 10; i += 1) {
    const angle = i * 2.399963229728653;
    const ring = settings.radius * (0.22 + (i * 37) % 67 / 100);
    const originX = settings.center[0] + Math.cos(angle) * ring;
    const originZ = settings.center[2] + Math.sin(angle) * ring;
    const startY = settings.center[1] + i % 3 * 0.003;
    const driftX = Math.sin(i * 1.7) * settings.radius * 0.16;
    const driftZ = Math.cos(i * 1.3) * settings.radius * 0.13;
    const rise = settings.height * (0.82 + i % 4 * 0.07);
    const phase = 0.08 + i * 0.64;
    const times = [0, phase, phase + 0.12, phase + life * 0.42, phase + life * 0.82, phase + life, duration];
    const progressValues = [0, 0, 0.06, 0.42, 0.82, 1, 1];
    const scaleValues = [0.001, 0.001, 0.32, 0.78, 1.12, 0.001, 0.001];
    const width = 0.0306 + i % 3 * 0.0051;
    const height = 0.0429 + i % 4 * 0.00495;
    const translations = [];
    const scales = [];

    for (let k = 0; k < times.length; k += 1) {
      const progress = progressValues[k];
      translations.push(
        originX + driftX * progress,
        startY + rise * progress,
        originZ + driftZ * progress,
      );
      scales.push(width * scaleValues[k], height * scaleValues[k], width * scaleValues[k]);
    }

    const halfRotation = angle * 0.5 % Math.PI;
    const nodeIndex = gltf.nodes.push({
      name: `DineView_Steam_Emitter_${String(i + 1).padStart(2, '0')}`,
      mesh: meshIndex,
      translation: [originX, startY, originZ],
      rotation: [0, Math.sin(halfRotation), 0, Math.cos(halfRotation)],
      scale: [0.001, 0.001, 0.001],
      extras: { dineviewEffect: 'steam' },
    }) - 1;
    scene.nodes.push(nodeIndex);

    const timeAccessor = addAccessor(floatBuffer(times), {
      componentType: FLOAT,
      count: times.length,
      type: 'SCALAR',
      min: [0],
      max: [duration],
    });
    const translationAccessor = addAccessor(floatBuffer(translations), {
      componentType: FLOAT,
      count: translations.length / 3,
      type: 'VEC3',
    });
    const scaleAccessor = addAccessor(floatBuffer(scales), {
      componentType: FLOAT,
      count: scales.length / 3,
      type: 'VEC3',
    });

    const translationSampler = animation.samplers.push({
      input: timeAccessor,
      output: translationAccessor,
      interpolation: 'LINEAR',
    }) - 1;
    animation.channels.push({
      sampler: translationSampler,
      target: { node: nodeIndex, path: 'translation' },
    });
    const scaleSampler = animation.samplers.push({
      input: timeAccessor,
      output: scaleAccessor,
      interpolation: 'LINEAR',
    }) - 1;
    animation.channels.push({
      sampler: scaleSampler,
      target: { node: nodeIndex, path: 'scale' },
    });
  }

  gltf.animations.push(animation);
  const binary = Buffer.concat(pieces);
  gltf.buffers ||= [{}];
  gltf.buffers[0].byteLength = binary.length;
  gltf.asset ||= { version: '2.0' };
  gltf.asset.generator = `${gltf.asset.generator ? `${gltf.asset.generator}; ` : ''}DineView Steam Embedder`;
  gltf.asset.extras = { ...(gltf.asset.extras || {}), dineviewSteamVersion: effectVersion };
  return binary;
}

function upgradeSteamVisibility(gltf, binary) {
  const material = (gltf.materials || []).find(item => item.extras?.dineviewEffect === 'steam');
  if (!material) throw new Error('Existing DineView steam material was not found.');
  material.pbrMetallicRoughness.baseColorFactor[3] = 0.90;

  // Increase the soft center opacity stored in COLOR_0.
  const mesh = (gltf.meshes || []).find(item => item.name === 'DineView_Steam_Wisp');
  const colorAccessor = gltf.accessors[mesh.primitives[0].attributes.COLOR_0];
  const colorView = gltf.bufferViews[colorAccessor.bufferView];
  const colorStart = (colorView.byteOffset || 0) + (colorAccessor.byteOffset || 0);
  for (let i = 0; i < colorAccessor.count; i += 1) {
    const alphaOffset = colorStart + (i * 4 + 3) * 4;
    if (binary.readFloatLE(alphaOffset) > 0.01) binary.writeFloatLE(0.34, alphaOffset);
  }
  colorAccessor.max = [0.96, 0.97, 0.98, 0.34];

  // Make every animated puff 70% wider and 65% taller. This updates only
  // the steam scale outputs; the dish meshes and physical AR size are untouched.
  const steamAnimation = (gltf.animations || []).find(item => item.name === 'DineView Steam');
  const updatedAccessors = new Set();
  for (const channel of steamAnimation?.channels || []) {
    if (channel.target.path !== 'scale') continue;
    const accessorIndex = steamAnimation.samplers[channel.sampler].output;
    if (updatedAccessors.has(accessorIndex)) continue;
    updatedAccessors.add(accessorIndex);
    const accessor = gltf.accessors[accessorIndex];
    const view = gltf.bufferViews[accessor.bufferView];
    const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    for (let i = 0; i < accessor.count; i += 1) {
      const vectorOffset = start + i * 12;
      binary.writeFloatLE(binary.readFloatLE(vectorOffset) * 1.70, vectorOffset);
      binary.writeFloatLE(binary.readFloatLE(vectorOffset + 4) * 1.65, vectorOffset + 4);
      binary.writeFloatLE(binary.readFloatLE(vectorOffset + 8) * 1.70, vectorOffset + 8);
    }
  }

  gltf.asset.extras.dineviewSteamVersion = effectVersion;
  gltf.asset.generator = `${gltf.asset.generator}; DineView Steam Visibility Upgrade`;
  return binary;
}
function writeGlb(filePath, gltf, binary) {
  const jsonData = Buffer.from(JSON.stringify(gltf));
  const paddedJsonLength = align4(jsonData.length);
  const paddedBinaryLength = align4(binary.length);
  const totalLength = 12 + 8 + paddedJsonLength + 8 + paddedBinaryLength;
  const output = Buffer.alloc(totalLength);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(totalLength, 8);
  output.writeUInt32LE(paddedJsonLength, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  jsonData.copy(output, 20);
  output.fill(0x20, 20 + jsonData.length, 20 + paddedJsonLength);
  const binaryHeader = 20 + paddedJsonLength;
  output.writeUInt32LE(paddedBinaryLength, binaryHeader);
  output.writeUInt32LE(0x004e4942, binaryHeader + 4);
  binary.copy(output, binaryHeader + 8);
  fs.writeFileSync(filePath, output);
}

for (const settings of dishes) {
  const filePath = path.join(modelDir, settings.file);
  const { json, binary } = parseGlb(filePath);
  const existingVersion = json.asset?.extras?.dineviewSteamVersion || 0;
  if (existingVersion === effectVersion) {
    console.log(`Skipping ${settings.file}: visible steam v${effectVersion} is already embedded.`);
    continue;
  }
  if (existingVersion > 0) {
    writeGlb(filePath, json, upgradeSteamVisibility(json, binary));
    console.log(`Upgraded visible AR steam in ${settings.file} to v${effectVersion}.`);
    continue;
  }
  writeGlb(filePath, json, embedSteam(json, binary, settings));
  console.log(`Embedded visible markerless AR steam in ${settings.file}.`);
}
