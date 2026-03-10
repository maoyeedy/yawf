import type { MessageDetail } from './types'

type Handler = (data: unknown) => unknown | Promise<unknown>

/**
 * IPC via CustomEvent dispatch/listen on `document`.
 *
 * NOTE: The page-script copy is inlined inside the injected function
 * (it cannot import modules). Keep both copies in sync when making changes.
 */
export class MessageBroker {
  private _handlers = new Map<string, Handler>()
  private _pending = new Map<number, (result: unknown) => void>()
  private _seq = 0
  private _sendChannel: string

  constructor(sendChannel: string, receiveChannel: string) {
    this._sendChannel = sendChannel
    document.addEventListener(receiveChannel, async (event: Event) => {
      const { method, data, _id, _isResponse } = (event as CustomEvent<MessageDetail>).detail
      if (_isResponse && _id != null && this._pending.has(_id)) {
        this._pending.get(_id)!(data)
        this._pending.delete(_id)
      } else if (method && this._handlers.has(method)) {
        const result = await this._handlers.get(method)!(data)
        if (_id != null) {
          document.dispatchEvent(
            new CustomEvent(this._sendChannel, {
              detail: { data: result, _id, _isResponse: true },
            })
          )
        }
      }
    })
  }

  handle(method: string, handler: Handler): void {
    this._handlers.set(method, handler)
  }

  invoke(method: string, data?: unknown): void {
    document.dispatchEvent(new CustomEvent(this._sendChannel, { detail: { method, data } }))
  }

  request(method: string, data?: unknown, timeout = 10000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this._seq
      const timer = setTimeout(() => {
        this._pending.delete(id)
        reject(new Error(`MessageBroker request "${method}" timed out after ${timeout}ms`))
      }, timeout)
      this._pending.set(id, (result) => {
        clearTimeout(timer)
        resolve(result)
      })
      document.dispatchEvent(
        new CustomEvent(this._sendChannel, { detail: { method, data, _id: id } })
      )
    })
  }
}
