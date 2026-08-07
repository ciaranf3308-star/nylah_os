// Legacy shim — keep data/remoteSync in sync with lib/remoteSync per V159
// Do not use giant JSON table; delegate to normalized server-wins impl.
export * from '../lib/remoteSync'
export { default } from '../lib/remoteSync'
import * as Lib from '../lib/remoteSync'

// Preserve named exports expected by old imports that may still reference TABLE/ROW_ID
export const TABLE = Lib as any
export const ROW_ID_LEGACY = 'ash-ciaran-2026'
export const ROW_ID = ROW_ID_LEGACY
