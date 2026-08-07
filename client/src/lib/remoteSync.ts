import { getSupabase, getEffectiveRowId, TABLES, TABLE } from './supabase'
import type { QueuedOp, EntityKind } from '../data/offlineQueue'

export type RemoteData = {
  chores: any[]
  calendar: any[]
  shopping: any[]
  notes: any[]
  chore_game?: any
  meta?: any
  updated_at?: string
  revision?: number
  updatedAt?: string
  deletedAt?: string
}

function getRowId(): string | null {
  try { return getEffectiveRowId() } catch { return null }
}

export async function reallyOnline(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && (navigator as any).onLine === false) return false
  } catch { return false }
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
        const env = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY
        if (env) anon = env as string
      } catch {}
    }
    if (!anon) anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbGxlYnNqdGdpaHN4aGNtY3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NDQxMjQsImV4cCI6MjEwMTMyMDEyNH0.Q6PuA6nvTI__DEB0i7akLusljjjeYu_0IxQICOc5oSQ'
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    const t = ctrl ? setTimeout(() => ctrl.abort(), 2000) : null
    const resp = await fetch('https://zlllebsjtgihsxhcmcvb.supabase.co/rest/v1/', {
      method: 'HEAD',
      headers: { apikey: anon } as any,
      signal: ctrl ? ctrl.signal : undefined,
    } as any)
    if (t) clearTimeout(t)
    return resp.ok || resp.status === 401 || resp.status === 404 || resp.status === 400
  } catch {
    try { if (typeof navigator !== 'undefined' && (navigator as any).onLine !== false) return true } catch {}
    return false
  }
}

function maxUpdated(...arrs: any[][]): string {
  let max = 0
  let iso = new Date().toISOString()
  for (const a of arrs) {
    for (const it of a || []) {
      try {
        const ts = it.updated_at || it.updatedAt || it.created_at || it.createdAt
        if (!ts) continue
        const t = new Date(ts).getTime()
        if (!isNaN(t) && t > max) { max = t; iso = new Date(t).toISOString() }
      } catch {}
    }
  }
  return iso
}

export async function remoteLoad(): Promise<RemoteData | null> {
  const hid = getRowId()
  if (!hid) {
    console.warn('[supabase] load skip — no household_id, need onboarding/recover')
    return null
  }
  const sb = getSupabase()
  if (!sb) {
    console.warn('[supabase] load skip – no config')
    return null
  }
  try {
    const online = await reallyOnline()
    if (!online) {
      console.warn('[supabase] offline – queueing, skipping load, using cache')
      return null
    }
  } catch {}

  try {
    const [calRes, choresRes, shopRes, notesRes, houseRes] = await Promise.all([
      sb.from(TABLES.CAL).select('*').eq('household_id', hid).is('deleted_at', null).order('start', { ascending: true } as any) as any,
      sb.from(TABLES.CHORES).select('*').eq('household_id', hid).is('deleted_at', null) as any,
      sb.from(TABLES.SHOP).select('*').eq('household_id', hid).is('deleted_at', null) as any,
      sb.from(TABLES.NOTES).select('*').eq('household_id', hid).is('deleted_at', null) as any,
      sb.from(TABLES.HOUSEHOLDS).select('*').eq('id', hid).maybeSingle() as any,
    ]).catch((e:any) => {
      console.warn('[supabase] parallel load error', e?.message || e)
      return [ { data: null, error: e }, { data: null }, { data: null }, { data: null }, { data: null } ] as any
    })

    const calendar = (calRes?.data as any[]) || []
    const chores = (choresRes?.data as any[]) || []
    const shopping = (shopRes?.data as any[]) || []
    const notes = (notesRes?.data as any[]) || []
    const house = houseRes?.data || null

    const totalNorm = calendar.length + chores.length + shopping.length + notes.length

    // If normalized empty, try legacy couple_data fallback for migration
    if (totalNorm === 0) {
      try {
        const { data: legacy, error: legErr } = await (sb as any).from(TABLE).select('*').eq('id', hid).maybeSingle()
        if (!legErr && legacy) {
          const lc = Array.isArray((legacy as any).calendar) ? (legacy as any).calendar : []
          const lch = Array.isArray((legacy as any).chores) ? (legacy as any).chores : []
          const lsh = Array.isArray((legacy as any).shopping) ? (legacy as any).shopping : []
          const ln = Array.isArray((legacy as any).notes) ? (legacy as any).notes : []
          const totalLegacy = lc.length + lch.length + lsh.length + ln.length
          if (totalLegacy > 0) {
            console.log(`[supabase] fallback legacy couple_data total=${totalLegacy} c:${lch.length} cal:${lc.length} s:${lsh.length} n:${ln.length}`)
            const nowIso = new Date().toISOString()
            try { localStorage.setItem('couple_v1_last_sync', nowIso) } catch {}
            return {
              chores: lch,
              calendar: lc,
              shopping: lsh,
              notes: ln,
              meta: (legacy as any).meta || house?.meta || null,
              updated_at: (legacy as any).updated_at || nowIso,
              revision: (legacy as any).revision ?? 0,
            }
          }
        }
      } catch {}
    }

    // If still empty but house exists, return empty shape (new household)
    if (totalNorm === 0 && !house) {
      // still return empty rather than null to allow onboarding to proceed
      // but log
      console.log(`[supabase] loaded ok hid=${hid.slice(0,8)} counts c:0 cal:0 s:0 n:0 (new house)`)
      try { localStorage.setItem('couple_v1_last_sync', new Date().toISOString()) } catch {}
      return { chores: [], calendar: [], shopping: [], notes: [], meta: house?.meta || null, updated_at: new Date().toISOString(), revision: 0 }
    }

    try {
      const nowIso = new Date().toISOString()
      localStorage.setItem('couple_v1_last_sync', nowIso)
    } catch {}

    try {
      let anonTail = '????'
      try {
        // @ts-ignore
        const w: any = typeof window !== 'undefined' ? window : null
        const cand = w?.__SUPABASE_ANON__ || w?.__SUPABASE_ANON_KEY__
        if (cand) anonTail = String(cand).slice(-4)
        else {
          // @ts-ignore
          const env = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY
          if (env) anonTail = String(env).slice(-4)
        }
      } catch {}
      console.log(`[supabase] loaded ok hid=${hid.slice(0,12)} anon=eyJ...${anonTail} counts c:${chores.length} cal:${calendar.length} s:${shopping.length} n:${notes.length}`)
    } catch {}

    return {
      chores,
      calendar,
      shopping,
      notes,
      meta: house?.meta || null,
      updated_at: maxUpdated(calendar as any, chores as any, shopping as any, notes as any),
      revision: 0,
    }
  } catch (e: any) {
    console.warn('[supabase] load ex', e?.message || e)
    return null
  }
}

// Deprecated shims — log warning and passthrough for backward compat
export function mergeById<T>(local: T[], remote: T[]): T[] {
  try { console.warn('[remoteSync] mergeById deprecated — server-wins replace in V159') } catch {}
  // server-wins: prefer remote if non-empty
  if (Array.isArray(remote) && remote.length > 0) return remote as any
  return local as any
}
export function stripNotesPhotos<T>(arr: T[]): T[] {
  try { console.warn('[remoteSync] stripNotesPhotos deprecated in V159') } catch {}
  return arr as any
}
export function withTimestamps<T>(arr: T[], _updatedBy?: string): T[] {
  try { console.warn('[remoteSync] withTimestamps deprecated in V159') } catch {}
  return arr as any
}

function kindToTable(kind: EntityKind): string {
  switch (kind) {
    case 'calendar': return TABLES.CAL
    case 'chore': return TABLES.CHORES
    case 'shopping': return TABLES.SHOP
    case 'note': return TABLES.NOTES
    default: return TABLES.NOTES
  }
}

export async function remoteSaveOperations(ops: QueuedOp[]): Promise<boolean> {
  if (!ops || ops.length === 0) return true
  const hid = getRowId()
  if (!hid) {
    console.warn('[supabase] saveOperations blocked — no household id')
    return false
  }
  const sb = getSupabase()
  if (!sb) {
    console.warn('[supabase] saveOperations skip — no config')
    return false
  }
  const online = await reallyOnline()
  if (!online) return false

  for (const op of ops) {
    if (!op || !op.id) continue
    const targetHid = op.household_id || hid
    const table = kindToTable(op.kind)
    try {
      if (op.op === 'delete') {
        const { error } = await (sb as any).from(table).delete().eq('id', op.id).eq('household_id', targetHid)
        if (error) {
          // treat not-found as success
          if (String(error.code) === 'PGRST116' || String(error.message).toLowerCase().includes('no rows')) {
            // ok
          } else {
            console.warn('[supabase] delete error', table, op.id, error.message)
            return false
          }
        }
      } else {
        const row = {
          id: op.id,
          household_id: targetHid,
          ...(op.payload || {}),
        } as any
        if (!row.updated_at && !row.updatedAt) row.updated_at = new Date().toISOString()
        const { error } = await (sb as any).from(table).upsert(row, { onConflict: 'id' } as any)
        if (error) {
          console.warn('[supabase] upsert error', table, op.id, error.message)
          return false
        }
      }
    } catch (e: any) {
      console.warn('[supabase] saveOperations ex', table, op.id, e?.message || e)
      return false
    }
  }
  try {
    const nowIso = new Date().toISOString()
    localStorage.setItem('couple_v1_last_sync', nowIso)
    localStorage.setItem('couple_v1_last_confirmed_at', nowIso)
    localStorage.setItem('couple_v1_had_remote', '1')
  } catch {}
  return true
}

// Deprecated wrapper converting legacy giant payload style → ops
export async function remoteSave(partial: any & { allowEmpty?: boolean; expectedRevision?: number; mutationId?: string }): Promise<string | false> {
  try { console.warn('[supabase] remoteSave deprecated — use remoteSaveOperations op-log in V159') } catch {}
  const hid = getRowId()
  if (!hid) return false
  const ops: QueuedOp[] = []
  const nowIso = new Date().toISOString()
  const mkId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
  const enqueueFromArr = (kind: EntityKind, arr: any[], op: 'create' | 'update' = 'update') => {
    for (const it of arr || []) {
      if (!it || !it.id) continue
      ops.push({
        mutationId: mkId('m'),
        kind,
        op,
        id: String(it.id),
        household_id: hid,
        payload: it,
        createdAt: nowIso,
        retries: 0,
      } as QueuedOp)
    }
  }
  if (Array.isArray(partial.calendar)) enqueueFromArr('calendar', partial.calendar, 'update')
  if (Array.isArray(partial.chores)) enqueueFromArr('chore', partial.chores, 'update')
  if (Array.isArray(partial.shopping)) enqueueFromArr('shopping', partial.shopping, 'update')
  if (Array.isArray(partial.notes)) enqueueFromArr('note', partial.notes, 'update')
  if (ops.length === 0) {
    // if partial is actually empty but allowEmpty requested, treat as success
    if (partial.allowEmpty) return nowIso
    return false
  }
  const ok = await remoteSaveOperations(ops)
  if (!ok) return false
  return nowIso
}

export type RemoteChange = {
  kind: EntityKind
  op: 'create' | 'update' | 'delete'
  data: any
  household_id?: string
}

export function subscribeRemoteV2(cb: (change: RemoteChange) => void) {
  const hid = getRowId()
  if (!hid) return () => {}
  const sb = getSupabase()
  if (!sb) return () => {}
  try {
    const ch = (sb as any).channel('house_' + hid)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CAL, filter: `household_id=eq.${hid}` }, (payload: any) => {
        if (payload.eventType === 'DELETE') return
        cb({ kind: 'calendar', op: payload.eventType?.toLowerCase() === 'insert' ? 'create' : 'update', data: payload.new, household_id: hid })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CHORES, filter: `household_id=eq.${hid}` }, (payload: any) => {
        if (payload.eventType === 'DELETE') return
        cb({ kind: 'chore', op: payload.eventType?.toLowerCase() === 'insert' ? 'create' : 'update', data: payload.new, household_id: hid })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.SHOP, filter: `household_id=eq.${hid}` }, (payload: any) => {
        if (payload.eventType === 'DELETE') return
        cb({ kind: 'shopping', op: payload.eventType?.toLowerCase() === 'insert' ? 'create' : 'update', data: payload.new, household_id: hid })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.NOTES, filter: `household_id=eq.${hid}` }, (payload: any) => {
        if (payload.eventType === 'DELETE') return
        cb({ kind: 'note', op: payload.eventType?.toLowerCase() === 'insert' ? 'create' : 'update', data: payload.new, household_id: hid })
      })
      .subscribe()
    return () => { try { (sb as any).removeChannel(ch) } catch {} }
  } catch { return () => {} }
}

// Legacy subscribeRemote — expects full RemoteData cb; we re-fetch full data on any change (server-wins)
export function subscribeRemote(cb: (data: RemoteData) => void) {
  const hid = getRowId()
  if (!hid) return () => {}
  const sb = getSupabase()
  if (!sb) return () => {}
  try {
    let pending = false
    const triggerReload = async () => {
      if (pending) return
      pending = true
      try {
        const fresh = await remoteLoad()
        if (fresh) cb(fresh)
      } catch {}
      pending = false
    }
    const ch = (sb as any).channel('house_' + hid + '_legacy')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CAL, filter: `household_id=eq.${hid}` }, () => { triggerReload() })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CHORES, filter: `household_id=eq.${hid}` }, () => { triggerReload() })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.SHOP, filter: `household_id=eq.${hid}` }, () => { triggerReload() })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.NOTES, filter: `household_id=eq.${hid}` }, () => { triggerReload() })
      .subscribe()
    return () => { try { (sb as any).removeChannel(ch) } catch {} }
  } catch { return () => {} }
}
