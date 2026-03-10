<script lang="ts" module>
  /* eslint-disable @typescript-eslint/no-explicit-any */

  /** Keys that require page reload when changed (shared constant) */
  export const STATIC_KEYS = new Set([
    'cleanup::navHome', 'cleanup::navHot', 'cleanup::navTv', 'cleanup::navMessage',
    'cleanup::navProfile', 'cleanup::navAvatar', 'cleanup::navGame', 'cleanup::navDarkMode',
    'cleanup::navAria', 'cleanup::navLogo',
    'cleanup::leftNavSpecial', 'cleanup::leftNavMutual', 'cleanup::leftNavCustomGroups',
    'cleanup::hotSearch', 'cleanup::searchTop', 'cleanup::interested',
    'cleanup::creatorCenter', 'cleanup::sideFooter', 'cleanup::service', 'cleanup::followRecom',
    'cleanup::feedEmptyTip', 'cleanup::feedSource', 'cleanup::feedFollow', 'cleanup::feedQr',
    'cleanup::feedRetweet', 'cleanup::feedLike', 'cleanup::translate',
    'cleanup::iconVerify', 'cleanup::iconVip', 'cleanup::iconFans', 'cleanup::iconOther',
    'cleanup::profileHeader', 'cleanup::ad',
    'about::debug',
  ]);
</script>

<script lang="ts">
  import { unsafeWindow } from '$';
  import { ConfigManager } from './configManager';
  import Dialog from './components/Dialog.svelte';
  import ConfigPanel from './components/ConfigPanel.svelte';
  import RefreshToast from './components/RefreshToast.svelte';
  import Fab from './components/Fab.svelte';

  interface Props {
    invokePageScript: (method: string, data?: any) => void;
    xhr: Record<string, any>;
    wooDialog: (config: any) => Promise<unknown>;
    appReady: Promise<void>;
  }

  let { invokePageScript, xhr, wooDialog, appReady }: Props = $props();

  let dialogComponent: ReturnType<typeof Dialog> | undefined = $state();
  let toastComponent: ReturnType<typeof RefreshToast> | undefined = $state();
  let configManager: ConfigManager | null = $state(null);
  let dirtyStaticKeys = $state(new Set<string>());
  let showFab = $state(false);

  $effect(() => {
    appReady.then(() => {
      showFab = true;
    });
  });

  export function openConfig() {
    const profileId = (unsafeWindow as any)?.$CONFIG?.user?.idstr;
    if (!profileId) return;
    configManager = new ConfigManager(profileId);
    dirtyStaticKeys = new Set<string>();
    dialogComponent?.show();
  }

  function onDialogHide() {
    if (dirtyStaticKeys.size > 0) {
      toastComponent?.show();
    }
    configManager?.destroy();
    configManager = null;
  }
</script>

<Dialog
  bind:this={dialogComponent}
  id="yawf-config"
  title="药方 (YAWF) 设置"
  onhide={onDialogHide}
>
  {#if configManager}
    <ConfigPanel
      {configManager}
      {invokePageScript}
      {xhr}
      {wooDialog}
      {dirtyStaticKeys}
    />
  {/if}
</Dialog>

<RefreshToast bind:this={toastComponent} />

{#if showFab}
  <Fab onclick={openConfig} />
{/if}
