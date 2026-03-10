<script lang="ts">
import { type ConfigManager } from '../configManager'
import { CLEANUP_GROUPS } from '../constants'
import ConfigCheckbox from './ConfigCheckbox.svelte'
import StringsList from './StringsList.svelte'
import Tabs from './Tabs.svelte'
import UsersList from './UsersList.svelte'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  configManager: ConfigManager
  xhr: Record<string, any>
  wooDialog: (config: any) => Promise<unknown>
  dirtyKeys: Set<string>
  onchange: (key: string, value: any) => void
}

let { configManager, xhr, wooDialog, dirtyKeys, onchange }: Props = $props()

let activeTab = $state(0)
</script>

<div class="yawf-config">
  <Tabs tabs={[{ name: '微博过滤' }, { name: '界面清理' }, { name: '关于' }]} bind:activeIndex={activeTab}>
    {#snippet children(tabIndex)}
      {#if tabIndex === 0}
        <!-- 微博过滤 -->
        <div class="yawf-group">
          <div class="yawf-group-title">过滤规则</div>
          <div class="yawf-group-content">
            <div class="yawf-rule">
              <div>关键字</div>
              <StringsList
                key="filter::keywords"
                {configManager}
                onchange={onchange}
              />
              <p>此处的关键字会被应用于微博和评论，关键字会匹配全文，包括话题和@的用户。</p>
            </div>
            <div class="yawf-rule">
              <div>作者</div>
              <UsersList
                key="filter::authors"
                {configManager}
                {xhr}
                {wooDialog}
                onchange={onchange}
              />
              <p>此处的作者会被应用于微博的作者、转发原作者、共著作者等用户。</p>
            </div>
          </div>
        </div>

      {:else if tabIndex === 1}
        <!-- 界面清理 -->
        {#each CLEANUP_GROUPS as group}
          <div class="yawf-group yawf-compact-group">
            <div class="yawf-group-title">{group.title}</div>
            <div class="yawf-group-content">
              {#each group.items as item}
                <div class="yawf-rule">
                  <ConfigCheckbox
                    key={item.key}
                    label={item.label}
                    {configManager}
                    onchange={onchange}
                  />
                  {#if dirtyKeys.has(item.key)}<span class="yawf-dirty-marker"> *</span>{/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}

      {:else if tabIndex === 2}
        <!-- 关于 -->
        <div class="yawf-group">
          <div class="yawf-group-title">调试</div>
          <div class="yawf-group-content">
            <div class="yawf-rule">
              <ConfigCheckbox
                key="about::debug"
                label="启用调试"
                {configManager}
                onchange={onchange}
              />
              {#if dirtyKeys.has('about::debug')}<span class="yawf-dirty-marker"> *</span>{/if}
            </div>
          </div>
        </div>

        <div class="yawf-group">
          <div class="yawf-group-title">关于</div>
          <div class="yawf-group-content">
            <div class="yawf-rule">
              <p>yyawf 目前正在开发中，欢迎贡献代码</p>
              <p>Licensed under MPL-2.0</p>
            </div>
          </div>
        </div>
      {/if}
    {/snippet}
  </Tabs>
</div>
