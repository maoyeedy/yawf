import {
  GM_addValueChangeListener,
  GM_getValue,
  GM_removeValueChangeListener,
  GM_setValue,
} from '$'

/* eslint-disable @typescript-eslint/no-explicit-any */

const configKey = 'CONFIG'

export class ConfigManager {
  private _profileId: string
  private _config: Record<string, Record<string, any>>
  private _changeListeners = new Map<string, Set<(value: any) => void>>()
  private _listenerId: string | number

  constructor(profileId: string) {
    this._profileId = profileId
    this._config = this._readStorage()
    this._listenerId = GM_addValueChangeListener(
      configKey,
      (_name: string, _oldValue?: any, _newValue?: any, remote?: boolean) => {
        if (!remote) return
        const oldProfile = this._config[this._profileId]
        this._config = this._readStorage()
        const newProfile = this._config[this._profileId]
        const keys = new Set([...Object.keys(oldProfile ?? {}), ...Object.keys(newProfile ?? {})])
        keys.forEach((key) => {
          const ov = oldProfile?.[key] ?? null
          const nv = newProfile?.[key] ?? null
          if (JSON.stringify(ov) !== JSON.stringify(nv)) {
            this._changeListeners.get(key)?.forEach((fn) => fn(nv))
          }
        })
      }
    )
  }
  _readStorage(): Record<string, Record<string, any>> {
    try {
      const config = GM_getValue(configKey)
      if (config && typeof config === 'object') {
        ;(config as any)[this._profileId] ??= {}
        return config as Record<string, Record<string, any>>
      }
    } catch {
      /* ignore */
    }
    return { [this._profileId]: {} }
  }
  _writeStorage(config: Record<string, Record<string, any>>): Record<string, Record<string, any>> {
    try {
      GM_setValue(configKey, config)
      return config
    } catch {
      /* ignore */
    }
    try {
      GM_setValue(configKey, {})
    } catch {
      /* ignore */
    }
    return {}
  }
  get(key: string): any {
    return this._config[this._profileId]?.[key]
  }
  set(key: string, newValue: any) {
    if (
      JSON.stringify(this._config[this._profileId]?.[key] ?? null) ===
      JSON.stringify(newValue ?? null)
    )
      return
    const updated = {
      ...this._config,
      [this._profileId]: { ...(this._config[this._profileId] ?? {}), [key]: newValue },
    }
    this._writeStorage(updated)
    this._config = updated
    this._changeListeners.get(key)?.forEach((fn) => fn(newValue))
  }
  addChangeListener(key: string, fn: (value: any) => void) {
    if (!this._changeListeners.has(key)) this._changeListeners.set(key, new Set())
    this._changeListeners.get(key)!.add(fn)
    return () => this._changeListeners.get(key)?.delete(fn)
  }
  destroy() {
    GM_removeValueChangeListener(this._listenerId)
    this._changeListeners.clear()
  }
}
