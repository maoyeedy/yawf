<script lang="ts">
  import { type ConfigManager } from '../configManager';
  import { STATIC_KEYS } from '../SettingsApp.svelte';
  import Tabs from './Tabs.svelte';
  import ConfigCheckbox from './ConfigCheckbox.svelte';
  import StringsList from './StringsList.svelte';
  import UsersList from './UsersList.svelte';

  /* eslint-disable @typescript-eslint/no-explicit-any */

  interface Props {
    configManager: ConfigManager;
    invokePageScript: (method: string, data?: any) => void;
    xhr: Record<string, any>;
    wooDialog: (config: any) => Promise<unknown>;
    dirtyStaticKeys: Set<string>;
  }

  let { configManager, invokePageScript, xhr, wooDialog, dirtyStaticKeys }: Props = $props();

  const tabs = [
    { name: '微博过滤' },
    { name: '界面清理' },
    { name: '关于' },
  ];

  let activeTab = $state(0);

  let dirtyKeys = $state(new Set<string>());

  function handleConfigChange(key: string, value: any) {
    invokePageScript('configUpdate', { key, value });
    if (STATIC_KEYS.has(key)) {
      dirtyKeys = new Set([...dirtyKeys, key]);
      dirtyStaticKeys.add(key);
    }
  }
</script>

<div class="yawf-config">
  <Tabs {tabs} bind:activeIndex={activeTab}>
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
                onchange={handleConfigChange}
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
                onchange={handleConfigChange}
              />
              <p>此处的作者会被应用于微博的作者、转发原作者、共著作者等用户。</p>
            </div>
          </div>
        </div>

      {:else if tabIndex === 1}
        <!-- 界面清理 -->
        <div class="yawf-group yawf-compact-group">
          <div class="yawf-group-title">顶栏</div>
          <div class="yawf-group-content">
            {#each [
              { key: 'cleanup::navHome', label: '首页' },
              { key: 'cleanup::navHot', label: '推荐' },
              { key: 'cleanup::navTv', label: '视频' },
              { key: 'cleanup::navMessage', label: '消息' },
              { key: 'cleanup::navProfile', label: '个人主页' },
              { key: 'cleanup::navAvatar', label: '头像' },
              { key: 'cleanup::navGame', label: '游戏' },
              { key: 'cleanup::navDarkMode', label: '日/夜模式' },
              { key: 'cleanup::navAria', label: '无障碍' },
              { key: 'cleanup::navLogo', label: 'Logo' },
            ] as item}
              <div class="yawf-rule">
                <ConfigCheckbox
                  key={item.key}
                  label={item.label}
                  {configManager}
                  onchange={handleConfigChange}
                />
                {#if dirtyKeys.has(item.key)}<span class="yawf-dirty-marker"> *</span>{/if}
              </div>
            {/each}
          </div>
        </div>

        <div class="yawf-group yawf-compact-group">
          <div class="yawf-group-title">左侧栏</div>
          <div class="yawf-group-content">
            {#each [
              { key: 'cleanup::leftNavSpecial', label: '特别关注' },
              { key: 'cleanup::leftNavMutual', label: '好友圈' },
              { key: 'cleanup::leftNavCustomGroups', label: '自定义分组' },
            ] as item}
              <div class="yawf-rule">
                <ConfigCheckbox
                  key={item.key}
                  label={item.label}
                  {configManager}
                  onchange={handleConfigChange}
                />
                {#if dirtyKeys.has(item.key)}<span class="yawf-dirty-marker"> *</span>{/if}
              </div>
            {/each}
          </div>
        </div>

        <div class="yawf-group yawf-compact-group">
          <div class="yawf-group-title">右侧栏</div>
          <div class="yawf-group-content">
            {#each [
              { key: 'cleanup::hotSearch', label: '热搜' },
              { key: 'cleanup::searchTop', label: '热搜置顶' },
              { key: 'cleanup::interested', label: '可能感兴趣的人' },
              { key: 'cleanup::creatorCenter', label: '创作者中心' },
              { key: 'cleanup::sideFooter', label: '底部链接' },
              { key: 'cleanup::service', label: '常用功能' },
              { key: 'cleanup::followRecom', label: '关注推荐' },
            ] as item}
              <div class="yawf-rule">
                <ConfigCheckbox
                  key={item.key}
                  label={item.label}
                  {configManager}
                  onchange={handleConfigChange}
                />
                {#if dirtyKeys.has(item.key)}<span class="yawf-dirty-marker"> *</span>{/if}
              </div>
            {/each}
          </div>
        </div>

        <div class="yawf-group yawf-compact-group">
          <div class="yawf-group-title">微博内容</div>
          <div class="yawf-group-content">
            {#each [
              { key: 'cleanup::feedEmptyTip', label: '已刷完提示' },
              { key: 'cleanup::feedSource', label: '来源' },
              { key: 'cleanup::feedFollow', label: '关注按钮' },
              { key: 'cleanup::feedQr', label: '分享二维码' },
              { key: 'cleanup::feedRetweet', label: '转发' },
              { key: 'cleanup::feedLike', label: '点赞' },
              { key: 'cleanup::translate', label: '翻译' },
            ] as item}
              <div class="yawf-rule">
                <ConfigCheckbox
                  key={item.key}
                  label={item.label}
                  {configManager}
                  onchange={handleConfigChange}
                />
                {#if dirtyKeys.has(item.key)}<span class="yawf-dirty-marker"> *</span>{/if}
              </div>
            {/each}
          </div>
        </div>

        <div class="yawf-group yawf-compact-group">
          <div class="yawf-group-title">图标</div>
          <div class="yawf-group-content">
            {#each [
              { key: 'cleanup::iconVerify', label: '红橙黄蓝V' },
              { key: 'cleanup::iconVip', label: 'VIP' },
              { key: 'cleanup::iconFans', label: '铁粉钻粉' },
              { key: 'cleanup::iconOther', label: '其他' },
            ] as item}
              <div class="yawf-rule">
                <ConfigCheckbox
                  key={item.key}
                  label={item.label}
                  {configManager}
                  onchange={handleConfigChange}
                />
                {#if dirtyKeys.has(item.key)}<span class="yawf-dirty-marker"> *</span>{/if}
              </div>
            {/each}
          </div>
        </div>

        <div class="yawf-group yawf-compact-group">
          <div class="yawf-group-title">个人主页</div>
          <div class="yawf-group-content">
            <div class="yawf-rule">
              <ConfigCheckbox
                key="cleanup::profileHeader"
                label="顶图"
                {configManager}
                onchange={handleConfigChange}
              />
              {#if dirtyKeys.has('cleanup::profileHeader')}<span class="yawf-dirty-marker"> *</span>{/if}
            </div>
          </div>
        </div>

        <div class="yawf-group yawf-compact-group">
          <div class="yawf-group-title">其他</div>
          <div class="yawf-group-content">
            <div class="yawf-rule">
              <ConfigCheckbox
                key="cleanup::ad"
                label="广告"
                {configManager}
                onchange={handleConfigChange}
              />
              {#if dirtyKeys.has('cleanup::ad')}<span class="yawf-dirty-marker"> *</span>{/if}
            </div>
          </div>
        </div>

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
                onchange={handleConfigChange}
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
