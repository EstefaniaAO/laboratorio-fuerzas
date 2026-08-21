# Laboratorio de Fuerzas · Sistema de Partículas Esférico

Simulación física interactiva de partículas contenida dentro de una esfera 3D, impulsada por compute shaders en **Three.js WebGPU / TSL (Three Shading Language)**.

---

## 🚀 Puesta en Funcionamiento

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

3. **Compilar para producción**:
   ```bash
   npm run build
   ```

> **Requisito**: Navegador moderno compatible con WebGPU (Chrome, Edge u homólogos).

---

## 🎮 Controles y Mapeo de Teclado

### 🎨 Paletas de Degradado (Teclas 1–5)
*Controlan el degradado de color de las partículas en función de su distancia euclídea al cursor (cerca ➔ lejos). No afectan la física.*

- **`1`**: Neón Cyberpunk *(Cian brillante ➔ Violeta profundo)*
- **`2`**: Fuego Solar *(Blanco-oro cálido ➔ Carmesí solar)*
- **`3`**: Aurora Esmeralda *(Menta neón ➔ Teal medianoche)*
- **`4`**: Nebulosa Cósmica *(Fucsia radiante ➔ Índigo cósmico)*
- **`5`**: Plasma Fantasma *(Blanco hielo diamante ➔ Azul cobalto)*

### ✨ Modos Visuales Procedimentales (Teclas 6–0)
- **`6`**: **Arcoíris desde el Centro** — Ondas espectrales concéntricas propagándose desde el cursor hacia el exterior.
- **`7`**: **Cambio Constante** — Transición cromática suave y cíclica a lo largo de todo el espectro HSV.
- **`8`**: **Ondas de Color** — Ondas de choque de energía concéntricas con crestas luminosas.
- **`9`**: **Cambio Atmosférico Lento** — Evolución tonal etérea y gradual durante varios segundos.
- **`0`**: **Ritmo Rápido (130 BPM)** — Pulsos y acordes cromáticos calculados y sincronizados exactamente a 130 BPM ($1\text{ beat} = 60 / 130\text{ s}$).

### ⚡ Fuerzas Físicas Modulares (Teclas Independientes)
- **`I`**: **Inercia** — Desactiva fuerzas direccionales externas manteniendo el movimiento natural y la contención esférica.
- **`X`**: **Fuerza Constante +X (Viento)** — Aceleración continua hacia el eje X positivo.
- **`A`**: **Atracción** — Fuerza gravitatoria radial hacia la posición 3D del cursor.
- **`D`**: **Repulsión** — Campo de repulsión radial alejando las partículas del cursor.
- **`V`**: **Vórtice** — Remolino tangencial alrededor del cursor.
- **`F`**: **Adhesión a la Esfera** — Mantiene a las partículas adheridas a la superficie de la esfera, deslizándose tangencialmente sin rebotar ni escapar.
- **`E`**: **Rayos de Energía** — Filamentos de plasma eléctrico con oscilaciones y turbulencias orgánicas convergiendo hacia el cursor.
- **`G`**: **Galaxia Espiral** — Brazos espirales con atracción gravitatoria y velocidad orbital independiente.

### ⚙️ Controles Generales
- **`R`**: **Reset** — Reinicia las posiciones y velocidades dentro de la esfera sin alterar la configuración de fuerzas o color.
- **`P`**: **Modo LAB / PERFORMANCE** — Alterna la visualización del panel de control y guías de depuración.
- **`Espacio`**: **Pausar / Continuar** — Detiene o reanuda el avance de la simulación.
- **Puntero del Ratón**: Mueve el **centro dinámico de interacción** (atractor) en el espacio tridimensional dentro del radio de la esfera.

---

## 📂 Arquitectura Modular

- [`src/simulation/forces.js`](file:///c:/Users/user/Documents/Scripting/laboratorio-fuerzas/src/simulation/forces.js): Módulos TSL independientes para cada fuerza física y la restricción de límites esféricos (`applySphereBoundary`).
- [`src/simulation/colorModes.js`](file:///c:/Users/user/Documents/Scripting/laboratorio-fuerzas/src/simulation/colorModes.js): Sombreador TSL para degradados por distancia al cursor (1–5) y modos visuales (6–0 con 130 BPM).
- [`src/simulation/parameters.js`](file:///c:/Users/user/Documents/Scripting/laboratorio-fuerzas/src/simulation/parameters.js): Uniformes de la GPU incluyendo el radio de la esfera (`sphereRadius`), parámetros de cada fuerza y modos de color.
- [`src/simulation/createSimulation.js`](file:///c:/Users/user/Documents/Scripting/laboratorio-fuerzas/src/simulation/createSimulation.js): Distribución volumétrica esférica inicial, pipeline de compute shaders y SpriteNodeMaterial.
- [`src/ui/labPanel.js`](file:///c:/Users/user/Documents/Scripting/laboratorio-fuerzas/src/ui/labPanel.js): Panel interactivo con sliders y switches para cada fuerza, radio de esfera y botones de color/modo.
- [`src/main.js`](file:///c:/Users/user/Documents/Scripting/laboratorio-fuerzas/src/main.js): Bucle de simulación con paso de tiempo real, seguimiento 3D del cursor y control por teclado.
