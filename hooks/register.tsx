import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Snap } from '../types'

const snapAtom = atom({ plugin: 'usage-bars', key: 'snap' } as const, null)

const CELLS = 20

const LABELS: Record<string, string> = {
  five_hour: 'Usage (5h)',
  seven_day: 'Usage (7d)',
  spend_limit: 'Spend limit',
}

/** The window to show: the five-hour one, else whichever is fullest. */
function pickLimit(limits: SessionRateLimit[]): SessionRateLimit | undefined {
  return (
    limits.find(l => l.kind === 'five_hour') ??
    [...limits].sort((a, b) => b.percentUsed - a.percentUsed)[0]
  )
}

function toSnap(context: SessionContextUsage, rateLimits: SessionRateLimit[]): Snap {
  const limit = pickLimit(rateLimits)

  return {
    contextPercent: context.percent,
    contextTokens: context.tokens,
    contextWindow: context.window,
    limit: limit && { kind: limit.kind, percent: limit.percentUsed, resetsAt: limit.resetsAt },
  }
}

const colorFor = (percent: number) => (percent >= 85 ? 'red' : percent >= 60 ? 'yellow' : 'green')

const compact = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`

function resetsIn(resetsAt: string | undefined, now: number): string {
  if (!resetsAt) return ''
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60000))
  const h = Math.floor(minutes / 60)

  return ` · resets in ${h > 0 ? `${h}h ${minutes % 60}m` : `${minutes}m`}`
}

export const register: Register = on => {
  const refresh = async ($: Parameters<Parameters<typeof on>[2]>[0]) => {
    const { context, rateLimits } = await $.session.usage()
    await update($, snapAtom, () => toSnap(context, rateLimits))
  }

  on('session.start', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  // The engine pushes a measurement after each turn and whenever a limit moves a whole point.
  on('session.measure', async ($, e, next) => {
    await update($, snapAtom, () => toSnap(e.context, e.rateLimits))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    let snap = await read($, snapAtom)

    if (snap === null) {
      const { context, rateLimits } = await $.session.usage()
      snap = toSnap(context, rateLimits)
    }

    const now = await $.clock.now()
    const { Box, Text } = $.ui.resolve(e)

    const bar = (label: string, percent: number | undefined, detail: string) => {
      const known = percent !== undefined
      const p = known ? Math.min(100, Math.max(0, percent)) : 0
      const filled = Math.round((p / 100) * CELLS)

      return (
        <Box flexDirection="row">
          <Text dimColor>{label.padEnd(12)}</Text>
          <Text color={known ? colorFor(p) : undefined}>{'█'.repeat(filled)}</Text>
          <Text dimColor>{'░'.repeat(CELLS - filled)}</Text>
          <Text> {known ? `${Math.round(percent)}%` : '--%'}</Text>
          <Text dimColor>{detail}</Text>
        </Box>
      )
    }

    const limit = snap.limit
    const tokens =
      snap.contextTokens !== undefined ? ` · ${compact(snap.contextTokens)} / ${compact(snap.contextWindow)}` : ` · ${compact(snap.contextWindow)} window`

    return (
      <Box flexDirection="column">
        {bar(
          limit ? (LABELS[limit.kind] ?? limit.kind) : 'Usage',
          limit?.percent,
          limit ? resetsIn(limit.resetsAt, now) : ' · no limit reported',
        )}
        {bar('Context', snap.contextPercent, tokens)}
      </Box>
    )
  })
}
