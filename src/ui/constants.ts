/**
 * Cleanup configuration groups for the settings UI.
 * Single source of truth for content-script side (ConfigPanel + SettingsApp).
 *
 * NOTE: page/index.ts has its own `cleanupKeys` array because the page script
 * cannot import modules. Keep both in sync when adding/removing keys.
 */

export interface CleanupItem {
  key: string
  label: string
}

export interface CleanupGroup {
  title: string
  items: CleanupItem[]
}

export const CLEANUP_GROUPS: CleanupGroup[] = [
  {
    title: '顶栏',
    items: [
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
    ],
  },
  {
    title: '左侧栏',
    items: [
      { key: 'cleanup::leftNavSpecial', label: '特别关注' },
      { key: 'cleanup::leftNavMutual', label: '好友圈' },
      { key: 'cleanup::leftNavCustomGroups', label: '自定义分组' },
    ],
  },
  {
    title: '右侧栏',
    items: [
      { key: 'cleanup::hotSearch', label: '热搜' },
      { key: 'cleanup::searchTop', label: '热搜置顶' },
      { key: 'cleanup::interested', label: '可能感兴趣的人' },
      { key: 'cleanup::creatorCenter', label: '创作者中心' },
      { key: 'cleanup::sideFooter', label: '底部链接' },
      { key: 'cleanup::service', label: '常用功能' },
      { key: 'cleanup::followRecom', label: '关注推荐' },
    ],
  },
  {
    title: '微博内容',
    items: [
      { key: 'cleanup::feedEmptyTip', label: '已刷完提示' },
      { key: 'cleanup::feedSource', label: '来源' },
      { key: 'cleanup::feedFollow', label: '关注按钮' },
      { key: 'cleanup::feedQr', label: '分享二维码' },
      { key: 'cleanup::feedRetweet', label: '转发' },
      { key: 'cleanup::feedLike', label: '点赞' },
      { key: 'cleanup::translate', label: '翻译' },
    ],
  },
  {
    title: '图标',
    items: [
      { key: 'cleanup::iconVerify', label: '红橙黄蓝V' },
      { key: 'cleanup::iconVip', label: 'VIP' },
      { key: 'cleanup::iconFans', label: '铁粉钻粉' },
      { key: 'cleanup::iconOther', label: '其他' },
    ],
  },
  {
    title: '个人主页',
    items: [{ key: 'cleanup::profileHeader', label: '顶图' }],
  },
  {
    title: '其他',
    items: [{ key: 'cleanup::ad', label: '广告' }],
  },
]

/** Keys that require page reload when changed. */
export const STATIC_KEYS = new Set([
  ...CLEANUP_GROUPS.flatMap((g) => g.items.map((i) => i.key)),
  'about::debug',
])
