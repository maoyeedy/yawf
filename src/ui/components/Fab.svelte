<script lang="ts">
interface Props {
  onclick: () => void
}

let { onclick }: Props = $props()
</script>

<button
  id="yawf-fab"
  title="药方 (YAWF) 设置"
  aria-label="药方 (YAWF) 设置"
  {onclick}
>
  ⚙
</button>
