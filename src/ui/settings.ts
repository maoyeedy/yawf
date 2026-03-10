import { GM_getValue, GM_setValue, GM_addValueChangeListener, GM_removeValueChangeListener } from '$';
import { mount } from 'svelte';
import { MessageBroker } from '../shared/broker';
import SettingsApp from './SettingsApp.svelte';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Initialize the content-script side: settings UI, FAB button, and message broker.
 * Now uses Svelte components instead of manual DOM manipulation.
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

  // Mount Svelte app once document.body is available.
  // At document-start, body may be null, so defer if needed.
  const mountApp = () => {
    const appContainer = document.createElement('div');
    appContainer.id = 'yawf-app';
    document.body.appendChild(appContainer);

    const app = mount(SettingsApp, {
      target: appContainer,
      props: {
        invokePageScript,
        xhr,
        wooDialog,
        appReady,
      },
    });

    // The page-script can request opening the config dialog via IPC.
    handle('config', () => {
      app.openConfig();
    });
  };

  if (document.body) {
    mountApp();
  } else {
    document.addEventListener('DOMContentLoaded', mountApp);
  }
}

