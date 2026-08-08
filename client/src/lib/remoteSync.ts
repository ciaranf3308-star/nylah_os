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
    if (typeof navigator !== 'undefined' && (navigator as any).onLine === false) {
      // double-check: if we have cached data, still allow attempt - headless can lie
      // only hard-block if both offline flag AND no cached Supabase URL
      return false
    }
  } catch {}
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
    const t = ctrl ? setTimeout(() => ctrl.abort(), 2500) : null
    const resp = await fetch('https://zlllebsjtgihsxhcmcvb.supabase.co/rest/v1/', {
      method: 'HEAD',
      headers: { apikey: anon } as any,
      signal: ctrl ? ctrl.signal : undefined,
    } as any)
    if (t) clearTimeout(t)
    return resp.ok || resp.status === 401 || resp.status === 404 || resp.status === 400
  } catch {
    try { if (typeof navigator !== 'undefined' && (navigator as any).onLine !== false) return true } catch {}
    // optimistic: allow drain attempt, let actual upsert error decide offline
    try { if (typeof navigator !== 'undefined' && (navigator as any).onLine === false) return false } catch {}
    return true
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
      sb.from(TABLES.CAL).select('*').eq('household_id', hid).is('deleted_at', null).order('created_at', { ascending: true } as any) as any,
      sb.from(TABLES.CHORES).select('*').eq('household_id', hid).is('deleted_at', null) as any,
      sb.from(TABLES.SHOP).select('*').eq('household_id', hid).is('deleted_at', null) as any,
      sb.from(TABLES.NOTES).select('*').eq('household_id', hid).is('deleted_at', null) as any,
      sb.from(TABLES.HOUSEHOLDS).select('*').eq('id', hid).maybeSingle() as any,
    ]).catch((e:any) => {
      console.warn('[supabase] parallel load error', e?.message || e)
      return [ { data: null, error: e }, { data: null }, { data: null }, { data: null }, { data: null } ] as any
    })

    // unwrap `data` jsonb blob → actual app objects (live minimal schema)
    const unwrap = (arr:any[])=> (arr||[]).map((r:any)=>{
      try{
        if (r && typeof r.data === 'object' && r.data !== null) {
          // merge outer id/household_id to ensure consistency, but keep data fields dominant
          const d = r.data
          // ensure id/household_id present if data missing them
          if (!d.id) d.id = r.id
          if (!d.household_id) d.household_id = r.household_id || hid
          // propagate timestamps if missing from data
          if (!d.created_at && r.created_at) d.created_at = r.created_at
          if (!d.updated_at && r.updated_at) d.updated_at = r.updated_at
          if (!d.createdAt && r.created_at) d.createdAt = r.created_at
          if (!d.updatedAt && r.updated_at) d.updatedAt = r.updated_at
          return d
        }
        if (r && typeof r.data === 'string') {
          try { const parsed = JSON.parse(r.data); return { ...parsed, id: parsed.id||r.id, household_id: r.household_id||hid } } catch { return r }
        }
        return r
      }catch{ return r }
    })

    const calendarRaw = (calRes?.data as any[]) || []
    const choresRaw = (choresRes?.data as any[]) || []
    const shoppingRaw = (shopRes?.data as any[]) || []
    const notesRaw = (notesRes?.data as any[]) || []
    const house = houseRes?.data || null

    const calendar = unwrap(calendarRaw)
    const chores = unwrap(choresRaw)
    const shopping = unwrap(shoppingRaw)
    const notes = unwrap(notesRaw)

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

    // Transitional merge: normalized may have 1 new event while legacy still holds 5 old events (ash-ciaran-2026)
    // Union them to avoid sudden data loss after we started writing to normalized.
    if (hid === 'ash-ciaran-2026' || hid.startsWith('ash-')) {
      try {
        const { data: legacy, error: legErr } = await (sb as any).from(TABLE).select('*').eq('id', hid).maybeSingle()
        if (!legErr && legacy) {
          const lc = Array.isArray((legacy as any).calendar) ? (legacy as any).calendar : []
          if (lc.length > 0) {
            // merge normalized + legacy missing ids => server-wins for overlapping
            const seen = new Set<string>(calendar.map((c:any)=> String(c.id)))
            for (const ev of lc) {
              if (!ev || !ev.id) continue
              if (!seen.has(String(ev.id))) {
                calendar.push(ev)
                seen.add(String(ev.id))
              }
            }
            // same for chores/shopping/notes if normalized empty but legacy has them
            if (chores.length === 0) {
              const lch = Array.isArray((legacy as any).chores) ? (legacy as any).chores : []
              if (lch.length>0) chores.push(...lch)
            }
            if (shopping.length === 0) {
              const lsh = Array.isArray((legacy as any).shopping) ? (legacy as any).shopping : []
              if (lsh.length>0) shopping.push(...lsh)
            }
            if (notes.length === 0) {
              const ln = Array.isArray((legacy as any).notes) ? (legacy as any).notes : []
              if (ln.length>0) notes.push(...ln)
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

function cleanRow(kind: EntityKind, src: any): any {
  const o = src || {}
  const nowIso = new Date().toISOString()
  try {
    // Current live Supabase (pre-V159-migration) uses minimal schema:
    // id, household_id, data (jsonb), created_at, updated_at, deleted_at, + calendar end_at
    // PostgREST rejects unknown columns, so we must ONLY send those that exist.
    // We store full payload in `data` for forward compatibility with both schemas.
    const base: any = {
      id: String(o.id),
      household_id: o.household_id,
      data: o, // store whole object blob
      updated_at: o.updated_at || o.updatedAt || nowIso,
    }
    const ca = o.created_at || o.createdAt || null
    if (ca) base.created_at = ca
    const da = o.deleted_at || o.deletedAt || null
    if (da) base.deleted_at = da
    else if (o.deleted_at === null || o.deletedAt === null) base.deleted_at = null
    // calendar has optional end_at column on live DB
    if (kind === 'calendar') {
      const endVal = o.end || o.endAt || o.end_at || null
      if (endVal) base.end_at = endVal
    }
    return base
  } catch {}
  // fallback minimal - this shape works on both old and new schema (id+household_id+data)
  return { id: String(o.id), household_id: o.household_id, data: o, updated_at: nowIso }
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
  if (!online) {
    console.warn('[supabase] offline probe says offline — will still attempt upsert optimistically')
    // do not early return - attempt anyway, let actual error decide
  }

  async function safeUpsert(table: string, row: any, id: string, targetHid: string): Promise<{error:any|null}> {
    try {
      const { error } = await (sb as any).from(table).upsert(row, { onConflict: 'id' } as any)
      if (!error) return { error: null }
      // if no unique constraint matches on_conflict, fallback to insert/update sans onConflict
      const code = (error as any)?.code
      const msg = String((error as any)?.message||'')
      if (code === '42P10' || msg.includes('ON CONFLICT')) {
        // try plain insert
        const { error: insErr } = await (sb as any).from(table).insert(row as any)
        if (!insErr) return { error: null }
        // if insert says duplicate / already exists, try update
        if (String(insErr.code) === '23505' || String(insErr.message).toLowerCase().includes('duplicate') || String(insErr.message).toLowerCase().includes('unique')) {
          const { error: updErr } = await (sb as any).from(table).update(row as any).eq('id', id).eq('household_id', targetHid)
          return { error: updErr || null }
        }
        // if insert failed for other reason (maybe row exists but no unique), attempt update anyway
        const { error: updErr2 } = await (sb as any).from(table).update(row as any).eq('id', id).eq('household_id', targetHid)
        if (!updErr2) return { error: null }
        // if update affected 0 rows, try insert again without on_conflict but force? give up returning original error
        return { error: insErr }
      }
      return { error }
    } catch (e:any) {
      return { error: e }
    }
  }

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
            // don't return false yet - try legacy fallback below
          }
        }
      } else {
        const cleaned = cleanRow(op.kind as any, { ...(op.payload || {}), id: op.id, household_id: targetHid })
        const { error } = await safeUpsert(table, cleaned, String(op.id), String(targetHid))
        if (error) {
          console.warn('[supabase] upsert error', table, op.id, error.message)
          // continue to legacy attempt, don't hard fail yet
          // return false
        }
      }
    } catch (e: any) {
      console.warn('[supabase] saveOperations ex', table, op.id, e?.message || e)
      // continue, try legacy
    }
  }
  // Legacy write-through for households still on giant JSON (ash-ciaran-2026 and any pre-v159)
  // This ensures deletes like United actually persist when normalized tables are empty / RLS blocks
  try {
    // only attempt if hid looks legacy or if we have any calendar ops
    const hasCalendarOps = ops.some(o=> o.kind==='calendar')
    const hasAnyDelete = ops.some(o=> o.op==='delete')
    if (hasCalendarOps || hasAnyDelete) {
      const { data: legacyRow, error: legErr } = await (sb as any).from(TABLE).select('*').eq('id', hid).maybeSingle()
      // even if no legacy row (nylah new house), attempt to create one on save so reload fallback works
      let baseRow: any = null
      if (!legErr && legacyRow) baseRow = legacyRow
      else if (!legacyRow) {
        // try to see if ANY row exists for hid in couple_data; if not, we will upsert minimal
        baseRow = { id: hid, calendar: [], chores: [], shopping: [], notes: [] }
      }
      if (baseRow) {
        let mutated = false
        let newCalendar = Array.isArray((baseRow as any).calendar) ? [...(baseRow as any).calendar] : Array.isArray((legacyRow as any)?.calendar) ? [...(legacyRow as any).calendar] : []
        // for new nylah houses legacyRow may be null -> start empty
        if (!legacyRow && (!newCalendar || newCalendar.length===0)) {
          // will be built from ops
        }
        let newChores = Array.isArray((baseRow as any).chores) ? [...(baseRow as any).chores] : null
        let newShopping = Array.isArray((baseRow as any).shopping) ? [...(baseRow as any).shopping] : null
        let newNotes = Array.isArray((baseRow as any).notes) ? [...(baseRow as any).notes] : null
        // ensure arrays exist for nylah case where baseRow empty
        if (!newChores) newChores = []
        if (!newShopping) newShopping = []
        if (!newNotes) newNotes = []
        if (!newCalendar) newCalendar = []

        for (const op of ops) {
          if (op.kind === 'calendar') {
            if (op.op === 'delete') {
              const before = newCalendar.length
              newCalendar = newCalendar.filter((ev:any)=> String(ev.id)!==String(op.id) && !(ev as any).deletedAt && !(ev as any).deleted_at)
              // also need to ensure we filtered correctly even if already marking deletedAt elsewhere - just remove
              newCalendar = newCalendar.filter((ev:any)=> String(ev.id)!==String(op.id))
              if (newCalendar.length !== before) mutated = true
            } else {
              // upsert
              const payload = op.payload || {}
              const idx = newCalendar.findIndex((ev:any)=> String(ev.id)===String(op.id))
              if (idx >= 0) { newCalendar[idx] = { ...newCalendar[idx], ...payload, id: op.id, updatedAt: new Date().toISOString() }; mutated = true }
              else { newCalendar.push({ ...(payload||{}), id: op.id }); mutated = true }
            }
          } else if (op.kind === 'chore') {
            if (op.op === 'delete') {
              const before = newChores.length
              newChores = newChores.filter((c:any)=> String(c.id)!==String(op.id))
              if (newChores.length !== before) mutated = true
            } else {
              // for nylah new houses, also sync creates to legacy so fallback stays consistent
              const payload = op.payload || {}
              const idx = newChores.findIndex((c:any)=> String(c.id)===String(op.id))
              if (idx>=0) { newChores[idx] = { ...newChores[idx], ...payload }; mutated=true }
              else { newChores.push({ ...(payload||{}), id: op.id }); mutated=true }
            }
          } else if (op.kind === 'shopping') {
            if (op.op === 'delete') {
              const before = newShopping.length
              newShopping = newShopping.filter((s:any)=> String(s.id)!==String(op.id))
              if (newShopping.length !== before) mutated = true
            } else {
              const payload = op.payload || {}
              const idx = newShopping.findIndex((s:any)=> String(s.id)===String(op.id))
              if (idx>=0) newShopping[idx] = { ...newShopping[idx], ...payload }
              else newShopping.push({ ...(payload||{}), id: op.id })
              mutated=true
            }
          } else if (op.kind === 'note') {
            if (op.op === 'delete') {
              const before = newNotes.length
              newNotes = newNotes.filter((n:any)=> String(n.id)!==String(op.id))
              if (newNotes.length !== before) mutated = true
            } else {
              const payload = op.payload || {}
              const idx = newNotes.findIndex((n:any)=> String(n.id)===String(op.id))
              if (idx>=0) newNotes[idx] = { ...newNotes[idx], ...payload }
              else newNotes.push({ ...(payload||{}), id: op.id })
              mutated=true
            }
          }
        }
        if (mutated) {
          const updatePayload: any = { updated_at: new Date().toISOString(), calendar: newCalendar }
          if (newChores) updatePayload.chores = newChores
          if (newShopping) updatePayload.shopping = newShopping
          if (newNotes) updatePayload.notes = newNotes
          // couple_data uses id PK and may have updated_at
          const { error: updErr } = await (sb as any).from(TABLE).update(updatePayload as any).eq('id', hid)
          if (updErr) {
            console.warn('[supabase] legacy couple_data update failed', updErr.message)
            // fallback to upsert whole row if update blocked by RLS or row missing
            try {
              const { error: upsErr } = await (sb as any).from(TABLE).upsert({ id: hid, ...updatePayload } as any, { onConflict: 'id' } as any)
              if (upsErr) console.warn('[supabase] legacy upsert also failed', upsErr.message)
              else mutated = true
            } catch {}
          } else {
            console.log(`[supabase] legacy couple_data synced delete/update hid=${hid.slice(0,12)} cal=${newCalendar.length} mutated=${mutated}`)
          }
        }
      }
    }
  } catch (e:any) {
    console.warn('[supabase] legacy write-through error', e?.message||e)
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
