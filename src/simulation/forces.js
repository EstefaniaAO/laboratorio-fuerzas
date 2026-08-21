import * as THREE from 'three/webgpu';
import {
  Fn,
  If,
  abs,
  atan,
  clamp,
  cos,
  cross,
  dot,
  float,
  fract,
  hash,
  max,
  min,
  mix,
  normalize,
  pow,
  round,
  sin,
  smoothstep,
  step,
  uint,
  vec3
} from 'three/tsl';

/**
 * 1. FUERZA CONSTANTE +X (Viento)
 * Aplica una aceleración continua a lo largo del eje X positivo.
 */
export const applyWind = Fn(([params]) => {
  const windVector = vec3(params.windStrength, float(0.0), float(0.0));
  return windVector.mul(params.windEnabled);
});

/**
 * 2. FUERZA RADIAL DE ATRACCIÓN
 * Atrae las partículas hacia el cursor (atractor) con ley del inverso del cuadrado suavizada.
 */
export const applyAttraction = Fn(([toAttractor, distance, params]) => {
  const dir = toAttractor.div(distance);
  const softenedDistSq = distance.mul(distance).add(params.softening);
  const mag = params.attractStrength.mul(3.5).div(softenedDistSq);
  return dir.mul(mag).mul(params.attractEnabled);
});

/**
 * 3. FUERZA RADIAL DE REPULSIÓN
 * Repele las partículas desde el cursor (atractor).
 */
export const applyRepulsion = Fn(([toAttractor, distance, params]) => {
  const dir = toAttractor.div(distance);
  const softenedDistSq = distance.mul(distance).add(params.softening);
  const mag = params.repelStrength.mul(3.5).div(softenedDistSq);
  return dir.mul(mag.negate()).mul(params.repelEnabled);
});

/**
 * 4. FUERZA DE VÓRTICE
 * Genera una rotación tangencial alrededor del eje Z relativo al centro del cursor.
 */
export const applyVortex = Fn(([radialDir, params]) => {
  const zAxis = vec3(0.0, 0.0, 1.0);
  const tangent = zAxis.cross(radialDir);
  return tangent.mul(params.vortexStrength).mul(params.vortexEnabled);
});

/**
 * 5. FUERZA DE GALAXIA ESPIRAL
 * Genera brazos espirales dinámicos combinando:
 * - Atracción gravitatoria hacia el cursor
 * - Aceleración tangencial orbital (spin)
 * - Modulación de onda de densidad espiral (brazos espirales orgánicos)
 * - Confinamiento suave hacia el plano galáctico
 */
export const applyGalaxy = Fn(([p, toAttractor, distance, radialDir, params]) => {
  const galaxyForce = vec3(0.0).toVar();

  // Componente de atracción central
  const softenedDist = distance.add(params.softening);
  const gravPull = radialDir.mul(params.galaxyStrength.mul(2.5)).div(softenedDist);
  galaxyForce.addAssign(gravPull);

  // Componente orbital tangencial
  const zAxis = vec3(0.0, 0.0, 1.0);
  const tangent = zAxis.cross(radialDir);
  const orbitalSpeed = params.galaxySpin.mul(2.0).div(softenedDist.sqrt().add(0.2));
  galaxyForce.addAssign(tangent.mul(orbitalSpeed));

  // Modulación de brazos espirales (densidad y compresión angular)
  const relX = p.x.sub(params.attractor.x);
  const relY = p.y.sub(params.attractor.y);
  const theta = atan(relY, relX); // ángulo polar
  const spiralArmAngle = theta.sub(distance.sqrt().mul(2.2)).sub(params.time.mul(params.galaxySpin.mul(0.4)));
  const armWave = sin(spiralArmAngle.mul(params.galaxyArms));

  // Fuerza de compresión hacia los brazos
  const armForce = tangent.mul(armWave.mul(params.galaxyStrength.mul(0.8)));
  galaxyForce.addAssign(armForce);

  // Atracción suave hacia el plano orbital (z = attractor.z)
  const zOffset = p.z.sub(params.attractor.z);
  galaxyForce.z.subAssign(zOffset.mul(params.galaxyStrength.mul(0.6)));

  return galaxyForce.mul(params.galaxyEnabled);
});

/**
 * 6. RAYOS DE ENERGÍA / PLASMA ELÉCTRICO CONVERGIENDO AL CURSOR
 * Genera filamentos eléctricos que viajan desde la periferia hacia el cursor con
 * vibraciones, oscilaciones de alta frecuencia y variaciones orgánicas.
 */
export const applyEnergyRays = Fn(([p, toAttractor, distance, radialDir, instanceIdx, params]) => {
  const rayForce = vec3(0.0).toVar();

  // Dirección hacia el cursor
  const relX = p.x.sub(params.attractor.x);
  const relY = p.y.sub(params.attractor.y);
  const theta = atan(relY, relX);

  // Ángulo de sector para agrupar en N rayos
  const numRays = max(params.rayCount, float(1.0));
  const twoPi = float(6.2831853);
  const sector = twoPi.div(numRays);

  // Variación orgánica en el ángulo del rayo en función del tiempo y la distancia
  const timeDrift = sin(distance.mul(3.0).sub(params.time.mul(4.0))).mul(0.2);
  const modAngle = fract(theta.add(timeDrift).div(sector).add(0.5)).sub(0.5).mul(sector);

  // Fuerza lateral de confinamiento hacia el filamento
  const zAxis = vec3(0.0, 0.0, 1.0);
  const tangent = zAxis.cross(radialDir);
  const lateralPull = tangent.mul(modAngle.negate()).mul(numRays).mul(params.rayStrength.mul(1.5));
  rayForce.addAssign(lateralPull);

  // Fuerza longitudinal de alta velocidad hacia el cursor
  const pull = radialDir.mul(params.rayStrength.mul(3.0)).div(distance.sqrt().add(0.2));
  rayForce.addAssign(pull);

  // Vibración y relámpago orgánico de alta frecuencia
  const pHash = hash(instanceIdx.add(uint(31)));
  const jitterFreq = distance.mul(14.0).sub(params.time.mul(28.0)).add(pHash.mul(6.28));
  const jitterWave = sin(jitterFreq).mul(cos(jitterFreq.mul(1.618)));

  const jitterDir = vec3(
    sin(pHash.mul(17.0).add(params.time.mul(10.0))),
    cos(pHash.mul(29.0).add(params.time.mul(10.0))),
    sin(pHash.mul(43.0).add(params.time.mul(10.0)))
  );

  const jitter = jitterDir.mul(jitterWave).mul(params.rayTurbulence.mul(2.5));
  rayForce.addAssign(jitter);

  return rayForce.mul(params.energyRaysEnabled);
});

/**
 * 7. FUERZA DE ADHESIÓN A LA SUPERFICIE DE LA ESFERA
 * Atrae a las partículas hacia la cáscara/superficie de la esfera (r = sphereRadius).
 */
export const applyAdhesionForce = Fn(([p, params]) => {
  const dist = max(p.length(), float(0.001));
  const normal = p.div(dist);
  // Si está dentro de la esfera, empuja hacia la superficie r = sphereRadius
  const surfaceOffset = params.sphereRadius.sub(dist);
  const adhesion = normal.mul(surfaceOffset).mul(params.adhesionStrength.mul(1.8));
  return adhesion.mul(params.adhesionEnabled);
});

/**
 * 8. AMORTIGUACIÓN (Drag)
 * Resistencia al avance proporcional a la velocidad: F = -c * v
 */
export const applyDrag = Fn(([v, params]) => {
  return v.mul(params.dragCoefficient).mul(params.dragEnabled).negate();
});

/**
 * 9. RESTRICCIÓN Y LÍMITE FÍSICO DE LA ESFERA
 * Garantiza que ninguna partícula escape del radio de la esfera:
 * - Confinamiento estricto en posición: |p| <= sphereRadius
 * - Corrección de velocidad: elimina la componente normal hacia afuera.
 * - Si la adhesión está activada, proyecta la velocidad exactamente al plano tangencial.
 */
export const applySphereBoundary = Fn(([p, v, params]) => {
  const dist = p.length();
  const radius = params.sphereRadius;

  If(dist.greaterThan(radius.mul(0.999)), () => {
    // Normal de la superficie esférica
    const normal = p.normalize();
    // Clamping de la posición en la superficie
    p.assign(normal.mul(radius));

    // Componente normal de la velocidad
    const vDotN = v.dot(normal);

    If(params.adhesionEnabled.greaterThan(0.0), () => {
      // Adhesión: anula totalmente la componente radial para que se deslice sobre la superficie
      v.subAssign(normal.mul(vDotN));
    }).Else(() => {
      // Sin adhesión: si la partícula se mueve hacia afuera, se anula la salida y rebota suavemente
      If(vDotN.greaterThan(0.0), () => {
        v.subAssign(normal.mul(vDotN.mul(1.2)));
      });
    });
  });
});
