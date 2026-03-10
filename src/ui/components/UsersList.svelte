<script lang="ts">
  import type { ConfigManager } from '../configManager';

  /* eslint-disable @typescript-eslint/no-explicit-any */

  interface UserInfo {
    idstr: string;
    screen_name: string;
    avatar: string;
  }

  interface Props {
    key: string;
    configManager: ConfigManager;
    xhr: Record<string, any>;
    wooDialog: (config: any) => Promise<unknown>;
    onchange?: (key: string, value: string[]) => void;
  }

  let { key, configManager, xhr, wooDialog, onchange }: Props = $props();

  let items: string[] = $state([]);
  let userInfoMap: Record<string, UserInfo> = $state({});
  let inputValue = $state('');
  let inputDisabled = $state(false);
  let autoCompleteItems: Array<{ screen_name: string }> = $state([]);
  let autoCompleteVisible = $state(false);
  let autoCompleteIndex = $state(-1);
  let inputEl: HTMLInputElement | undefined = $state();
  let autoCompleteEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    items = configManager.get(key) ?? [];
    const unsub = configManager.addChangeListener(key, (v) => {
      items = Array.isArray(v) ? v : [];
    });
    return unsub;
  });

  // Fetch user info for all items
  $effect(() => {
    for (const idstr of items) {
      if (!userInfoMap[idstr]) {
        xhr.userInfoById(idstr).then((user: UserInfo | null) => {
          if (user) {
            userInfoMap = { ...userInfoMap, [idstr]: user };
          }
        });
      }
    }
  });

  function removeItem(val: string) {
    const updated = items.filter((i) => i !== val);
    configManager.set(key, updated);
    onchange?.(key, updated);
  }

  async function addUser(name: string) {
    const trimmed = name.trim().replace(/^@/, '');
    if (!trimmed) return;
    inputDisabled = true;
    try {
      const user: UserInfo | null = await xhr.userInfoByName(trimmed, { immediate: true });
      if (!user) {
        wooDialog({
          type: 'alert',
          message: '找不到该用户',
          btnConfirm: '我知道了',
          title: '添加用户',
        });
        return;
      }
      const idstr = user.idstr;
      const updated = items.filter((i) => i !== idstr).concat([idstr]);
      configManager.set(key, updated);
      onchange?.(key, updated);
      inputValue = '';
    } finally {
      inputDisabled = false;
      inputEl?.focus();
    }
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const current = autoCompleteItems[autoCompleteIndex];
    if (current) {
      addUser(current.screen_name);
    } else {
      addUser(inputValue);
    }
    autoCompleteVisible = false;
    autoCompleteItems = [];
  }

  async function fetchAutoComplete() {
    const val = inputValue.trim().replace(/^@/, '').trim();
    if (!val) {
      autoCompleteItems = [];
      return;
    }
    const snapshot = inputValue;
    const users: any[] = await xhr.searchUsers(val);
    if (inputValue !== snapshot) return;
    autoCompleteItems = users;
    autoCompleteIndex = users.length > 0 ? 0 : -1;
  }

  function handleFocus() {
    autoCompleteVisible = true;
    fetchAutoComplete();
  }

  function handleBlur() {
    // Delay to allow click on autocomplete items
    setTimeout(() => {
      autoCompleteVisible = false;
    }, 200);
  }

  function handleInput() {
    autoCompleteItems = [];
    fetchAutoComplete();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!autoCompleteVisible || autoCompleteItems.length === 0) return;
    if (event.isComposing) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      autoCompleteIndex = (autoCompleteIndex + 1) % autoCompleteItems.length;
      scrollCurrentIntoView();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      autoCompleteIndex = (autoCompleteIndex - 1 + autoCompleteItems.length) % autoCompleteItems.length;
      scrollCurrentIntoView();
    } else if (event.key === 'Enter' && autoCompleteIndex >= 0) {
      inputValue = autoCompleteItems[autoCompleteIndex].screen_name;
    }
  }

  function scrollCurrentIntoView() {
    if (!autoCompleteEl) return;
    const items = autoCompleteEl.querySelectorAll('.yawf-collection-auto-complete-item');
    items[autoCompleteIndex]?.scrollIntoView({ block: 'nearest' });
  }

  function selectAutoComplete(screenName: string) {
    addUser(screenName);
    autoCompleteVisible = false;
    autoCompleteItems = [];
  }
</script>

<div>
  <form class="yawf-collection-form yawf-users-form" data-key={key} onsubmit={handleSubmit}>
    <div class="woo-input-wrap" style="position: relative;">
      <input
        bind:this={inputEl}
        class="yawf-collection-input woo-input-main"
        type="text"
        bind:value={inputValue}
        disabled={inputDisabled}
        onfocus={handleFocus}
        onblur={handleBlur}
        oninput={handleInput}
        onkeydown={handleKeydown}
      />
      {#if autoCompleteVisible && autoCompleteItems.length > 0}
        <div bind:this={autoCompleteEl} class="yawf-collection-auto-complete">
          {#each autoCompleteItems as acItem, i}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="yawf-collection-auto-complete-item"
              class:yawf-collection-auto-complete-current={i === autoCompleteIndex}
              data-value={acItem.screen_name}
              onmouseenter={() => (autoCompleteIndex = i)}
              onmousedown={(e) => { e.preventDefault(); selectAutoComplete(acItem.screen_name); }}
            >
              {acItem.screen_name}
            </div>
          {/each}
        </div>
      {/if}
    </div>
    <button
      class="yawf-collection-submit woo-button-main woo-button-line woo-button-primary woo-button-s woo-button-round"
      type="submit"
    >
      添加
    </button>
  </form>
</div>
<ul class="yawf-collection-list yawf-strings-list yawf-users-list" data-key={key}>
  {#each items as idstr (idstr)}
    <li class="yawf-collection-item" data-value={idstr}>
      <button
        class="yawf-collection-item-remove"
        type="button"
        title="删除"
        onclick={() => removeItem(idstr)}
      >
        <i class="woo-font woo-font--cross"></i>
      </button>
      <div class="yawf-collection-item-content">
        {#if userInfoMap[idstr]}
          <div class="yawf-user-item">
            <img class="yawf-user-avatar" src={userInfoMap[idstr].avatar} alt={userInfoMap[idstr].screen_name} />
            <a class="yawf-user-name" href="/u/{idstr}" target="_blank">
              <span title={userInfoMap[idstr].screen_name}>{userInfoMap[idstr].screen_name}</span>
            </a>
          </div>
        {:else}
          <div class="yawf-user-item">{idstr}</div>
        {/if}
      </div>
    </li>
  {/each}
</ul>
