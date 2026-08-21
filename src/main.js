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
  scene.background = new THREE.Color('#030406');

  // Encuadre ajustado para radio de esfera base = 10.0
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 120);
  camera.position.set(0, 0, 24);

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

  // AYUDANTE DEL ATRACTOR (Cursor Dinámico) ----------------------------------
  const attractorHelper = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#00f7ff', transparent: true, opacity: 0.85 })
  );
  scene.add(attractorHelper);

  // SEGUIMIENTO LIBRE DEL CURSOR -------------------------------------------
  const pointerNdc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();

  addEventListener('pointermove', (event) => {
    pointerNdc.x = (event.clientX / innerWidth) * 2 - 1;
    pointerNdc.y = -(event.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);

    if (raycaster.ray.intersectPlane(interactionPlane, hit)) {
      params.attractor.value.copy(hit);
      attractorHelper.position.copy(hit);
    }
  });

  // DISPARADOR DE ONDA DE CHOQUE -------------------------------------------
  const triggerWave = () => {
    params.waveTime.value = params.time.value;
    params.waveOrigin.value.copy(params.attractor.value);
  };

  // Disparar onda al hacer clic sobre el canvas (si no es sobre el panel o HUD)
  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.button === 0 && !event.target.closest('.panel') && !event.target.closest('.hud')) {
      triggerWave();
    }
  });

  let paused = false;
  let mode = 'LAB';
  let hudVisible = true;
  let panel;

  // CONMUTACIÓN EXCLUSIVA DE FUERZAS ---------------------------------------
  const selectForce = (forceKey, enable = true) => {
    // Al presionar una nueva fuerza se desactiva la anterior
    params.windEnabled.value = 0;
    params.attractEnabled.value = 0;
    params.repelEnabled.value = 0;
    params.vortexEnabled.value = 0;
    params.energyRaysEnabled.value = 0;
    params.galaxyEnabled.value = 0;
    params.networkEnabled.value = 0;
    params.multiOrbitEnabled.value = 0;
    params.swarmEnabled.value = 0;
    params.ribbonEnabled.value = 0;
    params.radialEnabled.value = 0;

    if (enable) {
      switch (forceKey) {
        case 'network':
          params.networkEnabled.value = 1;
          break;
        case 'orbits':
          params.multiOrbitEnabled.value = 1;
          break;
        case 'swarm':
          params.swarmEnabled.value = 1;
          break;
        case 'ribbon':
          params.ribbonEnabled.value = 1;
          break;
        case 'wind':
          params.windEnabled.value = 1;
          break;
        case 'attract':
          params.attractEnabled.value = 1;
          params.radialEnabled.value = 1;
          break;
        case 'repel':
          params.repelEnabled.value = 1;
          break;
        case 'vortex':
          params.vortexEnabled.value = 1;
          break;
        case 'rays':
          params.energyRaysEnabled.value = 1;
          break;
        case 'galaxy':
          params.galaxyEnabled.value = 1;
          break;
        case 'inertia':
          break;
      }
    }

    panel?.refresh();
    updateHud();
  };

  const toggleHud = () => {
    hudVisible = !hudVisible;
    hud.classList.toggle('hidden-hud', !hudVisible);
  };

  const setMode = (next) => {
    mode = next;
    const lab = mode === 'LAB';
    panel.setVisible(lab);
    attractorHelper.visible = lab;
    updateHud();
  };

  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.title = 'Haz clic o presiona H para ocultar/mostrar';
  hud.addEventListener('click', toggleHud);
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
      case 8: return '8 · Ondas Continuas';
      case 9: return '9 · Cambio Atmosférico Lento';
      case 10: return '0 · Ritmo 130 BPM';
      default: return 'Personalizado';
    }
  };

  const getActiveForcesList = () => {
    const active = [];
    if (params.networkEnabled.value > 0) active.push('🧬 Filamento / Red');
    if (params.multiOrbitEnabled.value > 0) active.push('🪐 Órbitas Múltiples');
    if (params.swarmEnabled.value > 0) active.push('🧲 Enjambre');
    if (params.ribbonEnabled.value > 0) active.push('🌀 Cinta');
    if (params.windEnabled.value > 0) active.push('Viento (+X)');
    if (params.attractEnabled.value > 0) active.push('Atracción');
    if (params.repelEnabled.value > 0) active.push('Repulsión');
    if (params.vortexEnabled.value > 0) active.push('Vórtice');
    if (params.energyRaysEnabled.value > 0) active.push('Rayos de Energía');
    if (params.galaxyEnabled.value > 0) active.push('Galaxia');
    if (params.adhesionEnabled.value > 0) active.push('+ Adhesión Esfera');
    if (active.length === 0) active.push('Inercia pura');
    return active.join(', ');
  };

  const updateHud = () => {
    if (mode === 'LAB') {
      hud.innerHTML = `
        <strong>LABORATORIO</strong> · <strong>P</strong>: rendimiento · <strong>H</strong>: ocultar HUD · <strong>R</strong>: reset · <strong>O / Clic</strong>: onda<br/>
        <strong>Color</strong>: ${getColorName(params.colorMode.value)} (1–5 degradados, 6–0 visuales)<br/>
        <strong>Fuerza activa</strong>: ${getActiveForcesList()}<br/>
        <small style="opacity:0.85">Teclas: <strong>N</strong> Red · <strong>M</strong> Órbitas · <strong>S</strong> Enjambre · <strong>C</strong> Cinta · <strong>A</strong> Atracción · <strong>D</strong> Repulsión · <strong>V</strong> Vórtice · <strong>E</strong> Rayos · <strong>G</strong> Galaxia · <strong>X</strong> Viento · <strong>I</strong> Inercia · <strong>F</strong> Adhesión</small>
      `;
    } else {
      hud.innerHTML = `
        <strong>PERFORMANCE</strong> · <strong>P</strong>: panel · <strong>H</strong>: ocultar HUD · <strong>R</strong>: reset · <strong>O / Clic</strong>: onda<br/>
        <strong>Color</strong>: ${getColorName(params.colorMode.value)} · <strong>Fuerza</strong>: ${getActiveForcesList()}
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
    onSelectForce: selectForce,
    onTriggerWave: triggerWave,
    onInertia: () => selectForce('inertia', true),
    onModeChange: () => setMode(mode === 'LAB' ? 'PERFORMANCE' : 'LAB'),
    onToggleHud: toggleHud,
    onPauseChange: () => (paused = !paused)
  });

  setMode('LAB');

  // MAPEO DE TECLADO --------------------------------------------------------
  addEventListener('keydown', (event) => {
    if (event.repeat) return;

    // Reset, Modo y HUD
    if (event.code === 'KeyR') {
      simulation.reset();
      return;
    }
    if (event.code === 'KeyP') {
      setMode(mode === 'LAB' ? 'PERFORMANCE' : 'LAB');
      return;
    }
    if (event.code === 'KeyH') {
      toggleHud();
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      paused = !paused;
      return;
    }
    // Disparar Onda Expansiva (Tecla O)
    if (event.code === 'KeyO') {
      triggerWave();
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

    // 🧬 🪐 🧲 🌀 NUEVAS FUERZAS CON CONMUTACIÓN EXCLUSIVA
    if (event.code === 'KeyN') selectForce('network', params.networkEnabled.value === 0);
    if (event.code === 'KeyM') selectForce('orbits', params.multiOrbitEnabled.value === 0);
    if (event.code === 'KeyS') selectForce('swarm', params.swarmEnabled.value === 0);
    if (event.code === 'KeyC') selectForce('ribbon', params.ribbonEnabled.value === 0);

    // FUERZAS EXISTENTES CON CONMUTACIÓN EXCLUSIVA
    if (event.code === 'KeyI') selectForce('inertia', true);
    if (event.code === 'KeyX') selectForce('wind', params.windEnabled.value === 0);
    if (event.code === 'KeyA') selectForce('attract', params.attractEnabled.value === 0);
    if (event.code === 'KeyD') selectForce('repel', params.repelEnabled.value === 0);
    if (event.code === 'KeyV') selectForce('vortex', params.vortexEnabled.value === 0);
    if (event.code === 'KeyE') selectForce('rays', params.energyRaysEnabled.value === 0);
    if (event.code === 'KeyG') selectForce('galaxy', params.galaxyEnabled.value === 0);

    // Adhesión a la esfera (Toggle complementario)
    if (event.code === 'KeyF') {
      params.adhesionEnabled.value = params.adhesionEnabled.value > 0 ? 0 : 1;
      panel?.refresh();
      updateHud();
      return;
    }

    panel?.refresh();
    updateHud();
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Inicializar partículas dentro de la esfera
  simulation.reset();

  // BUCLE DE ANIMACIÓN Y RENDERIZADO ----------------------------------------
  let lastTime = performance.now();

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    if (!paused) {
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
