<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    id: string;
    title: string;
    onhide?: () => void;
    onshow?: () => void;
    children: Snippet;
    buttons?: Snippet;
    onok?: (() => void) | null;
    oncancel?: (() => void) | null;
  }

  let {
    id,
    title,
    onhide,
    onshow,
    children,
    buttons,
    onok = null,
    oncancel = null,
  }: Props = $props();

  let dialog: HTMLElement | undefined = $state();
  let visible = $state(false);
  let leaving = $state(false);
  let lastPos = $state({ x: 0, y: 0 });

  function setPos(pos: { x: number; y: number }) {
    if (!dialog) return;
    const left = Math.min(Math.max(0, pos.x), document.body.clientWidth - dialog.clientWidth - 2);
    const top = Math.min(Math.max(0, pos.y), document.body.clientHeight - dialog.clientHeight - 2);
    lastPos = { x: left, y: top };
  }

  function resetPos() {
    setPos(lastPos);
  }

  let dragging = $state(false);
  let mouseStart = { x: 0, y: 0 };

  function onMouseDown(e: MouseEvent) {
    mouseStart = { x: e.screenX - lastPos.x, y: e.screenY - lastPos.y };
    dragging = true;
    const onMouseMove = (ev: MouseEvent) => {
      setPos({ x: ev.screenX - mouseStart.x, y: ev.screenY - mouseStart.y });
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      dragging = false;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function hide() {
    onhide?.();
    leaving = true;
    document.removeEventListener('scroll', resetPos);
    window.removeEventListener('resize', resetPos);
    setTimeout(() => {
      visible = false;
      leaving = false;
    }, 200);
  }

  function handleClose() {
    hide();
  }

  function handleMask() {
    hide();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!event.isTrusted) return;
    if (event.key === 'Enter' && onok) onok();
    else if (event.key === 'Escape') {
      (oncancel ?? hide)();
    } else return;
    event.stopPropagation();
    event.preventDefault();
  }

  export function show(pos?: { x?: number; y?: number }) {
    visible = true;
    leaving = false;
    const x = pos?.x ?? (window.innerWidth - 820) / 2;
    const y = pos?.y ?? (window.innerHeight - 520) / 2;
    // Need to wait for DOM to render before setting position
    setTimeout(() => {
      setPos({ x, y });
      document.addEventListener('scroll', resetPos);
      window.addEventListener('resize', resetPos);
      onshow?.();
    }, 0);
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="woo-box-flex woo-box-alignCenter woo-box-justifyCenter woo-modal-wrap"
    class:woo-modal-an--pop-enter={!leaving}
    class:woo-modal-an--pop-leave-to={leaving}
    onkeydown={handleKeydown}
  >
    <div
      bind:this={dialog}
      {id}
      class="woo-modal-main yawf-dialog"
      class:yawf-drag={dragging}
      style="left: {lastPos.x}px; top: {lastPos.y}px"
    >
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <i class="woo-font woo-font--cross yawf-dialog-close" title="关闭" onclick={handleClose}></i>
      <div
        class="woo-box-flex woo-box-column woo-box-alignCenter woo-dialog-main"
        aria-modal="true"
        tabindex="0"
        role="alertdialog"
      >
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="woo-dialog-title yawf-dialog-title woo-dialog-bar" onmousedown={onMouseDown}>
          {title}
        </div>
        <div class="woo-dialog-body yawf-dialog-content">
          {@render children()}
        </div>
        {#if onok || oncancel}
          <div class="woo-dialog-ctrl yawf-dialog-buttons">
            {#if oncancel}
              <button
                class="woo-button-main woo-button-line woo-button-default woo-button-m woo-button-round woo-dialog-btn yawf-dialog-button-cancel"
                onclick={oncancel}
              >
                <span class="woo-button-wrap"><span class="woo-button-content">取消</span></span>
              </button>
            {/if}
            {#if onok}
              <button
                class="woo-button-main woo-button-flat woo-button-primary woo-button-m woo-button-round woo-dialog-btn yawf-dialog-button-ok"
                onclick={onok}
              >
                <span class="woo-button-wrap"><span class="woo-button-content">确定</span></span>
              </button>
            {/if}
          </div>
        {/if}
        {#if buttons}
          {@render buttons()}
        {/if}
      </div>
    </div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="woo-modal-mask yawf-dialog-mask" onclick={handleMask}></div>
  </div>
{/if}
