import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';

/**
 * Crea todos los uniformes (parámetros CPU -> GPU) para la simulación.
 * El radio de la esfera está claramente definido mediante `sphereRadius`.
 */
export function createParameters() {
  return {
    // Control de tiempo y simulación
    dt: uniform(1 / 60),
    time: uniform(0.0),
    timeScale: uniform(1.0),
    initialSpeed: uniform(0.35),
    maxSpeed: uniform(6.5),

    // Límite físico: radio de la esfera (invisible visualmente)
    sphereRadius: uniform(5.0),
    particleSize: uniform(0.038),

    // Centro dinámico de interacción (cursor libre)
    attractor: uniform(new THREE.Vector3(0.0, 0.0, 0.0)),
    softening: uniform(0.35),

    // 1. Fuerza constante +X (Viento)
    windEnabled: uniform(0.0),
    windStrength: uniform(2.0),
    wind: uniform(new THREE.Vector3(2.0, 0.0, 0.0)),

    // 2. Atracción radial hacia el cursor
    attractEnabled: uniform(0.0),
    attractStrength: uniform(3.8),

    // 3. Repulsión radial desde el cursor
    repelEnabled: uniform(0.0),
    repelStrength: uniform(3.8),

    // Compatibilidad radial
    radialEnabled: uniform(0.0),
    radialStrength: uniform(3.8),

    // 4. Vórtice alrededor del cursor
    vortexEnabled: uniform(0.0),
    vortexStrength: uniform(2.8),

    // 5. Adhesión a la superficie de la esfera
    adhesionEnabled: uniform(0.0),
    adhesionStrength: uniform(4.8),

    // 6. Rayos de energía / Plasma eléctrico
    energyRaysEnabled: uniform(0.0),
    rayCount: uniform(8.0),
    rayStrength: uniform(4.0),
    rayTurbulence: uniform(1.2),

    // 7. Galaxia espiral
    galaxyEnabled: uniform(0.0),
    galaxyStrength: uniform(3.2),
    galaxySpin: uniform(3.5),
    galaxyArms: uniform(3.0),

    // 8. Amortiguación (Drag)
    dragEnabled: uniform(1.0),
    dragCoefficient: uniform(0.06),

    // 9. Pulso de Onda de Choque Disparable (sin desactivar fuerzas activas)
    waveTime: uniform(-100.0),
    waveOrigin: uniform(new THREE.Vector3(0.0, 0.0, 0.0)),
    waveSpeed: uniform(7.5),
    waveStrength: uniform(3.0),
    waveWidth: uniform(0.7),

    // Modos de Color / Visuales (1-5 Degradados luminosos, 6-10 Modos procedimentales)
    colorMode: uniform(1.0)
  };
}
