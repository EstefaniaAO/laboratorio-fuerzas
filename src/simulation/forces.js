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
 * Genera brazos espirales dinámicos combinando atracción, rotación orbital y compresión de densidad.
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

  // Modulación de brazos espirales
  const relX = p.x.sub(params.attractor.x);
  const relY = p.y.sub(params.attractor.y);
  const theta = atan(relY, relX);
  const spiralArmAngle = theta.sub(distance.sqrt().mul(2.2)).sub(params.time.mul(params.galaxySpin.mul(0.4)));
  const armWave = sin(spiralArmAngle.mul(params.galaxyArms));

  // Fuerza de compresión hacia los brazos
  const armForce = tangent.mul(armWave.mul(params.galaxyStrength.mul(0.8)));
  galaxyForce.addAssign(armForce);

  // Confinamiento suave hacia el plano galáctico
  const zOffset = p.z.sub(params.attractor.z);
  galaxyForce.z.subAssign(zOffset.mul(params.galaxyStrength.mul(0.6)));

  return galaxyForce.mul(params.galaxyEnabled);
});

/**
 * 6. RAYOS DE ENERGÍA / PLASMA ELÉCTRICO CONVERGIENDO AL CURSOR
 */
export const applyEnergyRays = Fn(([p, toAttractor, distance, radialDir, instanceIdx, params]) => {
  const rayForce = vec3(0.0).toVar();

  const relX = p.x.sub(params.attractor.x);
  const relY = p.y.sub(params.attractor.y);
  const theta = atan(relY, relX);

  const numRays = max(params.rayCount, float(1.0));
  const twoPi = float(6.2831853);
  const sector = twoPi.div(numRays);

  const timeDrift = sin(distance.mul(3.0).sub(params.time.mul(4.0))).mul(0.2);
  const modAngle = fract(theta.add(timeDrift).div(sector).add(0.5)).sub(0.5).mul(sector);

  const zAxis = vec3(0.0, 0.0, 1.0);
  const tangent = zAxis.cross(radialDir);
  const lateralPull = tangent.mul(modAngle.negate()).mul(numRays).mul(params.rayStrength.mul(1.5));
  rayForce.addAssign(lateralPull);

  const pull = radialDir.mul(params.rayStrength.mul(3.0)).div(distance.sqrt().add(0.2));
  rayForce.addAssign(pull);

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
 * 7. 🧬 FUERZA DE FILAMENTO / RED NEURONAL
 * Forma redes reticulares ramificadas vivas con equilibrio: atrae a distancia media
 * y repele a corta distancia para evitar el colapso puntual.
 */
export const applyNetworkFilaments = Fn(([p, toAttractor, distance, params]) => {
  const netForce = vec3(0.0).toVar();
  const scale = max(params.networkScale, float(0.2));
  const coord = p.div(scale).add(vec3(params.time.mul(0.15), params.time.mul(0.12), params.time.mul(0.18)));

  // Armónicos sinusoidales espaciales para generar nodos y ramas de la red
  const s1 = sin(coord.x.mul(1.5).add(coord.y.mul(1.0)));
  const s2 = sin(coord.y.mul(1.5).add(coord.z.mul(1.0)));
  const s3 = sin(coord.z.mul(1.5).add(coord.x.mul(1.0)));
  const c1 = cos(coord.z.mul(1.2).add(coord.x.mul(0.8)));
  const c2 = cos(coord.x.mul(1.2).add(coord.y.mul(0.8)));
  const c3 = cos(coord.y.mul(1.2).add(coord.z.mul(0.8)));

  const w1 = s1.mul(c1);
  const w2 = s2.mul(c2);
  const w3 = s3.mul(c3);

  // Distancia nodal: suma de magnitudes de las superficies nodales
  const nodeVal = abs(w1).add(abs(w2)).add(abs(w3));
  // Equilibrio push-pull: atracción a distancia media, repulsión a corta distancia
  const equilibriumDiff = nodeVal.sub(0.32);
  const gradDir = vec3(w1, w2, w3).normalize();
  const pushPull = gradDir.mul(equilibriumDiff.negate()).mul(params.networkStrength.mul(3.8));
  netForce.addAssign(pushPull);

  // Flujo orgánico continuo a lo largo de las ramas del filamento
  const tangentFlow = vec3(
    w2.mul(c3).sub(w3.mul(c2)),
    w3.mul(c1).sub(w1.mul(c3)),
    w1.mul(c2).sub(w2.mul(c1))
  ).mul(params.networkStrength.mul(1.4));
  netForce.addAssign(tangentFlow);

  // Perturbación suave si el cursor está cerca
  If(distance.lessThan(float(5.0)), () => {
    netForce.addAssign(toAttractor.normalize().mul(params.networkStrength.mul(1.5)));
  });

  return netForce.mul(params.networkEnabled);
});

/**
 * 8. 🪐 FUERZA DE ÓRBITAS MÚLTIPLES
 * Genera 5 centros orbitales móviles e interactivos dentro de la esfera con pozos gravitatorios y rotación.
 */
export const applyMultiOrbits = Fn(([p, params]) => {
  const multiForce = vec3(0.0).toVar();
  const t = params.time.mul(params.orbitSpeed);
  const r = params.sphereRadius.mul(0.55);

  // 5 Centros orbitales móviles (trayectorias armónicas 3D en la esfera)
  const c1 = vec3(sin(t.mul(1.1)), cos(t.mul(0.9)), sin(t.mul(0.7))).mul(r);
  const c2 = vec3(cos(t.mul(0.8)), sin(t.mul(1.3)), cos(t.mul(1.0))).mul(r.mul(0.9));
  const c3 = vec3(sin(t.mul(1.4).add(2.0)), cos(t.mul(0.7).add(1.0)), sin(t.mul(1.2).add(3.0))).mul(r.mul(1.05));
  const c4 = vec3(cos(t.mul(1.0).add(4.0)), sin(t.mul(1.1).add(2.5)), cos(t.mul(0.6).add(1.5))).mul(r.mul(0.85));
  const c5 = vec3(sin(t.mul(0.6).add(1.5)), cos(t.mul(1.2).add(4.5)), sin(t.mul(0.9).add(0.5))).mul(r.mul(0.95));

  // Función interna para calcular atracción + giro orbital hacia un centro
  const calcCenterForce = (centerPos) => {
    const toC = centerPos.sub(p);
    const d = max(toC.length(), float(0.4));
    const dir = toC.div(d);
    const upAxis = vec3(0.0, 1.0, 0.0);
    const tangent = upAxis.cross(dir);
    const grav = dir.mul(params.orbitStrength.mul(4.5)).div(d.mul(d).add(0.9));
    const spin = tangent.mul(params.orbitStrength.mul(3.0)).div(d.sqrt().add(0.3));
    return grav.add(spin);
  };

  multiForce.addAssign(calcCenterForce(c1));
  multiForce.addAssign(calcCenterForce(c2));
  multiForce.addAssign(calcCenterForce(c3));
  multiForce.addAssign(calcCenterForce(c4));
  multiForce.addAssign(calcCenterForce(c5));

  return multiForce.mul(params.multiOrbitEnabled);
});

/**
 * 9. 🧲 FUERZA DE ENJAMBRE (Flocking Colectivo + Evasión del Cursor)
 * Organismo colectivo auto-organizado con flujo 3D continuo y dispersión/evasión dinámica al paso del cursor.
 */
export const applySwarm = Fn(([p, v, toAttractor, distance, params]) => {
  const swarmForce = vec3(0.0).toVar();
  const t = params.time.mul(0.28);
  const pos = p.mul(0.12);

  // Campo de flujo 3D continuo (Curl-like turbulence)
  const flowX = sin(pos.y.mul(2.0).add(t)).add(cos(pos.z.mul(1.5).sub(t.mul(0.8))));
  const flowY = sin(pos.z.mul(2.0).add(t.mul(1.2))).add(cos(pos.x.mul(1.5).sub(t)));
  const flowZ = sin(pos.x.mul(2.0).add(t.mul(0.9))).add(cos(pos.y.mul(1.5).add(t.mul(1.1))));
  const targetV = vec3(flowX, flowY, flowZ).normalize().mul(params.swarmSpeed.mul(2.2));
  const alignForce = targetV.sub(v).mul(2.2);
  swarmForce.addAssign(alignForce);

  // Cohesión hacia el centroide colectivo móvil
  const centroid = vec3(sin(t.mul(0.6)), cos(t.mul(0.5)), sin(t.mul(0.7).add(1.0))).mul(params.sphereRadius.mul(0.35));
  const cohesionForce = centroid.sub(p).mul(0.35);
  swarmForce.addAssign(cohesionForce);

  // Perturbación y evasión cuando el cursor se acerca al enjambre
  If(distance.lessThan(float(5.5)), () => {
    const evadeDir = toAttractor.negate().normalize();
    const evadeMag = float(1.0).sub(distance.div(5.5)).mul(params.swarmRepel.mul(7.0));
    swarmForce.addAssign(evadeDir.mul(evadeMag));
  });

  return swarmForce.mul(params.swarmEnabled);
});

/**
 * 10. 🌀 FUERZA DE CINTA / SERPIENTE CÓSMICA
 * Confinamiento transversal y desplazamiento continuo a lo largo de una cinta paramétrica 3D que serpentea por la esfera.
 */
export const applyRibbon = Fn(([p, params]) => {
  const ribbonForce = vec3(0.0).toVar();
  const t = params.time.mul(params.ribbonSpeed.mul(0.35));
  const r = params.sphereRadius.mul(0.68);

  // Parámetro angular/espacial a lo largo de la trayectoria
  const s = atan(p.y, p.x).add(p.z.mul(0.18));

  // Eje central de la cinta 3D
  const curveX = sin(s.add(t)).mul(r);
  const curveY = cos(s.mul(1.3).sub(t.mul(0.8))).mul(r.mul(0.85));
  const curveZ = sin(s.mul(0.7).add(t.mul(0.6))).mul(r.mul(0.75));
  const curvePoint = vec3(curveX, curveY, curveZ);

  // Atracción transversal hacia la cinta
  const toCurve = curvePoint.sub(p);
  const transverseForce = toCurve.mul(params.ribbonStrength.mul(2.2));
  ribbonForce.addAssign(transverseForce);

  // Vector tangente longitudinal de desplazamiento por la cinta
  const tangentX = cos(s.add(t)).mul(r);
  const tangentY = sin(s.mul(1.3).sub(t.mul(0.8))).mul(r.mul(-1.1));
  const tangentZ = cos(s.mul(0.7).add(t.mul(0.6))).mul(r.mul(0.5));
  const tangentDir = vec3(tangentX, tangentY, tangentZ).normalize();
  const alongForce = tangentDir.mul(params.ribbonSpeed.mul(3.5));
  ribbonForce.addAssign(alongForce);

  // Ondulación sinuosa orgánica
  const undulation = sin(s.mul(4.0).sub(params.time.mul(6.0))).mul(vec3(0.0, 1.0, 0.0)).mul(params.ribbonWidth.mul(1.8));
  ribbonForce.addAssign(undulation);

  return ribbonForce.mul(params.ribbonEnabled);
});

/**
 * 11. FUERZA DE ADHESIÓN A LA SUPERFICIE DE LA ESFERA
 */
export const applyAdhesionForce = Fn(([p, params]) => {
  const dist = max(p.length(), float(0.001));
  const normal = p.div(dist);
  const surfaceOffset = params.sphereRadius.sub(dist);
  const adhesion = normal.mul(surfaceOffset).mul(params.adhesionStrength.mul(1.8));
  return adhesion.mul(params.adhesionEnabled);
});

/**
 * 12. ONDA DE CHOQUE DISPARABLE
 */
export const applyWavePulse = Fn(([p, params]) => {
  const waveAge = params.time.sub(params.waveTime);
  const waveForce = vec3(0.0).toVar();

  If(waveAge.greaterThan(0.0).and(waveAge.lessThan(2.5)), () => {
    const waveRadius = waveAge.mul(params.waveSpeed);
    const toOrigin = p.sub(params.waveOrigin);
    const distOrigin = max(toOrigin.length(), float(0.001));
    const distDiff = abs(distOrigin.sub(waveRadius));

    const waveIntensity = clamp(float(1.0).sub(distDiff.div(params.waveWidth)), float(0.0), float(1.0));
    const decay = clamp(float(1.0).sub(waveAge.div(2.5)), float(0.0), float(1.0));

    const radialDir = toOrigin.div(distOrigin);
    waveForce.assign(radialDir.mul(waveIntensity.mul(params.waveStrength.mul(decay).mul(16.0))));
  });

  return waveForce;
});

/**
 * 13. AMORTIGUACIÓN (Drag)
 */
export const applyDrag = Fn(([v, params]) => {
  return v.mul(params.dragCoefficient).mul(params.dragEnabled).negate();
});

/**
 * 14. RESTRICCIÓN Y LÍMITE FÍSICO ESTRICTO DE LA ESFERA (RADIO BASE 10)
 */
export function applySphereBoundary(p, v, params) {
  const dist = p.length();
  const radius = params.sphereRadius;

  If(dist.greaterThan(radius), () => {
    const normal = p.normalize();
    p.assign(normal.mul(radius.mul(0.998)));

    const vDotN = v.dot(normal);

    If(params.adhesionEnabled.greaterThan(0.0), () => {
      v.subAssign(normal.mul(vDotN));
    }).Else(() => {
      If(vDotN.greaterThan(0.0), () => {
        v.subAssign(normal.mul(vDotN.mul(1.6)));
      });
    });
  });
}
