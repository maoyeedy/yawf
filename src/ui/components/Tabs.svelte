<script lang="ts">
  interface TabDef {
    name: string;
  }

  interface Props {
    tabs: TabDef[];
    activeIndex?: number;
    onchange?: (index: number) => void;
    children: import('svelte').Snippet<[number]>;
  }

  let { tabs, activeIndex = $bindable(0), onchange, children }: Props = $props();

  function selectTab(index: number) {
    activeIndex = index;
    onchange?.(index);
  }
</script>

<div class="yawf-tabs">
  <div class="yawf-tab-list">
    {#each tabs as tab, i}
      <button
        class="yawf-tab-item"
        class:yawf-current={i === activeIndex}
        onclick={() => selectTab(i)}
      >
        {tab.name}
      </button>
    {/each}
  </div>
  <div class="yawf-tab-content">
    {#each tabs as _, i}
      <div class="yawf-tab" class:yawf-current={i === activeIndex}>
        {@render children(i)}
      </div>
    {/each}
  </div>
</div>
