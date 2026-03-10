<script lang="ts">
  let visible = $state(false);

  export function show() {
    visible = true;
  }

  function refresh() {
    location.reload();
  }

  function close() {
    visible = false;
  }

  $effect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        visible = false;
      }, 8000);
      return () => clearTimeout(timer);
    }
  });
</script>

{#if visible}
  <div class="yawf-refresh-toast">
    <span>部分设置需要刷新页面后生效</span>
    <button class="yawf-refresh-toast-btn" onclick={refresh}>立即刷新</button>
    <button class="yawf-refresh-toast-close" onclick={close}>✕</button>
  </div>
{/if}
