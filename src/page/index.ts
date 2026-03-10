/**
 * Build the page-script payload string.
 *
 * The returned string is a self-contained JavaScript expression that will be
 * injected into the main world via a `<script>` tag. Because the code is
 * serialized with `Function.prototype.toString()`, it **cannot** rely on any
 * ES module imports — everything it needs must live inside the function body
 * (including its own copy of `MessageBroker`).
 */
export function buildPagePayload(
  configSnapshot: Record<string, unknown>,
  messageKey: string
): string {
  // Pad with newlines so that DevTools source-map lines align with the
  // original file (the header block occupies ~35 lines in the .user.js build).
  return (
    Array(35).fill('\n').join('') +
    'void(' +
    pageMain +
    '(' +
    [configSnapshot, messageKey].map((x) => JSON.stringify(x)) +
    '))'
  )
}

/* ------------------------------------------------------------------ */
/*  The entire page-script function – serialized at build time.       */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pageMain(config: Record<string, Record<string, unknown>>, messageKey: string) {
  /* ---- ambient types (not available in the main world) ---- */
  type User = { idstr: string; screen_name: string; avatar?: string }
  type Feed = {
    idstr: string
    text_raw?: string
    text?: string
    content_auth?: number
    user?: User
    retweeted_status?: Feed
    cooperate_info?: { cooperate_user_list?: Array<{ idstr?: string }> }
    title_source?: { name?: string }
    title?: { text?: string }
    source?: string
  }
  type Comment = {
    idstr: string
    text_raw?: string
    text?: string
    user?: User
    comments?: Comment[]
  }
  type HotSearch = { word: string; rank?: number; is_ad?: boolean }
  type FilterResult = { action: 'hide'; reason: string } | { action: 'show' }
  type FilterContext = { profile?: string; uid?: string; rcList?: boolean }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const $CONFIG: Record<string, any> = {}
  const yawfConfig: Record<string, any> = {}
  let isDebug: boolean | null = null

  if (typeof (window as any).$CONFIG !== 'undefined') {
    alert(
      '脚本需要在页面打开前加载才能正常工作。当前注入加载时间过晚，请检查你是用的猴子版本是否受到支持。'
    )
  }

  //#region utils
  const log = function (...args: unknown[]) {
    if (!isDebug) return
    if (typeof args[0] === 'string') console.log('[yyawf] ' + args[0], ...args.slice(1))
    else console.log('[yyawf]', ...args)
  }

  const _kebabCache = new Map<string, string>()
  const kebabCase = function (word: unknown): string | undefined {
    if (typeof word !== 'string') return undefined
    if (_kebabCache.has(word)) return _kebabCache.get(word)!
    const result = word.replace(/./g, (char, index) => {
      const lower = char.toLowerCase()
      if (char === lower || index === 0) return lower
      else return '-' + lower
    })
    _kebabCache.set(word, result)
    return result
  }

  const getComponentName = (type: any): string | undefined =>
    kebabCase(type?.name || type?.__name || type?.__refName)

  const rawFunctions = new WeakMap<Function, Function>()
  const wrapFunction = function <T extends Function>(original: T, wrapped: Function): T {
    const proxy = new Proxy(original, {
      apply(_: any, thisArg: any, argumentsList: any[]) {
        return wrapped.apply(thisArg, argumentsList)
      },
    })
    rawFunctions.set(proxy, original)
    return proxy
  }
  //#endregion

  //#region MessageBroker (page-script copy — must be self-contained)
  // SYNC: Keep in sync with src/shared/broker.ts
  class MessageBroker {
    private _handlers = new Map<string, (data: any) => any>()
    private _pending = new Map<number, (result: any) => void>()
    private _seq = 0
    private _sendChannel: string

    constructor(sendChannel: string, receiveChannel: string) {
      this._sendChannel = sendChannel
      document.addEventListener(receiveChannel, async (event: Event) => {
        const { method, data, _id, _isResponse } = (event as CustomEvent).detail
        if (_isResponse && this._pending.has(_id)) {
          this._pending.get(_id)!(data)
          this._pending.delete(_id)
        } else if (this._handlers.has(method)) {
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
    handle(method: string, handler: (data: any) => any) {
      this._handlers.set(method, handler)
    }
    invoke(method: string, data?: any) {
      document.dispatchEvent(new CustomEvent(this._sendChannel, { detail: { method, data } }))
    }
    request(method: string, data?: any, timeout = 10000): Promise<any> {
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

  const _pageBroker = new MessageBroker(messageKey + 'CONTENT', messageKey + 'PAGE')
  const invokeContentScript = (method: string, data?: any) => _pageBroker.invoke(method, data)
  const handle = (key: string, fn: (data: any) => any) => _pageBroker.handle(key, fn)
  //#endregion

  //#region dialog helper
  const dialog = (dialogConfig: any) => {
    return appReady.then((app: any) => {
      const dlg = app.config.globalProperties.$_w_dialog
      return new Promise((resolve) => {
        dlg({
          ...dialogConfig,
          action: () => resolve(true),
          cancel: () => resolve(false),
        })
      })
    })
  }
  handle('dialog', ({ config }: any) => dialog(config))
  handle('configUpdate', ({ key, value }: { key: string; value: any }) => {
    yawfConfig[key] = value
    invalidateFilterCache()
  })
  //#endregion

  //#region 网络请求
  const xhr: Record<string, any> = {}
  handle('xhr', ({ name, config }: { name: string; config: any }) => xhr[name](config))

  const fetchUserInfo = (function () {
    const byId = new Map<string, any>()
    const byName = new Map<string, any>()

    let throttle: Promise<any> = Promise.resolve()
    const raw = async function (param: { idstr?: string; screen_name?: string }) {
      const url = new URL('/ajax/user/popcard/get', location.href)
      if (param.idstr) url.searchParams.set('id', param.idstr)
      else if (param.screen_name) url.searchParams.set('screen_name', param.screen_name)
      try {
        const resp = await fetch(url)
        if (resp.status !== 200) return null
        const json = await resp.json()
        if (json && json.ok === 1 && json.data != null) {
          const data = json.data
          if (data.idstr && data.screen_name) return data
        }
        return null
      } catch {
        return null
      }
    }

    const returnFromCache = function (param: { idstr?: string; screen_name?: string }) {
      const { idstr, screen_name } = param
      if (idstr && byId.has(idstr)) return byId.get(idstr)
      if (screen_name && byName.has(screen_name)) return byName.get(screen_name)
      return null
    }
    const updateCacheItem = function (cache: Map<string, any>, key: string, data: any) {
      if (typeof cache.get(key)?.then === 'function') {
        if (cache.get(key) !== data) cache.get(key).resolver(data)
      } else if (data) cache.set(key, data)
      else cache.delete(key)
    }
    const updateCache = function (param: { idstr?: string; screen_name?: string }, data: any) {
      if (param.idstr) updateCacheItem(byId, param.idstr, data)
      if (param.screen_name) updateCacheItem(byName, param.screen_name, data)
      if (data && typeof data.then !== 'function') {
        if (data.idstr) updateCacheItem(byId, data.idstr, data)
        if (data.screen_name) updateCacheItem(byName, data.screen_name, data)
      }
    }
    const writeCache = function (user: any) {
      updateCache({}, user)
    }

    const throttled = async function (
      param: { idstr?: string; screen_name?: string },
      config?: { immediate?: boolean }
    ) {
      const cached = returnFromCache(param)
      if (cached) return cached

      let resolve: (value: any) => void
      const promise: any = new Promise((r) => (resolve = r))
      promise.resolver = resolve!
      updateCache(param, promise)
      if (!config?.immediate) {
        const wait = throttle
        throttle = promise.then(() => new Promise((res: any) => setTimeout(res, 100)))
        await wait
      }
      const cacheAfterWait = returnFromCache(param)
      if (cacheAfterWait !== promise) return cacheAfterWait
      const data = await raw(param)
      updateCache(param, data)

      return promise
    }

    const wrapped = async function (
      param: { idstr?: string; screen_name?: string },
      config?: { immediate?: boolean }
    ) {
      const data = await throttled(param, config)
      return JSON.parse(JSON.stringify(data ?? null))
    }

    return {
      id: (id: string, config?: { immediate?: boolean }) => wrapped({ idstr: String(id) }, config),
      name: (name: string, config?: { immediate?: boolean }) =>
        wrapped({ screen_name: String(name) }, config),
      writeCache,
    }
  })()

  xhr.userInfoById = fetchUserInfo.id
  xhr.userInfoByName = fetchUserInfo.name
  const writeUserCache = fetchUserInfo.writeCache
  xhr.searchUsers = async function (keyword: string) {
    if (!keyword) return []
    const url = new URL('/ajax/setting/searchUsers', location.href)
    url.searchParams.set('q', keyword)
    try {
      const resp = await fetch(url)
      if (resp.status !== 200) return []
      const json = await resp.json()
      if (json && json.ok === 1 && Array.isArray(json.users)) {
        json.users.forEach((user: any) =>
          writeUserCache({
            idstr: user.idstr,
            screen_name: user.screen_name,
            avatar: user.profile_image_url,
          })
        )
        return json.users
      }
      return []
    } catch {
      return []
    }
  }
  //#endregion

  //#region 配置
  const getConfigBoolean = (key: string): boolean => yawfConfig[key] === true
  const getConfigStrings = (key: string): string[] =>
    Array.isArray(yawfConfig[key]) ? yawfConfig[key].filter((x: any) => typeof x === 'string') : []
  //#endregion

  //#region 初始化
  const appReady = new Promise<any>((resolve) => {
    const prevDesc = Object.getOwnPropertyDescriptor(Object.prototype, '$cookies')
    const isVueApp = (obj: any) => obj?._uid === 0
    Object.defineProperty(Object.prototype, '$cookies', {
      set(value: any) {
        if (isVueApp(this)) {
          resolve(this)
          delete (Object.prototype as any).$cookies
          if (prevDesc && typeof prevDesc.set === 'function') {
            Object.defineProperty(Object.prototype, '$cookies', prevDesc)
          }
        } else if (prevDesc && typeof prevDesc.set === 'function') {
          prevDesc.set.call(this, value)
        } else {
          Object.defineProperty(this, '$cookies', {
            value,
            writable: true,
            configurable: true,
            enumerable: true,
          })
        }
      },
      configurable: true,
      enumerable: false,
    })
  })
  //#endregion

  //#region 过滤逻辑
  const shouldFilterFeedList = (instance: any): boolean => {
    const getAncestor = (ins: any): any[] =>
      ins.parent ? [ins.parent, ...getAncestor(ins.parent)] : []
    const ancestor = getAncestor(instance)
    if (ancestor.some((ins) => kebabCase(ins.type?.name) === 'edit-history')) return false
    return true
  }
  const shouldFilterRCList = (instance: any): boolean => {
    const $route = instance.appContext.config.globalProperties.$route
    if ($route.name === 'atWeibo') return false
    return true
  }

  let _filterConfigCache: {
    keywords: string[]
    authorsSet: Set<string>
    removeAd: boolean
  } | null = null
  const invalidateFilterCache = () => {
    _filterConfigCache = null
  }
  const filterConfig = () => {
    if (_filterConfigCache) return _filterConfigCache
    const keywords = getConfigStrings('filter::keywords')
    const authors = getConfigStrings('filter::authors')
    return (_filterConfigCache = {
      keywords,
      authorsSet: new Set(authors),
      removeAd: getConfigBoolean('cleanup::ad'),
    })
  }

  const feedFilter = function (feed: Feed, context?: FilterContext, depth = 0): FilterResult {
    const { keywords, authorsSet, removeAd } = filterConfig()
    if (removeAd && feed.content_auth === 5) return { action: 'hide', reason: '广告' }
    const texts: string[] = []
    const collectText = (f: Feed) => {
      const val = f.text_raw ?? f.text
      if (val) texts.push(val)
      if (f.title_source?.name) texts.push(f.title_source.name)
      if (f.title?.text) texts.push(f.title.text)
      if (f.source) texts.push(f.source)
    }
    collectText(feed)
    const text = texts.join('\n')
    log(feed, text)
    const keywordMatch = keywords.find((keyword) => text.includes(keyword))
    if (keywordMatch) return { action: 'hide', reason: `关键词"${keywordMatch}"` }
    const users: string[] = []
    const collectUser = (f: Feed) => {
      if (f.user?.idstr) users.push(f.user.idstr)
      f.cooperate_info?.cooperate_user_list?.forEach((item) => {
        if (item?.idstr) users.push(item.idstr)
      })
    }
    collectUser(feed)
    log(feed, users)
    const profile = context?.profile
    const feedUsersSet = new Set(users)
    const authorMatch = [...feedUsersSet].find(
      (userId) => userId !== profile && authorsSet.has(userId)
    )
    if (authorMatch) return { action: 'hide', reason: `用户"${authorMatch}"` }
    if (feed.retweeted_status && depth < 2)
      return feedFilter(feed.retweeted_status, context, depth + 1)
    return { action: 'show' }
  }

  const commentFilter = function (comment: Comment, context?: FilterContext): FilterResult {
    const { keywords, authorsSet } = filterConfig()
    const text = comment.text_raw ?? comment.text
    const keywordMatch = keywords.find((keyword) => text!.includes(keyword))
    if (keywordMatch) return { action: 'hide', reason: `关键词"${keywordMatch}"` }
    const user = comment.user?.idstr
    const profile = context?.profile
    const authorMatch = user && authorsSet.has(user) && user !== profile ? user : null
    if (authorMatch) return { action: 'hide', reason: `用户"${authorMatch}"` }
    return { action: 'show' }
  }

  const hotSearchFilter = function (hotSearch: HotSearch): FilterResult {
    const { keywords, removeAd } = filterConfig()
    if (removeAd && hotSearch.rank == null) return { action: 'hide', reason: '广告' }
    if (removeAd && hotSearch.is_ad) return { action: 'hide', reason: '广告' }
    const text = hotSearch.word
    const keywordMatch = keywords.find((keyword) => text.includes(keyword))
    if (keywordMatch) return { action: 'hide', reason: `关键词"${keywordMatch}"` }
    return { action: 'show' }
  }
  //#endregion

  //#region 监听组件生命周期
  const lifecycleListeners: Record<
    string,
    Record<string, Array<{ listener: (instance: any) => any }>>
  > = {}
  const addLifecycleListener = (
    lifecycles: string,
    componentName: string,
    listener: (instance: any) => any
  ) => {
    const item = { listener }
    const names = lifecycles.split(/\s+/).filter(Boolean)
    for (const lifecycle of names) {
      lifecycleListeners[lifecycle] ??= {}
      lifecycleListeners[lifecycle][componentName] ??= []
      lifecycleListeners[lifecycle][componentName].push(item)
    }
    return () => {
      for (const lifecycle of names) {
        const list = lifecycleListeners[lifecycle][componentName]
        const index = list.indexOf(item)
        if (index !== -1) list.splice(index, 1)
      }
    }
  }
  const runLifecycleListeners = (lifecycle: string, instance: any) => {
    if (!instance?.render) return
    const bucket = lifecycleListeners[lifecycle]
    if (!bucket) return
    const name = getComponentName(instance.type)
    const run = (list: Array<{ listener: (instance: any) => any }> | undefined) => {
      if (!list) return
      for (const item of list) {
        try {
          const result = item.listener(instance)
          if ((result as any)?.catch) (result as Promise<any>).catch((E: any) => console.error(E))
        } catch (E) {
          console.error(E)
        }
      }
    }
    run(bucket['*'])
    if (name) run(bucket[name])
  }
  const wrapRenderContext = (wrapper: (instance: any) => Function) => {
    const wrapping = new WeakMap<Function, Function>()
    const wrapped = new WeakSet<Function>()
    return (instance: any) => {
      if (wrapped.has(instance.render)) {
        return wrapping.get(instance.render)
      } else if (wrapping.has(instance.render)) {
        return (instance.render = wrapping.get(instance.render))
      }
      const wrappedRender = wrapper(instance)
      wrapping.set(
        instance.render,
        (instance.render = wrapFunction(instance.render, wrappedRender))
      )
      return wrappedRender
    }
  }

  appReady.then((app: any) => {
    invokeContentScript('ready')
    Object.assign($CONFIG, (window as any).$CONFIG)
    Object.assign(yawfConfig, config[$CONFIG.user.idstr])
    isDebug = yawfConfig['about::debug']
    log('Vue 加载完成')
    app.mixin({
      beforeCreate() {
        runLifecycleListeners('beforeCreate', (this as any)?._)
      },
      created() {
        runLifecycleListeners('created', (this as any)?._)
      },
      mounted() {
        runLifecycleListeners('mounted', (this as any)?._)
      },
      beforeUpdate() {
        runLifecycleListeners('beforeUpdate', (this as any)?._)
      },
      updated() {
        runLifecycleListeners('updated', (this as any)?._)
      },
    })
  })
  //#endregion

  //#region DEBUG
  addLifecycleListener('mounted updated', '*', (instance) => {
    if (!isDebug) return
    const el = instance.vnode.el
    el.__vue__ = instance
  })
  //#endregion

  //#region 渲染增加组件名称
  const styleMapping = new Map<string, string>()
  const _processedStyleTypes = new WeakSet()
  const updateStyleMapping = (type: any) => {
    if (!type || _processedStyleTypes.has(type)) return
    _processedStyleTypes.add(type)
    const $style = type?.__cssModules?.$style
    if (!$style) return
    const prefix = getComponentName(type)
    Object.keys($style).forEach((key) => {
      styleMapping.set($style[key], '__yawf_' + prefix + '_' + key)
    })
  }
  const renderWithExtraInfo = wrapRenderContext(function (instance: any) {
    const properName = (result: any): string => {
      if (!result) return 'unnamed-component'
      const name = getComponentName(result.type)
      if (name) return name + '--child'
      return properName(result.parent)
    }
    const render = instance.render
    const childrenSlots = new WeakMap<Function, Function>()
    const tagRenderResult = (vnode: any): any => {
      if (typeof vnode !== 'object' || !vnode) return vnode
      if (Array.isArray(vnode)) return vnode.map((child) => tagRenderResult(child))
      if (typeof vnode.props?.class === 'string') {
        const classList = vnode.props.class
          .split(' ')
          .flatMap((klass: string) => {
            if (!klass || klass.includes('__yawf_')) return []
            const mapped = styleMapping.get(klass)
            if (mapped) return [klass, mapped]
            return [klass]
          })
          .filter((x: string) => x)
        vnode.props.class = classList.join(' ')
      }
      if (vnode.props && typeof vnode.props === 'object') {
        Object.keys(vnode.props).forEach((eventName) => {
          if (!eventName.startsWith('on') || eventName.startsWith('onUpdate')) return
          const handler = vnode.props[eventName]
          const name = (
            typeof handler === 'function'
              ? [handler.name ?? 'function']
              : Array.isArray(handler)
                ? handler.flatMap((item: any) =>
                    typeof item === 'function' ? [item.name ?? 'function'] : []
                  )
                : []
          )
            .map((item: string) => item.replace(/.*\s/, ''))
            .join(' ')
          const key = kebabCase(eventName)
          vnode.props ??= {}
          vnode.props['__yawf_event_' + key!.replace(/-/g, '_') + '__'] = name
        })
      }
      if (vnode.children && Array.isArray(vnode.children)) {
        vnode.children.forEach((child: any) => {
          tagRenderResult(child)
        })
      } else if (vnode.children && typeof vnode.children === 'object') {
        Object.keys(vnode.children).forEach((key) => {
          const value = vnode.children[key]
          if (typeof value !== 'function') return
          if (childrenSlots.has(value)) {
            vnode.children[key] = childrenSlots.get(value)
          } else {
            const wrappedSlot = wrapFunction(value, function (this: any, ...args: any[]) {
              const result = value.apply(this, args)
              tagRenderResult(result)
              return result
            })
            vnode.children[key] = wrappedSlot
            childrenSlots.set(value, wrappedSlot)
          }
        })
      }
      return vnode
    }
    return function (this: any, ...args: any[]) {
      const result = render.apply(this, args)
      tagRenderResult(result)
      if (typeof result.type === 'string') instance.__renderTag = result.type
      else instance.__renderTag = null
      result.props ??= {}
      for (
        let ins = instance, lv = 0;
        ins && (!lv || typeof ins.__renderTag !== 'string');
        ins = ins.parent, ++lv
      ) {
        const name = getComponentName(ins.type) || properName(ins)
        result.props['__yawf_component_' + name + '__'] = ins.uid
        const key = ins.vnode.key
        if (typeof key === 'string' || typeof key === 'number' || typeof key === 'symbol') {
          result.props['__yawf_key_' + (lv || '') + '__'] = String(key)
        }
        if (ins !== ins.parent?.children?.[0]) break
      }
      if (
        result.key &&
        (typeof result.key === 'string' ||
          typeof result.key === 'number' ||
          typeof result.key === 'symbol')
      ) {
        result.props.__yawf_key__ = String(result.key)
      }
      return result
    }
  })
  addLifecycleListener('beforeCreate', '*', (instance) => {
    if (instance.type.components && typeof instance.type.components === 'object') {
      Object.keys(instance.type.components).forEach((key) => {
        const value = instance.type.components[key]
        value.__refName = key
      })
    }
    updateStyleMapping(instance.type)
    renderWithExtraInfo(instance)
  })
  // 微博的操作按钮
  addLifecycleListener('mounted updated', 'feed-toolbar', (instance) => {
    const el = instance.vnode.el
    ;[...(el?.querySelectorAll?.('.__yawf_feed-toolbar__item') ?? [])].forEach((item: any) => {
      if (item.querySelector('[__yawf_component_woo-like__]'))
        item.setAttribute('__yawf_feed_toolbar__', 'like')
      else {
        const i = item.querySelector('i[class*="woo-font--"]')
        if (i)
          item.setAttribute(
            '__yawf_feed_toolbar__',
            i.className
              .split(' ')
              .find((i: string) => i.includes('woo-font--'))
              .split('--')[1]
          )
      }
    })
    const container = el.querySelector('.woo-box-flex').children
    if (container[1]) container[1].setAttribute('__yawf_feed_toobar__extra__', '')
  })
  addLifecycleListener('mounted updated', 'icon-list', (instance) => {
    if (instance.type?.props?.icons) {
      const icons = instance.props.icons
      const el = instance.vnode.el
      if (Array.isArray(icons) && icons.length) {
        const children = el.children
        icons.forEach((icon: any, index: number) => {
          children?.[index]?.setAttribute('__yawf_icon_list_item__', icon.type)
        })
      }
    }
    if (instance.type?.props?.iconsName) {
      const icons = instance.props.iconsName
      const el = instance.vnode.el
      if (Array.isArray(icons) && icons.length) {
        const children = el.children
        icons.forEach((icon: any, index: number) => {
          children?.[index]?.setAttribute('__yawf_comment_toolbar_item__', icon.name)
        })
      }
    }
  })
  //#endregion

  //#region 设置入口
  const _yawfConfigEntry = { divider: true, href: '', name: '药方设置', type: 'yawf-config' }
  addLifecycleListener('created mounted updated', 'weibo-top-nav', (instance) => {
    const configs = instance.setupState?.configs
    if (Array.isArray(configs) && !configs.some((c: any) => c.type === 'yawf-config')) {
      configs.splice(-1, 0, _yawfConfigEntry)
    }
    if (instance.ctx.configHandle && !instance.ctx.configHandle.__yawf__) {
      const _orig = instance.ctx.configHandle
      const _wrapped = function (...args: any[]) {
        const [index] = args
        const type = instance.setupState.configs[index].type
        if (type === 'yawf-config') {
          invokeContentScript('config', { profileId: $CONFIG.user.idstr })
        } else _orig.apply(null, args)
      }
      ;(_wrapped as any).__yawf__ = true
      instance.ctx.configHandle = _wrapped.bind(null)
    }
  })
  //#endregion

  //#region 广告
  addLifecycleListener('created', 'card-hot-search', (instance) => {
    instance.proxy.$watch(
      () => instance.data.bandList,
      function (bandList: any[]) {
        const status = bandList.map((item) => hotSearchFilter(item))
        if (status.some((item) => item.action === 'hide')) {
          status.forEach((item, index) => {
            if (item.action === 'hide') log(`热搜过滤（${item.reason}）`, bandList[index])
          })
          bandList.splice(
            0,
            bandList.length,
            ...bandList.filter((_item, index) => status[index].action !== 'hide')
          )
        }
      },
      { deep: true }
    )
  })
  //#endregion

  //#region 消息流
  class BoundedSet {
    private _set = new Set<string>()
    private _maxSize: number
    constructor(maxSize = 5000) {
      this._maxSize = maxSize
    }
    has(value: string) {
      return this._set.has(value)
    }
    add(value: string) {
      if (this._set.size >= this._maxSize) {
        this._set.delete(this._set[Symbol.iterator]().next().value!)
      }
      this._set.add(value)
      return this
    }
  }
  const filterExecutedItems = new BoundedSet(5000)
  const filterFeedList = (feedList: any[], context: FilterContext) => {
    if (!Array.isArray(feedList) || !feedList.length) return null
    const filtered: any[] = []
    let dirty = false
    feedList.forEach((item) => {
      if (filterExecutedItems.has(item.idstr)) {
        filtered.push(item)
        return
      }
      filterExecutedItems.add(item.idstr)
      const status = feedFilter(item, context)
      if (isDebug) item.__yawf_filterStatus__ = status
      if (status.action !== 'hide') filtered.push(item)
      else {
        dirty = true
        log(`微博过滤：${status.reason}`, item)
      }
    })
    return dirty ? filtered : null
  }
  const filterRepostCommentList = (rcList: any[], context: FilterContext) => {
    if (!Array.isArray(rcList) || !rcList.length) return null
    const filtered: any[] = []
    let dirty = false
    rcList.forEach((item) => {
      if (filterExecutedItems.has(item.idstr)) {
        filtered.push(item)
        return
      }
      filterExecutedItems.add(item.idstr)
      const isRepost = item.retweeted_status
      if (isRepost) {
        const status = feedFilter(item, { ...context, rcList: true })
        if (status.action !== 'hide') filtered.push(item)
        else {
          dirty = true
          log(`转发过滤：${status.reason}`, item)
        }
      } else {
        const status = commentFilter(item, context)
        if (status.action !== 'hide') {
          const subComments = item.comments
          const filteredSubComments: any[] = []
          if (Array.isArray(subComments))
            subComments.forEach((subComment: any) => {
              const status = commentFilter(subComment)
              if (status.action !== 'hide') filteredSubComments.push(subComment)
              else log(`二级评论过滤：${status.reason}`, subComment)
            })
          if (filteredSubComments.length === subComments.length) filtered.push(item)
          else {
            dirty = true
            filtered.push({ ...item, comments: filteredSubComments })
          }
        } else {
          dirty = true
          log(`评论过滤：${status.reason}`, item)
        }
      }
    })
    return dirty ? filtered : null
  }
  const collectContext = (instance: any): FilterContext => {
    const context: FilterContext = {}
    const $route = instance.appContext.config.globalProperties.$route
    if ($route.name === 'profile') context.profile = $route.params?.id
    context.uid = $CONFIG.user.idstr
    return context
  }
  addLifecycleListener('created', 'feed-scroll', (instance) => {
    if (!shouldFilterFeedList(instance)) return
    instance.proxy.$watch(
      () => instance.proxy.$props.data,
      (feedList: any) => {
        const filtered = filterFeedList(feedList, collectContext(instance))
        if (filtered) instance.emit('update:data', filtered)
      },
      { deep: true }
    )
  })
  addLifecycleListener('created', 'feed', (instance) => {
    if (!shouldFilterRCList(instance)) return
    instance.proxy.$watch(
      () => instance.proxy.$props.data.rcList,
      (rcList: any) => {
        const filtered = filterRepostCommentList(rcList, collectContext(instance))
        if (filtered)
          instance.emit('update:data', { ...instance.proxy.$props.data, rcList: filtered })
      },
      { deep: true }
    )
  })
  addLifecycleListener('created', 'repost-coment-list', (instance) => {
    if (!shouldFilterRCList(instance)) return
    instance.proxy.$watch(
      () => instance.data.list,
      (list: any) => {
        const filtered = filterRepostCommentList(list, collectContext(instance))
        if (filtered) instance.data.list.splice(0, instance.data.list.length, ...filtered)
      }
    )
  })
  //#endregion

  //#region 热搜固顶
  addLifecycleListener('created', 'card-hot-search', (instance) => {
    if (!getConfigBoolean('cleanup::searchTop')) return
    instance.proxy.$watch(
      () => instance.data.TopWords,
      function (TopWords: any[]) {
        if (TopWords?.length) {
          log('清理：热搜：置顶热搜', TopWords)
          TopWords.splice(0)
        }
      }
    )
  })
  //#endregion

  //#region 元素清理
  // SYNC: Keep in sync with src/ui/constants.ts CLEANUP_GROUPS
  const cleanupKeys = [
    'cleanup::navHome',
    'cleanup::navHot',
    'cleanup::navTv',
    'cleanup::navMessage',
    'cleanup::navProfile',
    'cleanup::navAvatar',
    'cleanup::navGame',
    'cleanup::navDarkMode',
    'cleanup::navAria',
    'cleanup::navLogo',
    'cleanup::leftNavSpecial',
    'cleanup::leftNavMutual',
    'cleanup::leftNavCustomGroups',
    'cleanup::hotSearch',
    'cleanup::interested',
    'cleanup::creatorCenter',
    'cleanup::sideFooter',
    'cleanup::service',
    'cleanup::followRecom',
    'cleanup::feedEmptyTip',
    'cleanup::feedSource',
    'cleanup::feedFollow',
    'cleanup::feedQr',
    'cleanup::feedRetweet',
    'cleanup::feedLike',
    'cleanup::translate',
    'cleanup::iconVerify',
    'cleanup::iconVip',
    'cleanup::iconFans',
    'cleanup::iconOther',
    'cleanup::profileHeader',
    'cleanup::ad',
  ]
  appReady.then(() => {
    cleanupKeys.forEach((key) => {
      if (getConfigBoolean(key)) {
        const suffix = key.slice('cleanup::'.length)
        const cls = 'yawf-cleanup-' + (kebabCase(suffix) ?? suffix)
        document.documentElement.classList.add(cls)
      }
    })
  })
  //#endregion
}
