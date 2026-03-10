<script lang="ts">
import type { ConfigManager } from '../configManager'

interface Props {
  key: string
  configManager: ConfigManager
  onchange?: (key: string, value: string[]) => void
}

let { key, configManager, onchange }: Props = $props()

let items: string[] = $state([])
let inputValue = $state('')
let inputDisabled = $state(false)

$effect(() => {
  items = configManager.get(key) ?? []
  const unsub = configManager.addChangeListener(key, (v) => {
    items = Array.isArray(v) ? v : []
  })
  return unsub
})

function removeItem(val: string) {
  const updated = items.filter((i) => i !== val)
  configManager.set(key, updated)
  onchange?.(key, updated)
}

function addItem(e: SubmitEvent) {
  e.preventDefault()
  const val = inputValue.trim()
  if (!val) return
  const updated = items.filter((i) => i !== val).concat([val])
  configManager.set(key, updated)
  onchange?.(key, updated)
  inputValue = ''
}
</script>

<div>
  <form class="yawf-collection-form yawf-strings-form" data-key={key} onsubmit={addItem}>
    <div class="woo-input-wrap">
      <input
        class="yawf-collection-input woo-input-main"
        type="text"
        bind:value={inputValue}
        disabled={inputDisabled}
      />
    </div>
    <button
      class="yawf-collection-submit woo-button-main woo-button-line woo-button-primary woo-button-s woo-button-round"
      type="submit"
    >
      添加
    </button>
  </form>
</div>
<ul class="yawf-collection-list yawf-strings-list" data-key={key}>
  {#each items as item (item)}
    <li class="yawf-collection-item" data-value={item}>
      <button
        class="yawf-collection-item-remove"
        type="button"
        title="删除"
        onclick={() => removeItem(item)}
      >
        <i class="woo-font woo-font--cross"></i>
      </button>
      <div class="yawf-collection-item-content">{item}</div>
    </li>
  {/each}
</ul>
