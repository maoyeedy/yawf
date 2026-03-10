<script lang="ts">
  import type { ConfigManager } from '../configManager';

  interface Props {
    key: string;
    label: string;
    configManager: ConfigManager;
    onchange?: (key: string, value: boolean) => void;
  }

  let { key, label, configManager, onchange }: Props = $props();

  let checked = $state(false);

  $effect(() => {
    checked = configManager.get(key) ?? false;
    const unsub = configManager.addChangeListener(key, (v) => {
      checked = v ?? false;
    });
    return unsub;
  });

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    checked = target.checked;
    configManager.set(key, checked);
    onchange?.(key, checked);
  }
</script>

<label class="yawf-checkbox-label">
  <span class="yawf-checkbox-wrap">
    <input
      class="yawf-checkbox"
      type="checkbox"
      data-key={key}
      {checked}
      onchange={handleChange}
    />
    <span class="yawf-checkbox-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M0 0v16h16V0H0zm14.398 2.9a.667.667 0 0 1 .523 1.129l-8.686 8.604c-.26.258-.677.258-.937 0L1.408 8.78a.667.667 0 1 1 .939-.947l3.42 3.39 8.215-8.14a.667.667 0 0 1 .416-.182z"></path>
      </svg>
    </span>
  </span>
  {label}
</label>
