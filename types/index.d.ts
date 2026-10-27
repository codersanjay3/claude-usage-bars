export type LimitSnap = { kind: string; percent: number; resetsAt?: string }
export type Snap = {
  /** Context window fill, 0 to 100, absent before the first response. */
  contextPercent?: number
  /** Tokens in the live window and the window's size. */
  contextTokens?: number
  contextWindow: number
  /** The rate-limit window shown: the five-hour one when present, else the fullest. Absent off a subscription. */
  limit?: LimitSnap
}

declare module 'claude-code' {
  interface PluginState {
    'usage-bars': { snap: Snap | null }
  }
}
