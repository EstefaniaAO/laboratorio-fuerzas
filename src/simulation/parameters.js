import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';

/**
 * Crea todos los uniformes (parámetros CPU -> GPU) para la simulación.
 * El radio de la esfera está claramente definido mediante `sphereRadius` con valor base 10.0.
 */
export function createParameters() {
  return {
    // Control de tiempo y simulación
    dt: uniform(1 / 60),
    time: uniform(0.0),
    timeScale: uniform(1.0),
    initialSpeed: uniform(0.4),
    maxSpeed: uniform(8.0),

    // Límite físico: radio base de la esfera = 10.0 (invisible)
    sphereRadius: uniform(10.0),
    particleSize: uniform(0.038),

    // Centro dinámico de interacción (cursor libre)
    attractor: uniform(new THREE.Vector3(0.0, 0.0, 0.0)),
    softening: uniform(0.45),

    // 1. Fuerza constante +X (Viento)
    windEnabled: uniform(0.0),
    windStrength: uniform(2.2),
    wind: uniform(new THREE.Vector3(2.2, 0.0, 0.0)),

    // 2. Atracción radial hacia el cursor
    attractEnabled: uniform(0.0),
    attractStrength: uniform(4.2),

    // 3. Repulsión radial desde el cursor
    repelEnabled: uniform(0.0),
    repelStrength: uniform(4.2),

    // Compatibilidad radial
    radialEnabled: uniform(0.0),
    radialStrength: uniform(4.2),

    // 4. Vórtice alrededor del cursor
    vortexEnabled: uniform(0.0),
    vortexStrength: uniform(3.2),

    // 5. Adhesión a la superficie de la esfera
    adhesionEnabled: uniform(0.0),
    adhesionStrength: uniform(5.5),

    // 6. Rayos de energía / Plasma eléctrico
    energyRaysEnabled: uniform(0.0),
    rayCount: uniform(8.0),
    rayStrength: uniform(4.2),
    rayTurbulence: uniform(1.3),

    // 7. Galaxia espiral
    galaxyEnabled: uniform(0.0),
    galaxyStrength: uniform(3.5),
    galaxySpin: uniform(3.8),
    galaxyArms: uniform(3.0),

    // 8. 🧬 NUEVA: Fuerza de Filamento / Red Neuronal
    networkEnabled: uniform(0.0),
    networkStrength: uniform(3.8),
    networkScale: uniform(2.2),

    // 9. 🪐 NUEVA: Fuerza de Órbitas Múltiples
    multiOrbitEnabled: uniform(0.0),
    orbitStrength: uniform(4.0),
    orbitSpeed: uniform(1.2),

    // 10. 🧲 NUEVA: Fuerza de Enjambre (Flocking + Perturbación de Cursor)
    swarmEnabled: uniform(0.0),
    swarmSpeed: uniform(3.2),
    swarmRepel: uniform(5.0),

    // 11. 🌀 NUEVA: Fuerza de Cinta / Serpiente Cósmica
    ribbonEnabled: uniform(0.0),
    ribbonSpeed: uniform(3.5),
    ribbonStrength: uniform(4.5),
    ribbonWidth: uniform(1.6),

    // 12. Amortiguación (Drag)
    dragEnabled: uniform(1.0),
    dragCoefficient: uniform(0.06),

    // 13. Pulso de Onda de Choque Disparable
    waveTime: uniform(-100.0),
    waveOrigin: uniform(new THREE.Vector3(0.0, 0.0, 0.0)),
    waveSpeed: uniform(12.0),
    waveStrength: uniform(4.0),
    waveWidth: uniform(1.2),

    // Modos de Color / Visuales (1-5 Degradados luminosos, 6-10 Modos procedimentales)
    colorMode: uniform(1.0)
  };
}
