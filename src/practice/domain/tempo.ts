// Tempo terms and stepping — practice.session/REQ-004. The eight bands are
// contiguous across the whole 40–200 bpm range (property-tested), so every
// bpm in range has exactly one term.

export interface TempoTerm {
  readonly name: string;
  readonly fromBpm: number;
  readonly toBpm: number;
  readonly gloss: string;
}

export const TEMPO_TERMS: readonly TempoTerm[] = [
  { name: "Largo", fromBpm: 40, toBpm: 59, gloss: "broadly" },
  { name: "Larghetto", fromBpm: 60, toBpm: 65, gloss: "rather broadly" },
  { name: "Adagio", fromBpm: 66, toBpm: 75, gloss: "slowly, at ease" },
  { name: "Andante", fromBpm: 76, toBpm: 107, gloss: "walking pace" },
  { name: "Moderato", fromBpm: 108, toBpm: 119, gloss: "moderately" },
  { name: "Allegro", fromBpm: 120, toBpm: 155, gloss: "fast, cheerful" },
  { name: "Vivace", fromBpm: 156, toBpm: 175, gloss: "lively" },
  { name: "Presto", fromBpm: 176, toBpm: 200, gloss: "very fast" },
];

export const TEMPO_MIN_BPM = 40;
export const TEMPO_MAX_BPM = 200;

export function tempoTermFor(bpm: number): TempoTerm {
  const term = TEMPO_TERMS.find((t) => bpm >= t.fromBpm && bpm <= t.toBpm);
  if (!term) throw new Error(`no tempo term covers ${bpm} bpm`);
  return term;
}

export function steppedTempo(bpm: number, delta: -2 | 2): number {
  const stepped = bpm + delta;
  return Math.min(TEMPO_MAX_BPM, Math.max(TEMPO_MIN_BPM, stepped));
}

export function tempoForTerm(term: TempoTerm): number {
  return Math.round((term.fromBpm + term.toBpm) / 2);
}
