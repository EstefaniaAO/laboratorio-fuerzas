function rangeRow(parent, label, object, key, min, max, step, onInput, getValue) {
  const wrap = document.createElement('div');
  wrap.className = 'row';
  const lab = document.createElement('label');
  const name = document.createElement('span');
  const value = document.createElement('span');
  value.className = 'value';
  name.textContent = label;
  lab.append(name, value);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(object[key]);
  const refresh = () => {
    object[key] = Number(input.value);
    value.textContent = Number(input.value).toFixed(step < 0.01 ? 3 : 2);
    onInput?.(object[key]);
  };
  input.addEventListener('input', refresh);
  refresh();
  wrap.append(lab, input);
  parent.append(wrap);
  return {
    input,
    refresh() {
      if (getValue) {
        const next = Number(getValue());
        object[key] = next;
        input.value = String(next);
        value.textContent = next.toFixed(step < 0.01 ? 3 : 2);
      }
    }
  };
}

function checkRow(parent, label, initial, onChange, getValue) {
  const wrap = document.createElement('div');
  wrap.className = 'row check-row';
  const lab = document.createElement('label');
  const name = document.createElement('span');
  name.textContent = label;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = initial;
  input.addEventListener('change', () => onChange(input.checked));
  lab.append(name, input);
  wrap.append(lab);
  parent.append(wrap);
  return {
    input,
    refresh() {
      if (getValue) input.checked = Boolean(getValue());
    }
  };
}

function button(parent, label, onClick, className = '') {
  const b = document.createElement('button');
  b.textContent = label;
  if (className) b.className = className;
  b.addEventListener('click', onClick);
  parent.append(b);
  return b;
}

export function createLabPanel({
  params,
  onReset,
  onColorModeChange,
  onModeChange,
  onPauseChange,
  onRadiusChange,
  onInertia
}) {
  const refreshers = [];
  const panel = document.createElement('aside');
  panel.className = 'panel';
  panel.innerHTML = `
    <h1>Laboratorio de Fuerzas</h1>
    <p>Simulación esférica interactiva. Usa el cursor para interactuar con el centro dinámico.</p>
  `;

  // 1. CONFIGURACIÓN DEL CONTENEDOR ESFÉRICO & SIMULACIÓN
  const sim = document.createElement('div');
  sim.className = 'group';
  sim.innerHTML = '<h2>Contenedor & Simulación</h2>';
  panel.append(sim);

  const state = {
    sphereRadius: params.sphereRadius.value,
    timeScale: params.timeScale.value,
    maxSpeed: params.maxSpeed.value,
    particleSize: params.particleSize.value,
    windStrength: params.windStrength.value,
    attractStrength: params.attractStrength.value,
    repelStrength: params.repelStrength.value,
    vortexStrength: params.vortexStrength.value,
    adhesionStrength: params.adhesionStrength.value,
    rayCount: params.rayCount.value,
    rayStrength: params.rayStrength.value,
    rayTurbulence: params.rayTurbulence.value,
    galaxyStrength: params.galaxyStrength.value,
    galaxySpin: params.galaxySpin.value,
    galaxyArms: params.galaxyArms.value,
    dragCoefficient: params.dragCoefficient.value
  };

  refreshers.push(
    rangeRow(
      sim,
      'Radio de la Esfera',
      state,
      'sphereRadius',
      2.0,
      10.0,
      0.1,
      (v) => {
        params.sphereRadius.value = v;
        onRadiusChange?.(v);
      },
      () => params.sphereRadius.value
    )
  );

  refreshers.push(
    rangeRow(sim, 'Velocidad Máxima', state, 'maxSpeed', 0.5, 15.0, 0.1, (v) => (params.maxSpeed.value = v), () => params.maxSpeed.value)
  );
  refreshers.push(
    rangeRow(sim, 'Escala de Tiempo', state, 'timeScale', 0.0, 2.0, 0.05, (v) => (params.timeScale.value = v), () => params.timeScale.value)
  );
  refreshers.push(
    rangeRow(sim, 'Tamaño de Partículas', state, 'particleSize', 0.01, 0.1, 0.002, (v) => (params.particleSize.value = v), () => params.particleSize.value)
  );

  // 2. FUERZAS FÍSICAS INDIVIDUALES
  const forcesGroup = document.createElement('div');
  forcesGroup.className = 'group';
  forcesGroup.innerHTML = '<h2>Fuerzas Físicas (Mapeo Teclado)</h2>';
  panel.append(forcesGroup);

  // Inercia
  button(forcesGroup, 'I · Inercia (Desactivar fuerzas externas)', () => onInertia?.(), 'btn-subtle');

  // Viento +X
  refreshers.push(
    checkRow(
      forcesGroup,
      'X · Fuerza Constante +X (Viento)',
      params.windEnabled.value > 0,
      (v) => (params.windEnabled.value = v ? 1 : 0),
      () => params.windEnabled.value > 0
    )
  );
  refreshers.push(
    rangeRow(forcesGroup, 'Intensidad Viento', state, 'windStrength', 0.2, 8.0, 0.1, (v) => (params.windStrength.value = v), () => params.windStrength.value)
  );

  // Atracción
  refreshers.push(
    checkRow(
      forcesGroup,
      'A · Atracción hacia el Cursor',
      params.attractEnabled.value > 0,
      (v) => (params.attractEnabled.value = v ? 1 : 0),
      () => params.attractEnabled.value > 0
    )
  );
  refreshers.push(
    rangeRow(forcesGroup, 'Intensidad Atracción', state, 'attractStrength', 0.5, 10.0, 0.1, (v) => (params.attractStrength.value = v), () => params.attractStrength.value)
  );

  // Repulsión
  refreshers.push(
    checkRow(
      forcesGroup,
      'D · Repulsión desde el Cursor',
      params.repelEnabled.value > 0,
      (v) => (params.repelEnabled.value = v ? 1 : 0),
      () => params.repelEnabled.value > 0
    )
  );
  refreshers.push(
    rangeRow(forcesGroup, 'Intensidad Repulsión', state, 'repelStrength', 0.5, 10.0, 0.1, (v) => (params.repelStrength.value = v), () => params.repelStrength.value)
  );

  // Vórtice
  refreshers.push(
    checkRow(
      forcesGroup,
      'V · Vórtice alrededor del Cursor',
      params.vortexEnabled.value > 0,
      (v) => (params.vortexEnabled.value = v ? 1 : 0),
      () => params.vortexEnabled.value > 0
    )
  );
  refreshers.push(
    rangeRow(forcesGroup, 'Giro Vórtice', state, 'vortexStrength', -8.0, 8.0, 0.1, (v) => (params.vortexStrength.value = v), () => params.vortexStrength.value)
  );

  // Adhesión a la Esfera
  refreshers.push(
    checkRow(
      forcesGroup,
      'F · Adhesión a la Superficie Esférica',
      params.adhesionEnabled.value > 0,
      (v) => (params.adhesionEnabled.value = v ? 1 : 0),
      () => params.adhesionEnabled.value > 0
    )
  );
  refreshers.push(
    rangeRow(forcesGroup, 'Intensidad Adhesión', state, 'adhesionStrength', 0.5, 10.0, 0.1, (v) => (params.adhesionStrength.value = v), () => params.adhesionStrength.value)
  );

  // Rayos de Energía
  refreshers.push(
    checkRow(
      forcesGroup,
      'E · Rayos de Energía (Plasma hacia Cursor)',
      params.energyRaysEnabled.value > 0,
      (v) => (params.energyRaysEnabled.value = v ? 1 : 0),
      () => params.energyRaysEnabled.value > 0
    )
  );
  refreshers.push(
    rangeRow(forcesGroup, 'Fuerza Rayos', state, 'rayStrength', 0.5, 10.0, 0.1, (v) => (params.rayStrength.value = v), () => params.rayStrength.value)
  );
  refreshers.push(
    rangeRow(forcesGroup, 'Cantidad Rayos', state, 'rayCount', 2.0, 16.0, 1.0, (v) => (params.rayCount.value = v), () => params.rayCount.value)
  );
  refreshers.push(
    rangeRow(forcesGroup, 'Turbulencia / Relámpago', state, 'rayTurbulence', 0.0, 4.0, 0.1, (v) => (params.rayTurbulence.value = v), () => params.rayTurbulence.value)
  );

  // Galaxia Espiral
  refreshers.push(
    checkRow(
      forcesGroup,
      'G · Galaxia Espiral',
      params.galaxyEnabled.value > 0,
      (v) => (params.galaxyEnabled.value = v ? 1 : 0),
      () => params.galaxyEnabled.value > 0
    )
  );
  refreshers.push(
    rangeRow(forcesGroup, 'Atracción Galaxia', state, 'galaxyStrength', 0.5, 8.0, 0.1, (v) => (params.galaxyStrength.value = v), () => params.galaxyStrength.value)
  );
  refreshers.push(
    rangeRow(forcesGroup, 'Velocidad de Giro Galaxia', state, 'galaxySpin', 0.5, 8.0, 0.1, (v) => (params.galaxySpin.value = v), () => params.galaxySpin.value)
  );
  refreshers.push(
    rangeRow(forcesGroup, 'Brazos Espirales', state, 'galaxyArms', 1.0, 6.0, 1.0, (v) => (params.galaxyArms.value = v), () => params.galaxyArms.value)
  );

  // Drag / Amortiguación
  refreshers.push(
    checkRow(
      forcesGroup,
      'Amortiguación (Drag)',
      params.dragEnabled.value > 0,
      (v) => (params.dragEnabled.value = v ? 1 : 0),
      () => params.dragEnabled.value > 0
    )
  );
  refreshers.push(
    rangeRow(forcesGroup, 'Coeficiente Drag', state, 'dragCoefficient', 0.0, 0.5, 0.01, (v) => (params.dragCoefficient.value = v), () => params.dragCoefficient.value)
  );

  // 3. TECLAS 1–5: DEGRADADOS DE COLOR POR DISTANCIA AL CURSOR
  const colorGroup = document.createElement('div');
  colorGroup.className = 'group';
  colorGroup.innerHTML = '<h2>Degradados de Color (Teclas 1–5)</h2><p>Color interpolado según distancia al cursor.</p>';
  panel.append(colorGroup);

  const gradientButtons = [
    { mode: 1, label: '1 · Neón Cyberpunk (Cian ➔ Violeta)' },
    { mode: 2, label: '2 · Fuego Solar (Oro ➔ Carmesí)' },
    { mode: 3, label: '3 · Aurora Esmeralda (Menta ➔ Teal)' },
    { mode: 4, label: '4 · Nebulosa Cósmica (Fucsia ➔ Índigo)' },
    { mode: 5, label: '5 · Plasma Fantasma (Blanco ➔ Cobalto)' }
  ];

  gradientButtons.forEach(({ mode, label }) => {
    button(colorGroup, label, () => onColorModeChange?.(mode), 'btn-palette');
  });

  // 4. TECLAS 6–0: MODOS VISUALES DINÁMICOS
  const visualGroup = document.createElement('div');
  visualGroup.className = 'group';
  visualGroup.innerHTML = '<h2>Modos Visuales (Teclas 6–0)</h2><p>Efectos de animación y sincronía de tempo.</p>';
  panel.append(visualGroup);

  const visualButtons = [
    { mode: 6, label: '6 · Arcoíris desde el Centro' },
    { mode: 7, label: '7 · Cambio Constante Suave' },
    { mode: 8, label: '8 · Ondas de Color Concéntricas' },
    { mode: 9, label: '9 · Cambio Atmosférico Lento' },
    { mode: 10, label: '0 · Ritmo Rápido / 130 BPM' }
  ];

  visualButtons.forEach(({ mode, label }) => {
    button(visualGroup, label, () => onColorModeChange?.(mode), 'btn-mode');
  });

  // 5. ACCIONES PRINCIPALES
  const actions = document.createElement('div');
  actions.className = 'group';
  actions.innerHTML = '<h2>Acciones</h2>';
  panel.append(actions);
  button(actions, 'Reset Simulación (R)', onReset, 'btn-primary');
  button(actions, 'Pausar / Continuar (Espacio)', () => onPauseChange());
  button(actions, 'LAB / PERFORMANCE (P)', () => onModeChange());

  document.body.append(panel);

  return {
    element: panel,
    setVisible(visible) {
      panel.classList.toggle('hidden', !visible);
    },
    refresh() {
      for (const item of refreshers) item.refresh();
    }
  };
}
