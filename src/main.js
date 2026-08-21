import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import './styles.css';

import { createParameters } from './simulation/parameters.js';
import { createSimulation } from './simulation/createSimulation.js';
import { createLabPanel } from './ui/labPanel.js';

const PARTICLE_COUNT = 131072; // 2^17 partículas

async function main() {
  const mount = document.querySelector('#app');

  if (!WebGPU.isAvailable()) {
    mount.appendChild(WebGPU.getErrorMessage());
    throw new Error('Este proyecto requiere WebGPU para ejecutar compute shaders.');
  }

  // MODELO THREE.JS: Escena + Cámara + Renderizador WebGPU -----------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#040507');

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 100);
  camera.position.set(0, 0, 12);

  const renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  mount.appendChild(renderer.domElement);
  await renderer.init();

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.target.set(0, 0, 0);

  const params = createParameters();
  const simulation = createSimulation({ renderer, scene, params, count: PARTICLE_COUNT });

  // AYUDANTES VISUALES DE LABORATORIO ---------------------------------------
  const attractorHelper = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 20, 16),
    new THREE.MeshBasicMaterial({ color: '#00f7ff', wireframe: false })
  );
  scene.add(attractorHelper);

  const axes = new THREE.AxesHelper(1.8);
  scene.add(axes);

  // SEGUIMIENTO DEL CURSOR (CENTRO DINÁMICO) --------------------------------
  const pointerNdc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();

  addEventListener('pointermove', (event) => {
    pointerNdc.x = (event.clientX / innerWidth) * 2 - 1;
    pointerNdc.y = -(event.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);

    if (raycaster.ray.intersectPlane(interactionPlane, hit)) {
      // Clampear el centro de atracción dentro del radio de la esfera
      const maxDist = params.sphereRadius.value * 0.95;
      if (hit.length() > maxDist) {
        hit.normalize().multiplyScalar(maxDist);
      }
      params.attractor.value.copy(hit);
      attractorHelper.position.copy(hit);
    }
  });

  let paused = false;
  let mode = 'LAB';
  let panel;

  // FUNCIÓN INERCIA (Desactiva fuerzas externas sin reiniciar partículas) ----
  const applyInertia = () => {
    params.windEnabled.value = 0;
    params.attractEnabled.value = 0;
    params.repelEnabled.value = 0;
    params.vortexEnabled.value = 0;
    params.adhesionEnabled.value = 0;
    params.energyRaysEnabled.value = 0;
    params.galaxyEnabled.value = 0;
    params.radialEnabled.value = 0;
    panel?.refresh();
    updateHud();
  };

  const setMode = (next) => {
    mode = next;
    const lab = mode === 'LAB';
    panel.setVisible(lab);
    axes.visible = lab;
    attractorHelper.visible = lab;
    if (simulation.sphereBoundaryMesh) {
      simulation.sphereBoundaryMesh.visible = lab;
    }
    updateHud();
  };

  const hud = document.createElement('div');
  hud.className = 'hud';
  document.body.append(hud);

  const getColorName = (m) => {
    switch (Math.round(m)) {
      case 1: return '1 · Neón Cyberpunk';
      case 2: return '2 · Fuego Solar';
      case 3: return '3 · Aurora Esmeralda';
      case 4: return '4 · Nebulosa Cósmica';
      case 5: return '5 · Plasma Fantasma';
      case 6: return '6 · Arcoíris (Centro)';
      case 7: return '7 · Cambio Continuo';
      case 8: return '8 · Ondas de Color';
      case 9: return '9 · Cambio Atmosférico Lento';
      case 10: return '0 · Ritmo 130 BPM';
      default: return 'Personalizado';
    }
  };

  const getActiveForcesList = () => {
    const active = [];
    if (params.windEnabled.value > 0) active.push('Viento (+X)');
    if (params.attractEnabled.value > 0) active.push('Atracción');
    if (params.repelEnabled.value > 0) active.push('Repulsión');
    if (params.vortexEnabled.value > 0) active.push('Vórtice');
    if (params.adhesionEnabled.value > 0) active.push('Adhesión Esfera');
    if (params.energyRaysEnabled.value > 0) active.push('Rayos Energía');
    if (params.galaxyEnabled.value > 0) active.push('Galaxia');
    if (active.length === 0) active.push('Inercia pura');
    return active.join(', ');
  };

  const updateHud = () => {
    if (mode === 'LAB') {
      hud.innerHTML = `
        <strong>LABORATORIO</strong> · <strong>P</strong>: rendimiento · <strong>R</strong>: reset · <strong>Espacio</strong>: pausar<br/>
        <strong>Color</strong>: ${getColorName(params.colorMode.value)} (Teclas 1–5 degradados, 6–0 visuales)<br/>
        <strong>Fuerzas activas</strong>: ${getActiveForcesList()}<br/>
        <small style="opacity:0.8">Teclas: <strong>I</strong> Inercia · <strong>X</strong> Viento · <strong>A</strong> Atracción · <strong>D</strong> Repulsión · <strong>V</strong> Vórtice · <strong>F</strong> Adhesión · <strong>E</strong> Rayos · <strong>G</strong> Galaxia</small>
      `;
    } else {
      hud.innerHTML = `
        <strong>PERFORMANCE</strong> · <strong>P</strong>: panel · <strong>R</strong>: reset<br/>
        <strong>Color</strong>: ${getColorName(params.colorMode.value)} · <strong>Fuerzas</strong>: ${getActiveForcesList()}
      `;
    }
  };

  panel = createLabPanel({
    params,
    onReset: () => simulation.reset(),
    onColorModeChange: (m) => {
      params.colorMode.value = m;
      updateHud();
    },
    onInertia: applyInertia,
    onModeChange: () => setMode(mode === 'LAB' ? 'PERFORMANCE' : 'LAB'),
    onPauseChange: () => (paused = !paused),
    onRadiusChange: (r) => simulation.updateBoundaryHelper(r)
  });

  setMode('LAB');

  // MAPEO DE TECLADO --------------------------------------------------------
  addEventListener('keydown', (event) => {
    if (event.repeat) return;

    // Reset y Modos
    if (event.code === 'KeyR') {
      simulation.reset();
      return;
    }
    if (event.code === 'KeyP') {
      setMode(mode === 'LAB' ? 'PERFORMANCE' : 'LAB');
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      paused = !paused;
      return;
    }

    // 1–5: DEGRADADOS DE COLOR POR DISTANCIA AL CURSOR
    if (event.code === 'Digit1') params.colorMode.value = 1.0;
    if (event.code === 'Digit2') params.colorMode.value = 2.0;
    if (event.code === 'Digit3') params.colorMode.value = 3.0;
    if (event.code === 'Digit4') params.colorMode.value = 4.0;
    if (event.code === 'Digit5') params.colorMode.value = 5.0;

    // 6–0: MODOS VISUALES PROCEDIMENTALES (0 -> Modo 10 / 130 BPM)
    if (event.code === 'Digit6') params.colorMode.value = 6.0;
    if (event.code === 'Digit7') params.colorMode.value = 7.0;
    if (event.code === 'Digit8') params.colorMode.value = 8.0;
    if (event.code === 'Digit9') params.colorMode.value = 9.0;
    if (event.code === 'Digit0') params.colorMode.value = 10.0;

    // TECLAS DE FUERZAS INDEPENDIENTES (Activar/Desactivar)
    if (event.code === 'KeyI') {
      applyInertia();
      return;
    }
    if (event.code === 'KeyX') {
      params.windEnabled.value = params.windEnabled.value > 0 ? 0 : 1;
    }
    if (event.code === 'KeyA') {
      params.attractEnabled.value = params.attractEnabled.value > 0 ? 0 : 1;
      params.radialEnabled.value = params.attractEnabled.value;
    }
    if (event.code === 'KeyD') {
      params.repelEnabled.value = params.repelEnabled.value > 0 ? 0 : 1;
    }
    if (event.code === 'KeyV') {
      params.vortexEnabled.value = params.vortexEnabled.value > 0 ? 0 : 1;
    }
    if (event.code === 'KeyF') {
      params.adhesionEnabled.value = params.adhesionEnabled.value > 0 ? 0 : 1;
    }
    if (event.code === 'KeyE') {
      params.energyRaysEnabled.value = params.energyRaysEnabled.value > 0 ? 0 : 1;
    }
    if (event.code === 'KeyG') {
      params.galaxyEnabled.value = params.galaxyEnabled.value > 0 ? 0 : 1;
    }

    panel?.refresh();
    updateHud();
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Inicializar partículas en la esfera
  simulation.reset();

  // BUCLE DE ANIMACIÓN Y RENDERIZADO ----------------------------------------
  let lastTime = performance.now();

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    if (!paused) {
      // Actualizar tiempo acumulado para los shaders
      params.time.value += delta * params.timeScale.value;
      simulation.stepSimulation();
    }

    orbit.update();
    renderer.render(scene, camera);
  });
}

main().catch((error) => {
  console.error(error);
  const pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;inset:16px;white-space:pre-wrap;color:#fff;z-index:50';
  pre.textContent = String(error?.stack || error);
  document.body.append(pre);
});
