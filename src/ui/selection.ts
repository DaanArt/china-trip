export type Selection =
  | { kind: 'stop'; id: string }
  | { kind: 'leg'; key: string }
  | { kind: 'place'; id: string }
  | null

export type MapMode = 'add-stop' | 'add-idea' | null

export const MODE_ICON: Record<string, string> = { train: '🚄', flight: '✈️', bus: '🚌', car: '🚗', other: '🧭' }
