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
    maxSpeed: uniform(6.0),

    // Límite físico: radio de la esfera
    sphereRadius: uniform(4.8),
    particleSize: uniform(0.035),

    // Centro dinámico de interacción (cursor)
    attractor: uniform(new THREE.Vector3(0.0, 0.0, 0.0)),
    softening: uniform(0.35),

    // 1. Fuerza constante +X (Viento)
    windEnabled: uniform(0.0),
    windStrength: uniform(1.8),
    wind: uniform(new THREE.Vector3(1.8, 0.0, 0.0)),

    // 2. Atracción radial hacia el cursor
    attractEnabled: uniform(0.0),
    attractStrength: uniform(3.5),

    // 3. Repulsión radial desde el cursor
    repelEnabled: uniform(0.0),
    repelStrength: uniform(3.5),

    // Compatibilidad con variables radiales anteriores
    radialEnabled: uniform(0.0),
    radialStrength: uniform(3.5),

    // 4. Vórtice alrededor del cursor
    vortexEnabled: uniform(0.0),
    vortexStrength: uniform(2.5),

    // 5. Adhesión a la superficie de la esfera
    adhesionEnabled: uniform(0.0),
    adhesionStrength: uniform(4.5),

    // 6. Rayos de energía / Plasma eléctrico
    energyRaysEnabled: uniform(0.0),
    rayCount: uniform(8.0),
    rayStrength: uniform(3.8),
    rayTurbulence: uniform(1.2),

    // 7. Galaxia espiral
    galaxyEnabled: uniform(0.0),
    galaxyStrength: uniform(3.0),
    galaxySpin: uniform(3.2),
    galaxyArms: uniform(3.0),

    // 8. Amortiguación (Drag)
    dragEnabled: uniform(1.0),
    dragCoefficient: uniform(0.08),

    // Modos de Color / Visuales (1-5 Degradados, 6-10 Modos procedimentales)
    colorMode: uniform(1.0)
  };
}
