<script lang="ts">
import { unsafeWindow } from '$'
import ConfigPanel from './components/ConfigPanel.svelte'
import Dialog from './components/Dialog.svelte'
import Fab from './components/Fab.svelte'
import RefreshToast from './components/RefreshToast.svelte'
import { ConfigManager } from './configManager'
import { STATIC_KEYS } from './constants'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  invokePageScript: (method: string, data?: any) => void
  xhr: Record<string, any>
  wooDialog: (config: any) => Promise<unknown>
  appReady: Promise<void>
}

let { invokePageScript, xhr, wooDialog, appReady }: Props = $props()

let dialogComponent: ReturnType<typeof Dialog> | undefined = $state()
let toastComponent: ReturnType<typeof RefreshToast> | undefined = $state()
let configManager: ConfigManager | null = $state(null)
let dirtyKeys = $state(new Set<string>())
let showFab = $state(false)

$effect(() => {
  appReady.then(() => {
    showFab = true
  })
})

export function openConfig() {
  const profileId = (unsafeWindow as any)?.$CONFIG?.user?.idstr
  if (!profileId) return
  configManager = new ConfigManager(profileId)
  dirtyKeys = new Set<string>()
  dialogComponent?.show()
}

function onDialogHide() {
  if (dirtyKeys.size > 0) {
    toastComponent?.show()
  }
  configManager?.destroy()
  configManager = null
}

function handleConfigChange(key: string, value: any) {
  invokePageScript('configUpdate', { key, value })
  if (STATIC_KEYS.has(key)) {
    dirtyKeys = new Set([...dirtyKeys, key])
  }
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
      {xhr}
      {wooDialog}
      {dirtyKeys}
      onchange={handleConfigChange}
    />
  {/if}
</Dialog>

<RefreshToast bind:this={toastComponent} />

{#if showFab}
  <Fab onclick={openConfig} />
{/if}
