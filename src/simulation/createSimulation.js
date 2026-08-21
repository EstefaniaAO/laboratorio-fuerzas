import * as THREE from 'three/webgpu';
import {
  Fn,
  If,
  color,
  float,
  hash,
  instanceIndex,
  instancedArray,
  max,
  mix,
  pow,
  step,
  uint,
  uv,
  vec3,
  vec4
} from 'three/tsl';

import {
  applyWind,
  applyAttraction,
  applyRepulsion,
  applyVortex,
  applyGalaxy,
  applyEnergyRays,
  applyAdhesionForce,
  applyWavePulse,
  applyDrag,
  applySphereBoundary
} from './forces.js';

import { computeParticleColor } from './colorModes.js';

export function createSimulation({ renderer, scene, params, count = 131072 }) {
  // ESTADO DE LAS PARTÍCULAS EN GPU -----------------------------------------
  const positionBuffer = instancedArray(count, 'vec3');
  const velocityBuffer = instancedArray(count, 'vec3');

  // INICIALIZACIÓN DENTRO DE LA ESFERA INVISIBLE ----------------------------
  const initParticles = Fn(() => {
    const i = instanceIndex;
    const p = positionBuffer.element(i);
    const v = velocityBuffer.element(i);

    // Semillas aleatorias pseudo-hash
    const r1 = hash(i.add(uint(11)));
    const r2 = hash(i.add(uint(23)));
    const r3 = hash(i.add(uint(37)));
    const r4 = hash(i.add(uint(53)));
    const r5 = hash(i.add(uint(71)));
    const r6 = hash(i.add(uint(89)));
    const r7 = hash(i.add(uint(107)));
    const r8 = hash(i.add(uint(131)));

    // Dirección 3D aleatoria
    const dir = vec3(r1.sub(0.5), r2.sub(0.5), r3.sub(0.5));
    const dirLen = max(dir.length(), float(0.001));
    const dirNorm = dir.div(dirLen);

    // Distribución volumétrica uniforme en la esfera: r = R * u^(1/3)
    const radFactor = pow(max(r4, float(0.0001)), float(1.0 / 3.0)).mul(0.96);
    const radius = params.sphereRadius.mul(radFactor);

    p.assign(dirNorm.mul(radius));

    // Velocidad inicial orgánica
    const vDir = vec3(r5.sub(0.5), r6.sub(0.5), r7.sub(0.5));
    const vLen = max(vDir.length(), float(0.001));
    const vNorm = vDir.div(vLen);
    v.assign(vNorm.mul(params.initialSpeed).mul(r8.mul(0.8).add(0.2)));
  })().compute(count).setName('Initialize Sphere Particles');

  // ACTUALIZACIÓN DE FÍSICAS (COMPUTE SHADER) ------------------------------
  const updateParticles = Fn(() => {
    const i = instanceIndex;
    const p = positionBuffer.element(i);
    const v = velocityBuffer.element(i);

    const dt = params.dt.mul(params.timeScale);
    const toAttractor = params.attractor.sub(p);
    const distance = max(toAttractor.length(), float(0.001));
    const radialDir = toAttractor.div(distance);

    const force = vec3(0.0).toVar();

    // 1. Fuerza constante +X (Viento)
    force.addAssign(applyWind(params));

    // 2. Atracción radial hacia el cursor
    force.addAssign(applyAttraction(toAttractor, distance, params));

    // 3. Repulsión radial desde el cursor
    force.addAssign(applyRepulsion(toAttractor, distance, params));

    // 4. Vórtice alrededor del cursor
    force.addAssign(applyVortex(radialDir, params));

    // 5. Galaxia espiral
    force.addAssign(applyGalaxy(p, toAttractor, distance, radialDir, params));

    // 6. Rayos de energía hacia el cursor
    force.addAssign(applyEnergyRays(p, toAttractor, distance, radialDir, i, params));

    // 7. Fuerza de adhesión a la superficie de la esfera
    force.addAssign(applyAdhesionForce(p, params));

    // 8. Onda de choque disparada (no desactiva la fuerza activa)
    force.addAssign(applyWavePulse(p, params));

    // 9. Amortiguación (Drag)
    force.addAssign(applyDrag(v, params));

    // INTEGRACIÓN SEMI-IMPLÍCITA DE EULER -----------------------------------
    v.addAssign(force.mul(dt));

    // Límite de velocidad máxima
    const speed = v.length();
    If(speed.greaterThan(params.maxSpeed), () => {
      v.assign(v.normalize().mul(params.maxSpeed));
    });

    p.addAssign(v.mul(dt));

    // LÍMITE FÍSICO ESTRICTO DE LA ESFERA (INVISIBLE) -----------------------
    applySphereBoundary(p, v, params);
  })().compute(count).setName('Update Particles Modular');

  // MATERIAL SPRITE NODE CON COLOR DINÁMICO --------------------------------
  const material = new THREE.SpriteNodeMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true
  });

  material.positionNode = positionBuffer.toAttribute();
  material.scaleNode = params.particleSize;

  material.colorNode = computeParticleColor(
    positionBuffer.toAttribute(),
    velocityBuffer.toAttribute(),
    params
  );

  // Máscara circular suave para evitar bordes cuadrados
  material.opacityNode = step(uv().xy.sub(0.5).length(), 0.5);

  const geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  scene.add(mesh);

  function reset() {
    renderer.compute(initParticles);
  }

  function stepSimulation() {
    renderer.compute(updateParticles);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    scene.remove(mesh);
  }

  return {
    count,
    positionBuffer,
    velocityBuffer,
    reset,
    stepSimulation,
    dispose
  };
}
