# Laboratorio de Fuerzas · Sistema de Partículas Esférico

Simulación física interactiva de 131,072 partículas contenida dentro de una esfera 3D (radio base = 10.0), impulsada por compute shaders en **Three.js WebGPU / TSL (Three Shading Language)**.

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

---

## 🎮 Controles y Mapeo de Teclado

### 🧬 Nuevas Fuerzas Físicas
- **`N`**: **🧬 Filamento / Red Neuronal** — Estructura reticular viva con equilibrio de atracción a distancia media y repulsión a corta distancia para evitar el colapso puntual.
- **`M`**: **🪐 Órbitas Múltiples** — 5 centros orbitales móviles con pozos gravitatorios y rotación 3D continua dentro de la esfera.
- **`S`**: **🧲 Enjambre (Flocking Colectivo)** — Organismo auto-organizado con flujo 3D continuo, cohesión y evasión fluida al paso del cursor.
- **`C`**: **🌀 Cinta / Serpiente Cósmica** — Confinamiento transversal y desplazamiento continuo a lo largo de una cinta paramétrica ondulante.

### ⚡ Fuerzas Físicas Clásicas
- **`I`**: **Inercia** — Desactiva fuerzas externas manteniendo el movimiento existente y la contención esférica.
- **`X`**: **Fuerza Constante +X (Viento)** — Aceleración continua hacia +X.
- **`A`**: **Atracción** — Fuerza gravitatoria radial hacia el cursor.
- **`D`**: **Repulsión** — Campo de repulsión radial alejando las partículas del cursor.
- **`V`**: **Vórtice** — Remolino tangencial alrededor del cursor.
- **`E`**: **Rayos de Energía** — Filamentos de plasma eléctrico convergiendo hacia el cursor.
- **`G`**: **Galaxia Espiral** — Brazos espirales rotatorios con atracción gravitatoria.
- **`F`**: **Adhesión a la Esfera** — Mantiene a las partículas adheridas a la superficie esférica deslizando tangencialmente.

### 🌊 Disparador de Onda Expansiva
- **`O` / Clic**: Dispara una onda de energía expansiva a través de las partículas sin desactivar la fuerza física activa.

### 🎨 Paletas de Degradado Luminosas (Teclas 1–5)
- **`1`**: Neón Cyberpunk *(Cian brillante ➔ Violeta luminoso)*
- **`2`**: Fuego Solar *(Blanco-oro cálido ➔ Coral solar)*
- **`3`**: Aurora Esmeralda *(Menta neón ➔ Azul celeste radiante)*
- **`4`**: Nebulosa Cósmica *(Fucsia neón ➔ Lila cósmico)*
- **`5`**: Plasma Fantasma *(Blanco diamante ➔ Celeste zafiro)*

### ✨ Modos Visuales Procedimentales (Teclas 6–0)
- **`6`**: Arcoíris desde el Centro
- **`7`**: Cambio Constante Suave
- **`8`**: Ondas Continuas de Color
- **`9`**: Cambio Atmosférico Lento
- **`0`**: Ritmo Rápido a **130 BPM** ($1\text{ beat} = 60/130\text{ s}$)

### ⚙️ Controles Generales
- **`H` / Clic en HUD**: Oculta o muestra el panel informativo inferior derecho.
- **`P`**: Alterna entre modo **LAB** y **PERFORMANCE**.
- **`R`**: Reset de partículas dentro de la esfera.
- **`Espacio`**: Pausar / Continuar.
