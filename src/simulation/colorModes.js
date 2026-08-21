import * as THREE from 'three/webgpu';
import {
  Fn,
  If,
  abs,
  clamp,
  color,
  cos,
  exp,
  float,
  floor,
  fract,
  max,
  mix,
  round,
  sin,
  smoothstep,
  vec3,
  vec4
} from 'three/tsl';

/**
 * Convierte color HSV (Hue, Saturation, Value) a RGB en TSL con alta luminosidad.
 */
export const hsv2rgb = Fn(([h, s, v]) => {
  const K = vec3(1.0, 2.0 / 3.0, 1.0 / 3.0);
  const p = abs(fract(vec3(h).add(K)).mul(6.0).sub(3.0));
  return vec3(v).mul(mix(vec3(1.0), clamp(p.sub(1.0), 0.0, 1.0), s));
});

/**
 * Calcula el color final de cada partícula:
 * - Degradados luminosos (1-5) según distancia al cursor
 * - Modos visuales procedimentales (6-0)
 * - Resalte de onda de choque disparada (sin desactivar el modo actual)
 */
export const computeParticleColor = Fn(([p, v, params]) => {
  // Distancia euclídea al cursor (atractor dinámico)
  const toAttractor = p.sub(params.attractor);
  const distance = toAttractor.length();

  // Factor normalizado de distancia relativa al radio de la esfera [0, 1]
  const maxRadius = max(params.sphereRadius.mul(1.1), float(0.001));
  const tDist = clamp(distance.div(maxRadius), 0.0, 1.0);
  const smoothT = smoothstep(0.0, 1.0, tDist);

  const finalRgb = vec3(0.0).toVar();
  const mode = round(params.colorMode);

  // =========================================================================
  // TECLAS 1–5: PALETAS DE DEGRADADO LUMINOSAS Y VIBRANTES
  // =========================================================================

  // MODO 1: NEÓN CYBERPUNK (Cian eléctrico ➔ Violeta neón luminoso)
  If(mode.equal(float(1.0)), () => {
    const nearCol = color('#00f7ff'); // Cian brillante
    const farCol = color('#b845ff');  // Violeta luminoso
    finalRgb.assign(mix(nearCol, farCol, smoothT));
  });

  // MODO 2: FUEGO SOLAR (Blanco dorado ➔ Naranja/Coral solar vivo)
  If(mode.equal(float(2.0)), () => {
    const nearCol = color('#fff566'); // Oro claro
    const farCol = color('#ff5722');  // Naranja coral cálido
    finalRgb.assign(mix(nearCol, farCol, smoothT));
  });

  // MODO 3: AURORA ESMERALDA (Menta neón ➔ Azul celeste/turquesa)
  If(mode.equal(float(3.0)), () => {
    const nearCol = color('#00ffa3'); // Menta neón
    const farCol = color('#00b4d8');  // Azul celeste radiante
    finalRgb.assign(mix(nearCol, farCol, smoothT));
  });

  // MODO 4: NEBULOSA CÓSMICA (Rosa fucsia radiante ➔ Lila cósmico luminoso)
  If(mode.equal(float(4.0)), () => {
    const nearCol = color('#ff3b94'); // Fucsia neón
    const farCol = color('#9b5de5');  // Lila cósmico vivo
    finalRgb.assign(mix(nearCol, farCol, smoothT));
  });

  // MODO 5: PLASMA FANTASMA (Blanco diamante ➔ Celeste zafiro luminoso)
  If(mode.equal(float(5.0)), () => {
    const nearCol = color('#ffffff'); // Blanco diamante
    const farCol = color('#48cae4');  // Celeste zafiro
    finalRgb.assign(mix(nearCol, farCol, smoothT));
  });

  // =========================================================================
  // TECLAS 6–0: MODOS VISUALES PROCEDIMENTALES
  // =========================================================================

  // MODO 6: ARCOÍRIS DESDE EL CENTRO (Ondas espectrales radiales hacia afuera)
  If(mode.equal(float(6.0)), () => {
    const rainbowHue = fract(distance.mul(0.24).sub(params.time.mul(0.55)));
    finalRgb.assign(hsv2rgb(rainbowHue, float(0.85), float(1.0)));
  });

  // MODO 7: CAMBIO CONSTANTE (Transición continua suave, rica y luminosa)
  If(mode.equal(float(7.0)), () => {
    const shiftHue = fract(params.time.mul(0.18).add(distance.mul(0.05)));
    finalRgb.assign(hsv2rgb(shiftHue, float(0.80), float(1.0)));
  });

  // MODO 8: ONDAS CONTINUAS DE COLOR (Pulsos concéntricos luminosos)
  If(mode.equal(float(8.0)), () => {
    const waveSin = sin(distance.mul(3.6).sub(params.time.mul(7.0)));
    const waveT = waveSin.mul(0.5).add(0.5);
    const crestCol = color('#00f7ff'); // Cresta cian ultra brillante
    const troughCol = color('#7b2cbf'); // Fondo púrpura luminoso y visible
    finalRgb.assign(mix(troughCol, crestCol, smoothstep(0.2, 0.8, waveT)));
  });

  // MODO 9: CAMBIO LENTO (Evolución atmosférica pastel etérea)
  If(mode.equal(float(9.0)), () => {
    const slowWave1 = sin(params.time.mul(0.15)).mul(0.5).add(0.5);
    const slowWave2 = cos(params.time.mul(0.09)).mul(0.5).add(0.5);
    const colA = mix(color('#ff758c'), color('#70e1ff'), slowWave1);
    const colB = mix(color('#b388ff'), color('#64ffda'), slowWave2);
    finalRgb.assign(mix(colA, colB, smoothT));
  });

  // MODO 10 (TECLA 0): RITMO RÁPIDO / 130 BPM (Sincronizado musicalmente a 60 / 130 s)
  If(mode.equal(float(10.0)), () => {
    const beatPeriod = float(60.0 / 130.0); // ~0.4615 segundos por beat
    const beatFraction = fract(params.time.div(beatPeriod));
    const beatIndex = floor(params.time.div(beatPeriod));

    // Ataque percusivo en el golpe de beat
    const pulse = exp(beatFraction.mul(-3.5));

    const baseHue = fract(beatIndex.mul(0.125));
    const beatHue = fract(baseHue.add(smoothT.mul(0.25)));

    const baseColor = hsv2rgb(beatHue, float(0.85), float(0.65).add(pulse.mul(0.35)));
    const flashColor = color('#ffffff');

    finalRgb.assign(mix(baseColor, flashColor, pulse.mul(0.45)));
  });

  // =========================================================================
  // RESALTE DE ONDA DE CHOQUE DISPARADA (Pasa a través de las partículas)
  // =========================================================================
  const waveAge = params.time.sub(params.waveTime);
  If(waveAge.greaterThan(0.0).and(waveAge.lessThan(2.5)), () => {
    const waveRadius = waveAge.mul(params.waveSpeed);
    const toOrigin = p.sub(params.waveOrigin);
    const distOrigin = toOrigin.length();
    const distDiff = abs(distOrigin.sub(waveRadius));

    const flashIntensity = clamp(float(1.0).sub(distDiff.div(params.waveWidth)), float(0.0), float(1.0));
    const decay = clamp(float(1.0).sub(waveAge.div(2.5)), float(0.0), float(1.0));
    const finalFlash = flashIntensity.mul(decay).mul(0.85);

    // Ilumina intensamente las partículas alcanzadas por la onda
    const waveFlashCol = color('#ffffff');
    finalRgb.assign(mix(finalRgb, waveFlashCol, finalFlash));
  });

  return vec4(finalRgb, 1.0);
});
