// data/offlineQueue.ts — V159 server-authoritative op-log
// Replaces stub with proper queue handling for normalized tables.
// Persists via IDB (couple_v1_idb kv mutation_queue) + LS fallback.

export type OpType = 'create' | 'update' | 'delete'
export type EntityKind = 'calendar' | 'chore' | 'shopping' | 'note'

export type QueuedOp = {
  mutationId: string
  kind: EntityKind
  op: OpType
  id: string
  household_id: string
  payload: any
  createdAt: string
  retries: number
}

type SupaLike = {
  from: (table: string) => any
}

const TABLE_MAP: Record<EntityKind, string> = {
  calendar: 'calendar_events',
  chore: 'chores',
  shopping: 'shopping_items',
  note: 'notes_memo',
}

let _queue: QueuedOp[] | null = null
let _loaded = false

async function loadIdb(): Promise<QueuedOp[]> {
  if (_queue && _loaded) return _queue
  try {
    const { idbGet } = await import('../lib/idb')
    const raw = await idbGet<QueuedOp[]>('mutation_queue')
    if (Array.isArray(raw)) {
      _queue = raw.filter((o: any) => o && o.id && o.kind && o.op)
      _loaded = true
      return _queue
    }
  } catch {}
  try {
    const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('idb_mutation_queue') : null
    if (ls) {
      const arr = JSON.parse(ls)
      if (Array.isArray(arr)) {
        _queue = arr.filter((o: any) => o && o.id && o.kind && o.op)
        _loaded = true
        return _queue
      }
    }
  } catch {}
  _queue = []
  _loaded = true
  return _queue
}

function genMutationId(): string {
  try {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) return (crypto as any).randomUUID()
  } catch {}
  return `mut_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
}

export async function getQueue(): Promise<QueuedOp[]> {
  return await loadIdb()
}
export function getQueueSync(): QueuedOp[] {
  return _queue || []
}

export async function persistQueue(queue?: QueuedOp[]): Promise<void> {
  const q = queue ?? _queue ?? []
  _queue = q
  _loaded = true
  try {
    const { idbSet } = await import('../lib/idb')
    await idbSet('mutation_queue', q as any)
  } catch {}
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('idb_mutation_queue', JSON.stringify(q))
      localStorage.setItem('couple_v1_queue_count', String(q.length))
    }
  } catch {}
}

export function persistQueueSync(queue: QueuedOp[]) {
  _queue = queue
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('idb_mutation_queue', JSON.stringify(queue))
      localStorage.setItem('couple_v1_queue_count', String(queue.length))
    }
  } catch {}
}

async function reallyOnline(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && (navigator as any).onLine === false) return false
  } catch { return false }
  // quick reachable probe – treat 401/404/400 as reachable (anon public)
  try {
    let anon = ''
    try {
      // @ts-ignore
      const w: any = typeof window !== 'undefined' ? (window as any) : null
      if (w && (w.__SUPABASE_ANON__ || w.__SUPABASE_ANON_KEY__)) anon = (w.__SUPABASE_ANON__ || w.__SUPABASE_ANON_KEY__) as string
    } catch {}
    if (!anon) {
      try {
        // @ts-ignore
        const v = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY
        if (v) anon = v as string
      } catch {}
    }
    if (!anon) anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbGxlYnNqdGdpaHN4aGNtY3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NDQxMjQsImV4cCI6MjEwMTMyMDEyNH0.Q6PuA6nvTI__DEB0i7akLusljjjeYu_0IxQICOc5oSQ'
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timeout = ctrl ? setTimeout(() => ctrl.abort(), 2000) : null
    const resp = await fetch('https://zlllebsjtgihsxhcmcvb.supabase.co/rest/v1/', {
      method: 'HEAD',
      headers: { apikey: anon } as any,
      signal: ctrl ? ctrl.signal : undefined,
    } as any)
    if (timeout) clearTimeout(timeout)
    return resp.ok || resp.status === 401 || resp.status === 404 || resp.status === 400
  } catch {
    // if probe fails but navigator says online, assume online (optimistic) to allow drain attempt
    try { if (typeof navigator !== 'undefined' && (navigator as any).onLine !== false) return true } catch {}
    return false
  }
}

export async function enqueueOp(kind: EntityKind, op: OpType, id: string, hid: string, payload: any): Promise<string> {
  const q = await loadIdb()
  const mutationId = genMutationId()
  const entry: QueuedOp = {
    mutationId,
    kind,
    op,
    id,
    household_id: hid,
    payload: payload ?? { id, household_id: hid },
    createdAt: new Date().toISOString(),
    retries: 0,
  }
  q.push(entry)
  await persistQueue(q)
  return mutationId
}

// drainOps returns true if all drained, false if stopped early (offline or retries exhausted)
export async function drainOps(sb: SupaLike): Promise<boolean> {
  const q = await loadIdb()
  if (q.length === 0) return true

  const online = await reallyOnline()
  if (!online) return false

  // clone to iterate, but mutate source via splice
  let idx = 0
  while (idx < q.length) {
    const op = q[idx]
    if (!op || !op.id || !op.household_id) {
      q.splice(idx, 1)
      await persistQueue(q)
      continue
    }
    const table = TABLE_MAP[op.kind] || 'notes_memo'
    let attempt = 0
    let success = false
    let lastErr: any = null
    while (attempt < 3 && !success) {
      try {
        if (op.op === 'delete') {
          const { error } = await sb.from(table).delete().eq('id', op.id).eq('household_id', op.household_id)
          if (!error) success = true
          else {
            // if row already gone, treat as success
            if ((error as any).code === 'PGRST116' || String(error.message).toLowerCase().includes('no rows')) success = true
            else lastErr = error
          }
        } else {
          // upsert: ensure payload has id + household_id + updated_at
          const upsertRow = {
            id: op.id,
            household_id: op.household_id,
            ...(op.payload || {}),
          } as any
          // drop undefined keys that could break upsert
          if (!upsertRow.updated_at && !upsertRow.updatedAt) upsertRow.updated_at = new Date().toISOString()
          const { error } = await sb.from(table).upsert(upsertRow, { onConflict: 'id' } as any)
          if (!error) success = true
          else lastErr = error
        }
      } catch (e) {
        lastErr = e
      }
      if (!success) {
        attempt++
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 300 * attempt))
        }
      }
    }
    if (success) {
      q.splice(idx, 1)
      await persistQueue(q)
      // continue same idx (now next entry)
    } else {
      // failed after retries
      op.retries = (op.retries || 0) + 1
      await persistQueue(q)
      console.warn(`[offlineQueue] drain failed ${op.kind}:${op.id} after 3 attempts`, lastErr?.message || lastErr)
      if (op.retries >= 3) {
        // keep for later but stop draining further to preserve order
        return false
      }
      return false
    }
  }
  return q.length === 0
}

// Back-compat shims expected by older code that imported Mutation placeholder
export type Mutation = QueuedOp
export const __offline_placeholder = false

// Sync wrappers for state.ts consumption
export async function idbGetQueueCompat() { return await getQueue() }
export async function idbSetQueueCompat(list: QueuedOp[]) { await persistQueue(list) }
