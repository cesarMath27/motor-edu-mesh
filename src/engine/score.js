// =============================================================================
//  PUNTUACIÓN  — rapidez + racha (mismo espíritu que el cuestionario de edu-mesh)
// -----------------------------------------------------------------------------
//  Acertar da hasta POINTS_MAX según qué tan RÁPIDO respondas (mínimo la mitad
//  si aciertas justo al final), más un pequeño bono por racha de aciertos.
//  Lógica pura y probada: sin DOM.
// =============================================================================

export const POINTS_MAX = 1000;   // puntos por un acierto instantáneo
export const STREAK_BONUS = 50;   // por cada acierto consecutivo (desde el 2º)
export const STREAK_CAP = 5;      // tope del bono de racha

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export class Score {
  constructor() {
    this.reset();
  }

  reset() {
    this.points = 0;      // puntos acumulados
    this.streak = 0;      // aciertos seguidos actuales
    this.correct = 0;     // aciertos totales
    this.total = 0;       // intentos contabilizados (correct + fallos contados)
    this.bestStreak = 0;  // mejor racha de la partida
    this.lastGain = 0;    // puntos del último acierto (para animaciones)
    return this;
  }

  /**
   * Registra un intento.
   * @param {boolean} correct
   * @param {object} [o]
   * @param {number} [o.speed=1]  Rapidez 0..1 (1 = instantáneo).
   * @param {number} [o.base=POINTS_MAX]
   * @param {boolean} [o.halfFloor=true]  Garantiza al menos la mitad si aciertas.
   * @returns {number} puntos ganados en este intento (0 si falla).
   */
  answer(correct, { speed = 1, base = POINTS_MAX, halfFloor = true } = {}) {
    this.total++;
    if (!correct) {
      this.streak = 0;
      this.lastGain = 0;
      return 0;
    }
    this.correct++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const s = clamp01(speed);
    const speedPts = Math.round(base * (halfFloor ? 0.5 + 0.5 * s : s));
    const streakPts = Math.min(this.streak - 1, STREAK_CAP) * STREAK_BONUS;
    const gain = speedPts + streakPts;
    this.points += gain;
    this.lastGain = gain;
    return gain;
  }

  /** Rompe la racha SIN contar un intento (p. ej. par equivocado en memoria). */
  miss() {
    this.streak = 0;
    this.lastGain = 0;
    return this;
  }

  /** Suma puntos sueltos (bonos de tiempo, etc.). */
  bonus(pts) {
    this.points += Math.round(pts);
    return this.points;
  }

  /** Precisión 0..1. */
  get accuracy() {
    return this.total ? this.correct / this.total : 0;
  }
}
