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
 * Convierte color HSV (Hue, Saturation, Value) a RGB en TSL.
 */
export const hsv2rgb = Fn(([h, s, v]) => {
  const K = vec3(1.0, 2.0 / 3.0, 1.0 / 3.0);
  const p = abs(fract(vec3(h).add(K)).mul(6.0).sub(3.0));
  return vec3(v).mul(mix(vec3(1.0), clamp(p.sub(1.0), 0.0, 1.0), s));
});

/**
 * Calcula el color final de cada partícula según:
 * - Teclas 1 a 5: Paletas de degradado basadas en la distancia al cursor.
 * - Teclas 6 a 0: Modos visuales procedimentales (Arcoíris, Continuo, Ondas, Lento, 130 BPM).
 */
export const computeParticleColor = Fn(([p, v, params]) => {
  // Distancia euclídea al cursor (atractor dinámico)
  const toAttractor = p.sub(params.attractor);
  const distance = toAttractor.length();

  // Factor normalizado de distancia relativa al radio de la esfera [0, 1]
  const maxRadius = max(params.sphereRadius.mul(1.15), float(0.001));
  const tDist = clamp(distance.div(maxRadius), 0.0, 1.0);
  const smoothT = smoothstep(0.0, 1.0, tDist);

  const finalRgb = vec3(0.0).toVar();
  const mode = round(params.colorMode);

  // =========================================================================
  // TECLAS 1–5: PALETAS DE DEGRADADO (Cercano al cursor -> Lejano del cursor)
  // =========================================================================

  // MODO 1: NEÓN CYBERPUNK (Cian eléctrico -> Violeta intenso)
  If(mode.equal(float(1.0)), () => {
    const nearCol = color('#00f7ff'); // Cian brillante
    const farCol = color('#7928ca');  // Violeta profundo
    finalRgb.assign(mix(nearCol, farCol, smoothT));
  });

  // MODO 2: FUEGO SOLAR (Oro brillante -> Carmesí solar)
  If(mode.equal(float(2.0)), () => {
    const nearCol = color('#fff275'); // Blanco dorado
    const farCol = color('#ff2200');  // Rojo fuego
    finalRgb.assign(mix(nearCol, farCol, smoothT));
  });

  // MODO 3: AURORA ESMERALDA (Menta neón -> Azul teal medianoche)
  If(mode.equal(float(3.0)), () => {
    const nearCol = color('#00ffa2'); // Menta neón
    const farCol = color('#003854');  // Teal profundo
    finalRgb.assign(mix(nearCol, farCol, smoothT));
  });

  // MODO 4: NEBULOSA CÓSMICA (Fucsia radiante -> Índigo cósmico)
  If(mode.equal(float(4.0)), () => {
    const nearCol = color('#ff2a8d'); // Fucsia brillante
    const farCol = color('#2e0854');  // Índigo profundo
    finalRgb.assign(mix(nearCol, farCol, smoothT));
  });

  // MODO 5: PLASMA FANTASMA (Blanco hielo -> Azul cobalto eléctrico)
  If(mode.equal(float(5.0)), () => {
    const nearCol = color('#e6f7ff'); // Blanco diamante
    const farCol = color('#3a0ca3');  // Azul cobalto
    finalRgb.assign(mix(nearCol, farCol, smoothT));
  });

  // =========================================================================
  // TECLAS 6–0: MODOS VISUALES PROCEDIMENTALES
  // =========================================================================

  // MODO 6: ARCOÍRIS DESDE EL CENTRO (Ondas espectrales radiales hacia afuera)
  If(mode.equal(float(6.0)), () => {
    const rainbowHue = fract(distance.mul(0.24).sub(params.time.mul(0.55)));
    finalRgb.assign(hsv2rgb(rainbowHue, float(0.9), float(1.0)));
  });

  // MODO 7: CAMBIO CONSTANTE (Transición continua suave y cíclica)
  If(mode.equal(float(7.0)), () => {
    const shiftHue = fract(params.time.mul(0.18).add(distance.mul(0.05)));
    finalRgb.assign(hsv2rgb(shiftHue, float(0.85), float(1.0)));
  });

  // MODO 8: ONDAS DE COLOR (Pulsos y ondas de choque de energía concéntricas)
  If(mode.equal(float(8.0)), () => {
    const waveSin = sin(distance.mul(3.8).sub(params.time.mul(7.5)));
    const waveT = waveSin.mul(0.5).add(0.5);
    const crestCol = color('#00f7ff'); // Cresta luminosa
    const troughCol = color('#20003b'); // Fondo oscuro
    finalRgb.assign(mix(troughCol, crestCol, smoothstep(0.2, 0.8, waveT)));
  });

  // MODO 9: CAMBIO LENTO (Evolución atmosférica etérea durante varios segundos)
  If(mode.equal(float(9.0)), () => {
    const slowWave1 = sin(params.time.mul(0.15)).mul(0.5).add(0.5);
    const slowWave2 = cos(params.time.mul(0.09)).mul(0.5).add(0.5);
    const colA = mix(color('#ff5e7e'), color('#00f2fe'), slowWave1);
    const colB = mix(color('#7f00ff'), color('#4facfe'), slowWave2);
    finalRgb.assign(mix(colA, colB, smoothT));
  });

  // MODO 10 (TECLA 0): RITMO RÁPIDO / 130 BPM (Sincronizado a 60 / 130 segundos por beat)
  If(mode.equal(float(10.0)), () => {
    const beatPeriod = float(60.0 / 130.0); // ~0.4615 segundos por beat
    const beatFraction = fract(params.time.div(beatPeriod));
    const beatIndex = floor(params.time.div(beatPeriod));

    // Ataque percusivo en el golpe de beat con decaimiento exponencial
    const pulse = exp(beatFraction.mul(-4.0));

    // Tono base que modula armónicamente cada 4 beats
    const baseHue = fract(beatIndex.mul(0.125));
    const beatHue = fract(baseHue.add(smoothT.mul(0.25)));

    const baseColor = hsv2rgb(beatHue, float(0.92), float(0.45).add(pulse.mul(0.55)));
    const flashColor = color('#ffffff');

    finalRgb.assign(mix(baseColor, flashColor, pulse.mul(0.35)));
  });

  return vec4(finalRgb, 1.0);
});
