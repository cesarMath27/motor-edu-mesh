# motor-edu-mesh — Motor de videojuegos educativos

**motor-edu-mesh** es un motor pequeño y sin dependencias para **crear y jugar
videojuegos educativos** que corren en el navegador del celular, **100%
offline**. Está pensado como el complemento natural de
[**edu-mesh**](https://github.com/cesarMath27/edu-mesh): un juego se describe como
**datos** (`.game.json`) que se pueden **firmar y repartir** por la malla P2P del
salón, igual que cualquier otro contenido.

```
   PROGRAMADOR/MAESTRO                 MOTOR                         edu-mesh (P2P)
  ┌────────────────────┐      ┌──────────────────────┐      ┌────────────────────────┐
  │ SDK (código JS)    │ ───▶ │  define un juego      │      │ firma el .game.json     │
  │   …o…              │      │  como DATOS o con el  │ ───▶ │ y lo reparte por la     │
  │ .game.json (datos) │ ───▶ │  SDK; lo REPRODUCE     │      │ WiFi local; cada celular│
  └────────────────────┘      └──────────────────────┘      │ lo juega sin internet   │
                                                             └────────────────────────┘
```

- **Cero dependencias.** JS puro y módulos ES. Corre en el navegador y en Node ≥ 18 (para pruebas). Sin paso de compilación.
- **Dos formas de crear juegos:**
  - **SDK (programadores):** API imperativa — `new Game()`, escenas, entidades, eventos, `win()`/`lose()`.
  - **Datos (`.game.json`):** una definición declarativa para los tipos integrados; un maestro puede afinarla sin programar.
- **Juegos como contenido firmable.** Un `.game.json` es solo texto: encaja en el modelo de contenido **curado y firmado (Ed25519)** de edu-mesh y viaja por su distribución P2P.
- **Reproducible.** El azar usa una **semilla**: el mismo juego sale igual en todos los dispositivos.
- **Accesible y para celular.** Objetivos táctiles grandes, teclado, modo claro/oscuro y **sonido sintetizado** (Web Audio, sin archivos).

---

## Empezar (demo)

```bash
git clone https://github.com/cesarMath27/motor-edu-mesh.git
cd motor-edu-mesh
npm run demo          # inicia un servidor local (sin dependencias) e imprime la URL
```

Abre la URL que imprime (por defecto `http://localhost:8090`) y prueba los juegos
de ejemplo. También puedes **ver/editar el JSON** de cada juego y volver a jugar
en el momento.

> ¿Por qué un servidor y no abrir `index.html` directo? Los módulos ES y el
> `fetch` de los `.game.json` necesitan `http://` (el navegador bloquea `file://`).

Pruebas de la lógica del motor (deterministas, sin navegador):

```bash
npm test              # node --test  (26 pruebas, 0 dependencias)
```

---

## Tipos de juego integrados

Cada tipo se describe con un `.game.json`. Hay ejemplos completos en
[`examples/`](examples/).

| Tipo | Qué es | Ejemplo |
|------|--------|---------|
| `memory` | **Memoria / parejas** (palabra ↔ definición, país ↔ capital…) | [capitales-memoria.game.json](examples/capitales-memoria.game.json) |
| `math` | **Matemáticas** con teclado en pantalla y contrarreloj (sumas, restas, ×, ÷, tablas) | [tablas-matematicas.game.json](examples/tablas-matematicas.game.json) |
| `fill` | **Completar** frases con huecos `{así}` y banco de palabras | [fotosintesis-completar.game.json](examples/fotosintesis-completar.game.json) |
| `wordsearch` | **Sopa de letras** con selección por arrastre (8 direcciones) | [animales-sopa.game.json](examples/animales-sopa.game.json) |

### Forma de un `.game.json`

```jsonc
{
  "format": "edumesh-game",   // marca de formato
  "version": 1,
  "type": "memory",           // qué tipo de juego (uno de los de arriba)
  "title": "Capitales de México",
  "locale": "es-MX",
  "seed": 4242,               // semilla → tablero reproducible (opcional)
  "config": { /* ...específico del tipo... */ },
  "meta": { "subject": "Geografía", "grade": "Primaria", "author": "..." }
}
```

#### `memory` — config
```jsonc
{
  "pairs": [ { "a": "Jalisco", "b": "Guadalajara" } ],
  "columns": 4,        // opcional; si no, se calcula
  "maxPairs": 8,       // opcional: baraja y recorta a N pares
  "timeLimit": 0       // opcional: segundos (0 = sin límite)
}
```
> Si un par no trae `b`, se usa `a` para las dos cartas (memoria clásica).

#### `math` — config
```jsonc
{
  "ops": ["+","-","×","÷"],   // operaciones a mezclar (se ignora si hay "tables")
  "tables": [6,7,8],          // opcional: practica estas tablas (multiplicación)
  "min": 1, "max": 12,        // rango de los operandos
  "count": 10,                // cuántos problemas
  "timeLimit": 90,            // segundos totales (0 = sin límite)
  "allowNegative": false,     // permite restas con resultado negativo
  "parSeconds": 6             // tiempo "ideal" por problema (afecta el bono de rapidez)
}
```
> Las divisiones se generan **siempre exactas**; las restas, **sin negativos** salvo que lo pidas.

#### `fill` — config
```jsonc
{
  "items": [
    { "text": "La fotosíntesis ocurre en el {cloroplasto} de la célula.",
      "bank": ["cloroplasto","mitocondria","núcleo"] },
    { "text": "El agua se compone de {hidrógeno} y {oxígeno}." }
  ],
  "caseSensitive": false,    // por defecto ignora mayúsculas
  "accentSensitive": false,  // por defecto ignora acentos
  "shuffle": true
}
```

#### `wordsearch` — config
```jsonc
{
  "words": ["PERRO","GATO","AGUILA","BALLENA","ABEJA"],
  "size": 12,
  "allowReverse": true,
  "allowDiagonal": true,
  "timeLimit": 0
}
```

### Reproducir un juego desde datos

```html
<link rel="stylesheet" href="./src/styles.css">
<div id="app"></div>
<script type="module">
  import { loadGame } from './src/engine/index.js';
  import './src/games/index.js';                 // registra memory/math/fill/wordsearch

  const def = await fetch('./examples/animales-sopa.game.json').then(r => r.json());
  loadGame(def, { mount: '#app' }).start();
</script>
```

---

## El SDK (para programadores)

¿Quieres un juego que **no** es ninguno de los tipos de arriba? Constrúyelo con la
API. Ejemplo real y comentado en
[`examples/sumas-sdk.game.js`](examples/sumas-sdk.game.js).

```js
import { Game, el, onTap } from './src/engine/index.js';

const g = new Game({ title: 'Lluvia de sumas', mount: '#app' });

g.scene('play', (s) => {
  let round = 0;
  const card = el('div', { class: 'em-math' });
  s.root.append(card);

  (function next() {
    if (++round > 8) return g.win({ message: '¡Sumas dominadas!' });
    const a = g.rng.int(1, 9), b = g.rng.int(1, 9), answer = a + b;
    const choices = g.rng.shuffle([answer, answer + 1, answer - 1, answer + 2]);
    card.replaceChildren(el('div', { class: 'em-math-problem', text: `${a} + ${b} = ?` }));
    for (const c of choices) {
      const btn = el('button', { class: 'em-key' }, String(c));
      onTap(btn, () => { g.score.answer(c === answer, { speed: 1 }); next(); });
      card.append(btn);
    }
  })();
});

g.start();
```

### API principal

| Símbolo | Para qué |
|---------|----------|
| `new Game({ title, mount, seed, sound, hud, locale })` | El juego. Maneja HUD (título/puntos/tiempo/silencio), escenas y fin de partida. |
| `game.scene(name, setup)` | Declara una escena; `setup(scene)` la construye al entrar. |
| `game.start(name?)` · `goTo(name)` · `next()` | Arranca / cambia de escena / avanza a la siguiente. |
| `game.win(payload?)` · `lose(payload?)` | Termina la partida (muestra la pantalla final con "jugar de nuevo"). |
| `game.on('win'\|'lose'\|'end'\|'scene'\|'start', cb)` | Eventos. `end` recibe los **resultados** (ver abajo). |
| `game.rng` | Azar con semilla: `int`, `float`, `pick`, `shuffle`, `bool`. |
| `game.audio` | `play(nombre)`, `toggle()`. Efectos sintetizados, no-op en Node. |
| `game.score` | Puntuación (ver abajo). |
| `scene.root` | El nodo DOM de la escena (cuélgale tu UI). |
| `scene.add(entity)` · `spawn(Type, props)` | Entidades (`class … extends Entity`). |
| `scene.timer(seg, { onTick, onEnd })` | Cuenta regresiva. |
| `el(tag, props, hijos)` · `onTap(el, fn)` | Helpers DOM y "toque" accesible (mouse + táctil + teclado). |

### Puntuación

`score.answer(correct, { speed, base, halfFloor })` da hasta **1000 puntos** según
la **rapidez** (mínimo la mitad si aciertas al final) más un **bono por racha**
(+50 por acierto consecutivo, tope 5) — el mismo espíritu del cuestionario de
edu-mesh. `score.miss()` rompe la racha sin contar intento (p. ej. un par
equivocado en memoria). Los **resultados** (`game.results`, evento `end`):

```js
{ won, score, correct, total, accuracy, bestStreak, seed, title }
```

### Crear un tipo de juego nuevo (plugin)

Un "tipo" es una fábrica que arma escenas a partir de un `def`. Regístralo y ya se
puede invocar con `loadGame({ type: 'mi-tipo', ... })`:

```js
import { defineGameType } from './src/engine/index.js';

defineGameType('verdadero-falso', (game, def) => {
  const preguntas = def.config.preguntas;
  game.scene('play', (s) => { /* …construye la UI con s.root, game.score… */ });
});
```

Así están hechos los cuatro tipos integrados (ver [`src/games/`](src/games/)).

---

## Cómo encaja con edu-mesh

Un `.game.json` es **contenido como cualquier otro**: texto, verificable, ligero.
El flujo pensado:

1. **Crear** el juego (con el SDK o como `.game.json`).
2. **Firmar y publicar** el `.game.json` en edu-mesh (Ed25519), igual que un PDF o un video.
3. **Repartir** por la WiFi del salón (P2P); cada celular **verifica la firma** y lo juega offline.
4. Como el azar va con **semilla**, el juego es idéntico y reproducible en todos los dispositivos.

> Este repo es el **motor** (independiente y reutilizable). No modifica edu-mesh:
> expone los juegos como datos + un runtime para que edu-mesh (u otra app) los
> sirva y reproduzca. El puente concreto de distribución vive del lado de edu-mesh.

---

## Estructura del proyecto

```
motor-edu-mesh/
├── index.html                 # demo jugable (menú + probador de JSON)
├── src/
│   ├── engine/                # NÚCLEO del motor (SDK)
│   │   ├── index.js           #   API pública
│   │   ├── game.js            #   Game + loadGame()
│   │   ├── scene.js           #   Scene (escenas, temporizadores, bus de eventos)
│   │   ├── entity.js          #   Entity (objetos del juego en el DOM)
│   │   ├── score.js           #   puntuación (rapidez + racha)
│   │   ├── rng.js             #   azar con semilla (determinista)
│   │   ├── audio.js           #   efectos sintetizados (Web Audio)
│   │   ├── loop.js            #   bucle rAF / setTimeout (headless-safe)
│   │   ├── input.js           #   onTap accesible (táctil + teclado)
│   │   ├── text.js            #   normalización (acentos / mayúsculas)
│   │   ├── dom.js             #   helpers DOM
│   │   └── registry.js        #   defineGameType / loadGame (plugins)
│   ├── games/                 # TIPOS integrados (plugins sobre el motor)
│   │   ├── memory.js · math.js · fill.js · wordsearch.js
│   │   └── index.js           #   registra los tipos
│   └── styles.css             # estilos del motor y de los juegos (claro/oscuro)
├── examples/                  # 4 juegos como .game.json + 1 con el SDK
├── scripts/serve.js           # servidor estático del demo (sin dependencias)
└── test/                      # pruebas con node:test (lógica pura, determinista)
```

---

## Limitaciones honestas / próximos pasos

- Los juegos integrados son **de un jugador y locales** (no en vivo). El cuestionario en
  vivo estilo Kahoot ya existe en edu-mesh; este motor cubre el **juego individual offline**.
- La lógica está probada (26 pruebas) y el render se verificó en un navegador real,
  **pero no a escala de un salón** → haz un piloto antes de depender de él en clase.
- Posibles siguientes pasos: más tipos (arrastrar/clasificar, trivia para un jugador),
  un editor visual para maestros sobre este mismo formato, registro de resultados en el
  catálogo de edu-mesh, e imágenes/audio en las cartas y huecos.

## Licencia
MIT — libre y gratis. Ver [LICENSE](LICENSE).
