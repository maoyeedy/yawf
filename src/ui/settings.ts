import { GM_addValueChangeListener, GM_getValue, GM_removeValueChangeListener, GM_setValue, unsafeWindow } from '$';
import { MessageBroker } from '../shared/broker';

/* eslint-disable @typescript-eslint/no-explicit-any */

//#region 基本 UI 组件
const dialogStack: HTMLElement[] = [];

interface DialogOptions {
  id: string;
  title: string;
  render: (content: HTMLElement, buttons: Record<string, HTMLElement>) => void;
  button?: {
    ok?: (() => void) | null;
    cancel?: (() => void) | null;
    close?: (() => void) | null;
  };
  onShow?: () => void;
  onHide?: () => void;
}

interface DialogHandle {
  hide: () => void;
  show: (pos?: { x?: number; y?: number }) => void;
  resetPosition: (pos?: { x?: number; y?: number }) => void;
  dom: HTMLElement;
}

const uiDialog = function ({ id, title, render, button, onShow, onHide }: DialogOptions): DialogHandle {
  const template = document.createElement('template');
  template.innerHTML = /* html */ `
<div class="woo-box-flex woo-box-alignCenter woo-box-justifyCenter woo-modal-wrap woo-modal-an--pop-enter">
  <div class="woo-modal-main yawf-dialog">
    <i class="woo-font woo-font--cross yawf-dialog-close"></i>
    <div class="woo-box-flex woo-box-column woo-box-alignCenter woo-dialog-main" aria-modal="true" tabindex="0" role="alertdialog">
      <div class="woo-dialog-title yawf-dialog-title"></div>
      <div class="woo-dialog-body yawf-dialog-content">
      </div>
      <div class="woo-dialog-ctrl yawf-dialog-buttons">
        <button class="woo-button-main woo-button-line woo-button-default woo-button-m woo-button-round woo-dialog-btn yawf-dialog-button-cancel"><span class="woo-button-wrap"><span class="woo-button-content"></span></span></button>
        <button class="woo-button-main woo-button-flat woo-button-primary woo-button-m woo-button-round woo-dialog-btn yawf-dialog-button-ok"><span class="woo-button-wrap"><span class="woo-button-content"></span></span></button>
      </div>
    </div>
  </div>
  <div class="woo-modal-mask yawf-dialog-mask"></div>
</div>
`;
  const container = document.importNode(template.content.firstElementChild!, true) as HTMLElement;
  const dialog = (container.querySelector('.yawf-dialog') || container) as HTMLElement;
  dialog.id = id;
  const titleNode = dialog.querySelector('.yawf-dialog-title') as HTMLElement;
  const buttonCollectionNode = dialog.querySelector('.yawf-dialog-buttons') as HTMLElement;
  const okButton = dialog.querySelector('.yawf-dialog-button-ok') as HTMLButtonElement;
  const cancelButton = dialog.querySelector('.yawf-dialog-button-cancel') as HTMLButtonElement;
  const closeButton = dialog.querySelector('.yawf-dialog-close') as HTMLElement;
  const mask = container.querySelector('.yawf-dialog-mask') as HTMLElement;
  const contentNode = dialog.querySelector('.yawf-dialog-content') as HTMLElement;

  titleNode.textContent = title;
  titleNode.classList.add('woo-dialog-bar');
  okButton.textContent = '确定';
  cancelButton.textContent = '取消';
  closeButton.title = '关闭';
  render(
    contentNode,
    {
      close: closeButton,
      ...(button?.ok ? { ok: okButton } : {}),
      ...(button?.cancel ? { cancel: cancelButton } : {}),
    },
  );

  const lastPos = { x: 0, y: 0 };
  const setPos = function ({ x, y }: { x: number; y: number }) {
    const left = Math.min(Math.max(0, x), document.body.clientWidth - dialog.clientWidth - 2);
    const top = Math.min(Math.max(0, y), document.body.clientHeight - dialog.clientHeight - 2);
    if (left + 'px' !== dialog.style.left) dialog.style.left = left + 'px';
    if (top + 'px' !== dialog.style.top) dialog.style.top = top + 'px';
    return Object.assign(lastPos, { x: left, y: top });
  };

  const resetPos = () => {
    setPos(lastPos);
  };

  const dragMoveStart = (function mouseDrag() {
    const mouseStart: { x: number; y: number } = { x: 0, y: 0 };
    const dragMove = (event: MouseEvent) => {
      setPos({
        x: event.screenX - mouseStart.x,
        y: event.screenY - mouseStart.y,
      });
    };
    const dragMoveDone = function () {
      document.removeEventListener('mousemove', dragMove);
      document.removeEventListener('mouseup', dragMoveDone);
      dialog.classList.remove('yawf-drag');
      if ((dialog as any).releaseCapture) {
        (dialog as any).releaseCapture();
      }
    };
    const dragMoveStart = function (e: MouseEvent) {
      Object.assign(mouseStart, {
        x: e.screenX - lastPos.x,
        y: e.screenY - lastPos.y,
      });
      document.addEventListener('mousemove', dragMove);
      document.addEventListener('mouseup', dragMoveDone);
      dialog.classList.add('yawf-drag');
    };
    return dragMoveStart;
  })();

  if (titleNode) {
    titleNode.addEventListener('mousedown', dragMoveStart);
  }

  if (!button?.ok && !button?.cancel) {
    buttonCollectionNode.parentNode!.removeChild(buttonCollectionNode);
  } else {
    if (button.ok)
      okButton.addEventListener('click', (event) => {
        if (!event.isTrusted) return;
        button.ok!();
      });
    else buttonCollectionNode.removeChild(okButton);
    if (button.cancel)
      cancelButton.addEventListener('click', (event) => {
        if (!event.isTrusted) return;
        button.cancel!();
      });
    else buttonCollectionNode.removeChild(cancelButton);
  }
  closeButton.addEventListener('click', (event) => {
    if (!event.isTrusted) return;
    ;(button?.close ?? hide)();
  });
  mask.addEventListener('click', (event) => {
    if (!event.isTrusted) return;
    ;(button?.close ?? hide)();
  });

  const keys = (event: KeyboardEvent) => {
    if (!event.isTrusted) return;
    if (dialogStack[dialogStack.length - 1] !== dialog) return;
    if (event.key === 'Enter' && button && button.ok) button.ok();
    else if (event.key === 'Escape') {
      ;(button?.cancel ?? button?.close ?? hide)();
    } else return;
    event.stopPropagation();
    event.preventDefault();
  };
  const stopKeys = (event: KeyboardEvent) => {
    event.stopPropagation();
  };

  const hide = function () {
    onHide?.();
    container.classList.add('woo-modal-an--pop-leave-to');
    document.removeEventListener('keydown', keys);
    container.removeEventListener('keypress', stopKeys);
    document.removeEventListener('scroll', resetPos);
    window.removeEventListener('resize', resetPos);
    setTimeout(function () {
      container.remove();
    }, 200);
    dialogStack.splice(dialogStack.indexOf(dialog), 1);
  };
  const resetPosition = function ({ x, y }: { x?: number; y?: number } = {}) {
    if (x == null) x = (window.innerWidth - dialog.clientWidth) / 2;
    if (y == null) y = (window.innerHeight - dialog.clientHeight) / 2;
    setPos({ x, y });
  };
  const show = function ({ x, y }: { x?: number; y?: number } = {}) {
    document.body.appendChild(container);
    resetPosition({ x, y });
    document.addEventListener('keydown', keys);
    container.addEventListener('keypress', stopKeys);
    document.addEventListener('scroll', resetPos);
    window.addEventListener('resize', resetPos);
    const focusTarget = (dialog.querySelector('[tabindex]') || dialog) as HTMLElement;
    focusTarget.focus();
    setTimeout(function () {
      container.classList.remove('woo-modal-an--pop-enter');
    }, 200);
    dialogStack.push(dialog);
    onShow?.();
  };
  return { hide, show, resetPosition, dom: dialog };
};
//#endregion

//#region ConfigManager
class ConfigManager {
  private _profileId: string;
  private _config: Record<string, Record<string, any>>;
  private _changeListeners = new Map<string, Set<(value: any) => void>>();
  private _listenerId: string | number;

  constructor(profileId: string) {
    this._profileId = profileId;
    this._config = this._readStorage();
    this._listenerId = GM_addValueChangeListener(
      configKey,
      (_name: string, _oldValue?: any, _newValue?: any, remote?: boolean) => {
        if (!remote) return;
        const oldProfile = this._config[this._profileId];
        this._config = this._readStorage();
        const newProfile = this._config[this._profileId];
        const keys = new Set([...Object.keys(oldProfile ?? {}), ...Object.keys(newProfile ?? {})]);
        keys.forEach((key) => {
          const ov = oldProfile?.[key] ?? null;
          const nv = newProfile?.[key] ?? null;
          if (JSON.stringify(ov) !== JSON.stringify(nv)) {
            this._changeListeners.get(key)?.forEach((fn) => fn(nv));
          }
        });
      },
    );
  }
  _readStorage(): Record<string, Record<string, any>> {
    try {
      const config = GM_getValue(configKey);
      if (config && typeof config === 'object') {
        (config as any)[this._profileId] ??= {};
        return config as Record<string, Record<string, any>>;
      }
    } catch {
      /* ignore */
    }
    return { [this._profileId]: {} };
  }
  _writeStorage(config: Record<string, Record<string, any>>): Record<string, Record<string, any>> {
    try {
      GM_setValue(configKey, config);
      return config;
    } catch {
      /* ignore */
    }
    try {
      GM_setValue(configKey, {});
    } catch {
      /* ignore */
    }
    return {};
  }
  get(key: string): any {
    return this._config[this._profileId]?.[key];
  }
  set(key: string, newValue: any) {
    if (
      JSON.stringify(this._config[this._profileId]?.[key] ?? null) ===
      JSON.stringify(newValue ?? null)
    )
      return;
    const updated = {
      ...this._config,
      [this._profileId]: { ...(this._config[this._profileId] ?? {}), [key]: newValue },
    };
    this._writeStorage(updated);
    this._config = updated;
    this._changeListeners.get(key)?.forEach((fn) => fn(newValue));
  }
  addChangeListener(key: string, fn: (value: any) => void) {
    if (!this._changeListeners.has(key)) this._changeListeners.set(key, new Set());
    this._changeListeners.get(key)!.add(fn);
    return () => this._changeListeners.get(key)?.delete(fn);
  }
  destroy() {
    GM_removeValueChangeListener(this._listenerId);
    this._changeListeners.clear();
  }
}
//#endregion

//#region 配置界面模板
const CONFIG_TEMPLATE = /* html */ `
<yawf-tabs>
  <yawf-tab name="微博过滤">
    <yawf-group name="过滤规则">
      <yawf-rule id="filter::keywords">
        <div>关键字 <yawf-strings-input key="filter::keywords" /></div>
        <div><yawf-strings key="filter::keywords" /></div>
      </yawf-rule>
      <p>此处的关键字会被应用于微博和评论，关键字会匹配全文，包括话题和@的用户。</p>
      <yawf-rule id="filter::authors">
        <div>作者 <yawf-users-input key="filter::authors" /></div>
        <div><yawf-users key="filter::authors" /></div>
      </yawf-rule>
      <p>此处的作者会被应用于微博的作者、转发原作者、共著作者等用户。</p>
    </yawf-group>
  </yawf-tab>
  <yawf-tab name="界面清理">
    <yawf-group name="顶栏" class="yawf-compact-group">
      <yawf-rule id="cleanup::navHome"><yawf-checkbox key="cleanup::navHome">首页</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::navHot"><yawf-checkbox key="cleanup::navHot">推荐</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::navTv"><yawf-checkbox key="cleanup::navTv">视频</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::navMessage"><yawf-checkbox key="cleanup::navMessage">消息</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::navProfile"><yawf-checkbox key="cleanup::navProfile">个人主页</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::navAvatar"><yawf-checkbox key="cleanup::navAvatar">头像</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::navGame"><yawf-checkbox key="cleanup::navGame">游戏</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::navDarkMode"><yawf-checkbox key="cleanup::navDarkMode">日/夜模式</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::navAria"><yawf-checkbox key="cleanup::navAria">无障碍</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::navLogo"><yawf-checkbox key="cleanup::navLogo">Logo</yawf-checkbox></yawf-rule>
    </yawf-group>
    <yawf-group name="左侧栏" class="yawf-compact-group">
      <yawf-rule id="cleanup::leftNavSpecial"><yawf-checkbox key="cleanup::leftNavSpecial">特别关注</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::leftNavMutual"><yawf-checkbox key="cleanup::leftNavMutual">好友圈</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::leftNavCustomGroups"><yawf-checkbox key="cleanup::leftNavCustomGroups">自定义分组</yawf-checkbox></yawf-rule>
    </yawf-group>
    <yawf-group name="右侧栏" class="yawf-compact-group">
      <yawf-rule id="cleanup::hotSearch"><yawf-checkbox key="cleanup::hotSearch">热搜</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::searchTop"><yawf-checkbox key="cleanup::searchTop">热搜置顶</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::interested"><yawf-checkbox key="cleanup::interested">可能感兴趣的人</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::creatorCenter"><yawf-checkbox key="cleanup::creatorCenter">创作者中心</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::sideFooter"><yawf-checkbox key="cleanup::sideFooter">底部链接</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::service"><yawf-checkbox key="cleanup::service">常用功能</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::followRecom"><yawf-checkbox key="cleanup::followRecom">关注推荐</yawf-checkbox></yawf-rule>
    </yawf-group>
    <yawf-group name="微博内容" class="yawf-compact-group">
      <yawf-rule id="cleanup::feedEmptyTip"><yawf-checkbox key="cleanup::feedEmptyTip">已刷完提示</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::feedSource"><yawf-checkbox key="cleanup::feedSource">来源</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::feedFollow"><yawf-checkbox key="cleanup::feedFollow">关注按钮</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::feedQr"><yawf-checkbox key="cleanup::feedQr">分享二维码</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::feedRetweet"><yawf-checkbox key="cleanup::feedRetweet">转发</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::feedLike"><yawf-checkbox key="cleanup::feedLike">点赞</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::translate"><yawf-checkbox key="cleanup::translate">翻译</yawf-checkbox></yawf-rule>
    </yawf-group>
    <yawf-group name="图标" class="yawf-compact-group">
      <yawf-rule id="cleanup::iconVerify"><yawf-checkbox key="cleanup::iconVerify">红橙黄蓝V</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::iconVip"><yawf-checkbox key="cleanup::iconVip">VIP</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::iconFans"><yawf-checkbox key="cleanup::iconFans">铁粉钻粉</yawf-checkbox></yawf-rule>
      <yawf-rule id="cleanup::iconOther"><yawf-checkbox key="cleanup::iconOther">其他</yawf-checkbox></yawf-rule>
    </yawf-group>
    <yawf-group name="个人主页" class="yawf-compact-group">
      <yawf-rule id="cleanup::profileHeader"><yawf-checkbox key="cleanup::profileHeader">顶图</yawf-checkbox></yawf-rule>
    </yawf-group>
    <yawf-group name="其他" class="yawf-compact-group">
      <yawf-rule id="cleanup::ad"><yawf-checkbox key="cleanup::ad">广告</yawf-checkbox></yawf-rule>
    </yawf-group>
  </yawf-tab>
  <yawf-tab name="关于">
    <yawf-group name="调试">
      <yawf-rule id="about::debug">
        <yawf-checkbox key="about::debug">启用调试</yawf-checkbox>
      </yawf-rule>
    </yawf-group>
    <yawf-group name="关于">
      <yawf-rule id="about::script">
        <p>yyawf 目前正在开发中，欢迎贡献代码</p>
        <p>Licensed under MPL-2.0</p>
      </yawf-rule>
    </yawf-group>
  </yawf-tab>
</yawf-tabs>
`;
//#endregion

//#region renderConfig
const renderConfig = (
  container: HTMLElement,
  profileId: string,
  template: string,
  dirtyStaticKeys: Set<string>,
  invokePageScript: (method: string, data?: any) => void,
  xhr: Record<string, any>,
  wooDialog: (config: any) => Promise<unknown>,
): (() => void) => {
  const domParser = new DOMParser();
  const dom = domParser.parseFromString('<yawf-config>' + template + '</yawf-config>', 'text/html');

  const moveSubTree = (n: HTMLElement, o: HTMLElement) => {
    while (o.firstChild) n.appendChild(o.removeChild(o.firstChild));
    return n;
  };

  const r = (t: string, ...args: any[]): HTMLElement => {
    const d = document.createElement(t);
    if (typeof args[0] === 'string') d.className = args.shift();
    if (args[0] && !Array.isArray(args[0]))
      ((a: Record<string, string>) => Object.keys(a).forEach((k) => d.setAttribute(k, a[k])))(
        args.shift(),
      );
    if (Array.isArray(args[0]))
      ((a: Node[]) => a.forEach((t) => d.appendChild(t)))(args.shift());
    return d;
  };
  const t = (text: string) => new Text(text);

  const main = dom.querySelector('yawf-config')!.cloneNode(true) as HTMLElement;
  const staticKeys = new Set(
    [...main.querySelectorAll('yawf-rule[id]')]
      .filter((rule) => {
        const tabName = rule.closest('yawf-tab')?.getAttribute('name');
        return tabName === '界面清理' || rule.id === 'about::debug';
      })
      .map((rule) => rule.id),
  );

  //#region 标签页
  ;[...main.querySelectorAll('yawf-tabs')].forEach((tabs) => {
    const tabItems = [...tabs.children].filter((item) => item.matches('yawf-tab'));
    const list = r('div', 'yawf-tab-list');
    const content = r('div', 'yawf-tab-content');
    const tabContainer = r('div', 'yawf-tabs', [list, content]);
    const highlight = (index: number) => {
      const updateHighlight = (item: Element, i: number) =>
        item.classList[i === index ? 'add' : 'remove']('yawf-current');
      ;[...list.children].forEach(updateHighlight);
      ;[...content.children].forEach(updateHighlight);
    };
    tabItems.forEach((tab, index) => {
      const button = list.appendChild(
        r('button', 'yawf-tab-item', [t(tab.getAttribute('name')!)]),
      );
      moveSubTree(content.appendChild(r('div', 'yawf-tab')), tab as HTMLElement);
      button.addEventListener('click', () => highlight(index));
    });
    tabs.parentNode!.replaceChild(tabContainer, tabs);
    highlight(0);
  });
  //#endregion

  //#region 设置读写
  const configManager = new ConfigManager(profileId);
  const getConfig = (key: string) => configManager.get(key);
  let root: HTMLElement | null = null;
  const markDirtyLabel = (key: string) => {
    const label = root?.querySelector(`[data-key="${key}"]`)?.closest('.yawf-rule, label');
    if (label && !label.querySelector('.yawf-dirty-marker')) {
      const marker = document.createElement('span');
      marker.className = 'yawf-dirty-marker';
      marker.textContent = ' *';
      label.appendChild(marker);
    }
  };
  const setConfig = (key: string, newValue: any) => {
    configManager.set(key, newValue);
    invokePageScript('configUpdate', { key, value: newValue });
    if (dirtyStaticKeys && staticKeys.has(key)) {
      dirtyStaticKeys.add(key);
      markDirtyLabel(key);
    }
  };
  //#endregion

  //#region 设置项
  const configs = new Map<string, ConfigItem[]>();

  class ConfigItem {
    key: string;
    dom: HTMLElement;
    defaultValue: any;
    _unsubscribe?: () => void;
    constructor(key: string, dom: HTMLElement, defaultValue: any) {
      this.key = key;
      this.dom = dom;
      this.defaultValue = defaultValue;
      this.initRender(getConfig(this.key));
      if (!configs.has(key)) configs.set(key, []);
      configs.get(key)!.push(this);
      this._unsubscribe = configManager.addChangeListener(key, (nv) => this.onChange(nv));
    }
    get value() {
      return getConfig(this.key);
    }
    set value(newValue: any) {
      setConfig(this.key, newValue);
    }
    initRender(value: any) {
      this.renderValue(value);
    }
    renderValue(_value: any) {}
    onChange(value: any) {
      this.renderValue(value);
    }
    destroy() {
      this._unsubscribe?.();
    }
  }

  class CheckboxConfigItem extends ConfigItem {
    renderValue(value: any) {
      (this.dom as HTMLInputElement).checked = value;
    }
  }

  class SelectConfigItem extends ConfigItem {
    renderValue(value: any) {
      (this.dom as HTMLSelectElement).value = value;
    }
  }

  class StringsConfigItem extends ConfigItem {
    renderValue(value: any) {
      const items = [...this.dom.children].filter((item) =>
        item.matches('.yawf-collection-item'),
      );
      const newItems = Array.isArray(value)
        ? value.map((val: string) => {
            const exist = items.find((i) => (i as HTMLElement).dataset.value === val);
            if (exist) return exist;
            return r('li', 'yawf-collection-item', { 'data-value': val }, [
              r(
                'button',
                'yawf-collection-item-remove',
                { type: 'button', title: '删除', 'data-key': this.key, 'data-value': val },
                [r('i', 'woo-font woo-font--cross')],
              ),
              r('div', 'yawf-collection-item-content', [this.renderItem(val)]),
            ]);
          })
        : [];
      this.dom.innerHTML = '';
      newItems.forEach((item: Node) => this.dom.appendChild(item));
    }
    renderItem(val: string): Node {
      return t(val);
    }
  }

  class UsersConfigItem extends StringsConfigItem {
    renderItem(val: string): Node {
      const itemContainer = r('div', 'yawf-user-item');
      xhr.userInfoById(val).then((user: any) => {
        if (!user) return;
        itemContainer.innerHTML = '';
        itemContainer.append(
          r('img', 'yawf-user-avatar', { src: user.avatar, alt: user.screen_name }),
          r('a', 'yawf-user-name', { href: `/u/${user.idstr}`, target: '_blank' }, [
            r('span', { title: user.screen_name }, [t(user.screen_name)]),
          ]),
        );
      });
      return itemContainer;
    }
  }

  const addStringItem = function (key: string, val: string) {
    const value = val.trim();
    if (!value) return null;
    setConfig(key, (getConfig(key)?.filter((i: string) => i !== value) || []).concat([value]));
    return true;
  };
  const addUserItem = async function (key: string, val: string) {
    const name = val.trim().replace(/^@/, '');
    if (!name) return null;
    const user = await xhr.userInfoByName(name, { immediate: true });
    if (!user) {
      wooDialog({
        type: 'alert',
        message: '找不到该用户',
        btnConfirm: '我知道了',
        title: '添加用户',
      });
      return false;
    }
    const idstr = user.idstr;
    setConfig(key, (getConfig(key)?.filter((i: string) => i !== idstr) || []).concat([idstr]));
    return true;
  };

  // 勾选框
  ;[...main.querySelectorAll('yawf-checkbox')].forEach((checkbox) => {
    const key = checkbox.getAttribute('key')!;
    const defaultValue = checkbox.getAttribute('default') === 'true';
    const label = r('label', 'yawf-checkbox-label', [
      r('span', 'yawf-checkbox-wrap', [
        r('input', 'yawf-checkbox', { 'data-key': key, type: 'checkbox' }),
        r('span', 'yawf-checkbox-icon'),
      ]),
    ]);
    const $input = label.querySelector('input')!;
    const $icon = label.querySelector('.yawf-checkbox-icon')!;
    $icon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="currentColor" d="M0 0v16h16V0H0zm14.398 2.9a.667.667 0 0 1 .523 1.129l-8.686 8.604c-.26.258-.677.258-.937 0L1.408 8.78a.667.667 0 1 1 .939-.947l3.42 3.39 8.215-8.14a.667.667 0 0 1 .416-.182z"></path></svg>';
    moveSubTree(label, checkbox as HTMLElement);
    checkbox.parentNode!.replaceChild(label, checkbox);
    new CheckboxConfigItem(key, $input, defaultValue);
  });

  // 下拉框
  ;[...main.querySelectorAll('yawf-select')].forEach((select) => {
    const key = select.getAttribute('key')!;
    const options = [...select.children].filter((o) => o.matches('yawf-option'));
    const $select = r('select', 'yawf-select', { 'data-key': select.getAttribute('key')! });
    const defaultValue = options.find((o) => o.hasAttribute('default'))?.getAttribute('value');
    options.forEach((opt) => {
      $select.appendChild(
        r('option', 'yawf-option', { value: opt.getAttribute('value')! }, [t(opt.textContent!)]),
      );
    });
    select.parentNode!.replaceChild($select, select);
    new SelectConfigItem(key, $select, defaultValue);
  });

  // 字符串列表和用户列表
  ;[...main.querySelectorAll('yawf-strings, yawf-users')].forEach((strings) => {
    const isUsers = strings.matches('yawf-users');
    const key = strings.getAttribute('key')!;
    const $ul = r(
      'ul',
      'yawf-collection-list yawf-strings-list ' + (isUsers ? 'yawf-users-list' : ''),
      { 'data-key': key },
    );
    strings.parentNode!.replaceChild($ul, strings);
    if (isUsers) new UsersConfigItem(key, $ul, []);
    else new StringsConfigItem(key, $ul, []);
  });
  ;[...main.querySelectorAll('yawf-strings-input, yawf-users-input')].forEach((stringsInput) => {
    const key = stringsInput.getAttribute('key')!;
    const isUsers = stringsInput.matches('yawf-users-input');
    const $form = r(
      'form',
      'yawf-collection-form yawf-strings-form ' + (isUsers ? 'yawf-users-form' : ''),
      { 'data-key': key },
      [
        r('div', 'woo-input-wrap', [
          r('input', 'yawf-collection-input woo-input-main', { type: 'text' }),
        ]),
        r(
          'button',
          'yawf-collection-submit woo-button-main woo-button-line woo-button-primary woo-button-s woo-button-round',
          { type: 'submit' },
          [t('添加')],
        ),
      ],
    );
    stringsInput.parentNode!.replaceChild($form, stringsInput);
  });
  //#endregion

  //#region 界面
  ;[...main.querySelectorAll('yawf-rule')].forEach((rule) => {
    const $rule = rule.parentNode!.replaceChild(
      moveSubTree(r('div', 'yawf-rule'), rule as HTMLElement),
      rule,
    );
    if (rule.className) ($rule as HTMLElement).className += ' ' + rule.className;
  });
  ;[...main.querySelectorAll('yawf-group')].forEach((group) => {
    const name = group.getAttribute('name')!;
    const $group = r('div', 'yawf-group', [
      r('div', 'yawf-group-title', [t(name)]),
      moveSubTree(r('div', 'yawf-group-content'), group as HTMLElement),
    ]);
    if (group.className) $group.className += ' ' + group.className;
    group.parentNode!.replaceChild($group, group);
  });

  // 事件处理
  root = moveSubTree(container.appendChild(r('div', 'yawf-config')), main);

  const handleChange = (e: Event) => {
    const el = e.target as HTMLInputElement;
    const key = el?.dataset?.key;
    if (!key) return;
    if (el.matches('input.yawf-checkbox')) {
      setConfig(key, el.checked);
    } else if (el.matches('select.yawf-select')) {
      setConfig(key, (el as unknown as HTMLSelectElement).value);
    }
  };
  const handleClick = (e: Event) => {
    const el = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    const key = el?.dataset?.key;
    if (!key) return;
    if (el?.matches('button.yawf-collection-item-remove')) {
      const value = el.dataset.value;
      setConfig(key, getConfig(key)?.filter((i: string) => i !== value) || []);
    }
  };
  const handleSubmit = async (e: Event) => {
    const el = e.target as HTMLFormElement;
    const key = el?.dataset?.key;
    if (!key) return;
    if (el.matches('form.yawf-collection-form')) {
      e.preventDefault();
      const input = el.querySelector('input.yawf-collection-input') as HTMLInputElement;
      const isUsers = input.matches('.yawf-users-form input.yawf-collection-input');
      input.disabled = true;
      const addItem = await (isUsers
        ? addUserItem(key, input.value)
        : addStringItem(key, input.value));
      input.disabled = false;
      if (addItem !== false) input.value = '';
      input.focus();
      const autoComplete = input.nextSibling as HTMLElement | null;
      if (autoComplete) autoComplete.innerHTML = '';
    }
  };
  root.addEventListener('change', handleChange);
  root.addEventListener('click', handleClick);
  root.addEventListener('submit', handleSubmit);

  const renderAutoComplete = async (el: HTMLInputElement) => {
    const valueSnapshot = el.value;
    const val = valueSnapshot.trim().replace(/^@/, '').trim();
    const autoComplete = el.nextSibling as HTMLElement;
    const users: any[] = await xhr.searchUsers(val);
    if (el.value !== valueSnapshot) return;
    autoComplete.innerHTML = '';
    const candidates = users.map((user) =>
      autoComplete.appendChild(
        r('div', 'yawf-collection-auto-complete-item', { 'data-value': user.screen_name }, [
          t(user.screen_name),
        ]),
      ),
    );
    candidates[0]?.classList.add('yawf-collection-auto-complete-current');
  };

  root.addEventListener('focusin', (event) => {
    const el = event.target as HTMLElement;
    if (el.matches('.yawf-users-form input.yawf-collection-input')) {
      if (!(el.nextSibling as HTMLElement)?.matches?.('.yawf-collection-auto-complete')) {
        el.parentNode!.insertBefore(r('div', 'yawf-collection-auto-complete'), el.nextSibling);
      }
      renderAutoComplete(el as HTMLInputElement);
    }
  });
  root.addEventListener('focusout', (event) => {
    const el = event.target;
    if (el instanceof HTMLElement && el.matches('.yawf-users-form input.yawf-collection-input')) {
      const autoComplete = el.nextSibling;
      if (
        !(autoComplete instanceof HTMLElement) ||
        !autoComplete.matches('.yawf-collection-auto-complete')
      )
        return;
      autoComplete.parentNode!.removeChild(autoComplete);
    }
  });
  root.addEventListener('input', (event) => {
    const el = event.target;
    if (el instanceof HTMLElement && el.matches('.yawf-users-form input.yawf-collection-input')) {
      const autoComplete = el.nextSibling;
      if (
        !(autoComplete instanceof HTMLElement) ||
        !autoComplete.matches('.yawf-collection-auto-complete')
      )
        return;
      autoComplete.innerHTML = '';
      if (!(event as InputEvent).isComposing) renderAutoComplete(el as HTMLInputElement);
    }
  });
  root.addEventListener('keydown', (event) => {
    const el = event.target;
    if (el instanceof HTMLElement && el.matches('.yawf-users-form input.yawf-collection-input')) {
      const autoComplete = el.nextSibling;
      if (
        !(autoComplete instanceof HTMLElement) ||
        !autoComplete.matches('.yawf-collection-auto-complete')
      )
        return;
      if ((event as KeyboardEvent).isComposing) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const items = [...autoComplete.children].filter((item) =>
          item.matches('.yawf-collection-auto-complete-item'),
        );
        const current = items.find((item) =>
          item.matches('.yawf-collection-auto-complete-current'),
        );
        const currentIndex = items.indexOf(current!);
        if (current) current.classList.remove('yawf-collection-auto-complete-current');
        const next =
          event.key === 'ArrowDown'
            ? currentIndex >= 0 && currentIndex < items.length - 1
              ? currentIndex + 1
              : 0
            : currentIndex > 0 && currentIndex <= items.length - 1
              ? currentIndex - 1
              : items.length - 1;
        items[next].classList.add('yawf-collection-auto-complete-current');
        items[next].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        const current = autoComplete.querySelector(
          '.yawf-collection-auto-complete-current',
        ) as HTMLElement | null;
        if (current) (el as HTMLInputElement).value = current.dataset.value!;
      }
    }
  });
  root.addEventListener('mousemove', (event) => {
    const el = event.target;
    if (el instanceof HTMLElement && el.closest('.yawf-collection-auto-complete-item')) {
      const item = el.closest('.yawf-collection-auto-complete-item')!;
      const list = item.parentNode!;
      const current = list.querySelector('.yawf-collection-auto-complete-current');
      if (item !== current) {
        current?.classList.remove('yawf-collection-auto-complete-current');
        item.classList.add('yawf-collection-auto-complete-current');
      }
    }
  });
  root.addEventListener('mousedown', async (event) => {
    const el = event.target;
    if (el instanceof HTMLElement && el.closest('.yawf-collection-auto-complete-item')) {
      const item = el.closest('.yawf-collection-auto-complete-item') as HTMLElement;
      const list = item.parentNode!;
      const input = (list as HTMLElement).previousSibling as HTMLInputElement;
      const form = input.closest('.yawf-collection-form') as HTMLFormElement;
      const value = item.dataset.value!;
      const key = form.dataset.key!;
      if (input && form) {
        input.disabled = true;
        const addItem = await addUserItem(key, value);
        input.disabled = false;
        if (addItem !== false) input.value = '';
        input.focus();
      }
    }
  });
  //#endregion

  return () => {
    configs.forEach((items) => items.forEach((item) => item.destroy?.()));
    configs.clear();
    configManager.destroy();
  };
};
//#endregion

//#region Module-level variables & exports
const configKey = 'CONFIG';

/**
 * Initialize the content-script side: settings UI, FAB button, and message broker.
 */
export function initContentUI(messageKey: string): void {
  // Verify GM APIs
  try {
    if (typeof GM_getValue !== 'function') throw Error();
    if (typeof GM_setValue !== 'function') throw Error();
    if (typeof GM_addValueChangeListener !== 'function') throw Error();
    if (typeof GM_removeValueChangeListener !== 'function') throw Error();
  } catch {
    alert(
      '脚本需要在页面加载前读取配置，当前猴子环境可能不支持相关功能。请检查你是用的猴子版本是否受到支持。',
    );
  }

  const _contentBroker = new MessageBroker(messageKey + 'PAGE', messageKey + 'CONTENT');
  const invokePageScript = (method: string, data?: any) => _contentBroker.invoke(method, data);
  const handle = (key: string, fn: (data: any) => any) => _contentBroker.handle(key, fn);

  handle('config', ({ profileId }: { profileId: string }) => configDialog(profileId));
  const appReady = new Promise<void>((resolve) => {
    handle('ready', () => resolve());
  });

  const xhr: Record<string, any> = new Proxy(
    {},
    {
      get(_, name: string) {
        return (config: any) => _contentBroker.request('xhr', { name, config });
      },
    },
  );

  const wooDialog = (config: any) => _contentBroker.request('dialog', { config });

  const configDialog = function (profileId: string) {
    let contentDestroy: (() => void) | null = null;
    const dirtyStaticKeys = new Set<string>();
    try {
      uiDialog({
        id: 'yawf-config',
        title: '药方 (YAWF) 设置',
        render: (inner) => {
          contentDestroy = renderConfig(
            inner,
            profileId,
            CONFIG_TEMPLATE,
            dirtyStaticKeys,
            invokePageScript,
            xhr,
            wooDialog,
          );
        },
        onHide() {
          contentDestroy?.();
          if (dirtyStaticKeys.size > 0) {
            const toast = document.createElement('div');
            toast.className = 'yawf-refresh-toast';
            const msg = document.createElement('span');
            msg.textContent = '部分设置需要刷新页面后生效';
            toast.appendChild(msg);
            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'yawf-refresh-toast-btn';
            refreshBtn.textContent = '立即刷新';
            refreshBtn.addEventListener('click', () => location.reload());
            toast.appendChild(refreshBtn);
            const closeBtn = document.createElement('button');
            closeBtn.className = 'yawf-refresh-toast-close';
            closeBtn.textContent = '✕';
            closeBtn.addEventListener('click', () => toast.remove());
            toast.appendChild(closeBtn);
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 8000);
          }
        },
      }).show();
    } catch (e) {
      console.log('Error while showing rule dialog %o', e);
    }
  };

  // FAB button
  appReady.then(() => {
    const fab = document.createElement('button');
    fab.id = 'yawf-fab';
    fab.title = '药方 (YAWF) 设置';
    fab.setAttribute('aria-label', '药方 (YAWF) 设置');
    fab.textContent = '⚙';
    fab.addEventListener('click', () => {
      const profileId = (unsafeWindow as any).$CONFIG?.user?.idstr;
      if (profileId) configDialog(profileId);
    });
    document.body.appendChild(fab);
  });
}

