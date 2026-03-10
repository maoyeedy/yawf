// yyawf shared type definitions

export interface User {
  idstr: string
  screen_name: string
  avatar?: string
}

export interface Feed {
  idstr: string
  text_raw?: string
  text?: string
  content_auth?: number
  user?: User
  retweeted_status?: Feed
  cooperate_info?: {
    cooperate_user_list?: Array<{ idstr?: string }>
  }
  title_source?: { name?: string }
  title?: { text?: string }
  source?: string
}

export interface Comment {
  idstr: string
  text_raw?: string
  text?: string
  user?: User
  comments?: Comment[]
}

// UserInfo is a stricter variant of User where avatar is always present
export interface UserInfo {
  idstr: string
  screen_name: string
  avatar: string
}

export type FilterResult = { action: 'hide'; reason: string } | { action: 'show' }

export interface FilterContext {
  profile?: string
  uid?: string
  rcList?: boolean
}

export interface HotSearch {
  word: string
  rank?: number
  is_ad?: boolean
}

export interface MessageDetail {
  method?: string
  data?: unknown
  _id?: number
  _isResponse?: boolean
}

export interface DialogConfigEntry {
  key: string
  label: string
  type: 'checkbox' | 'text' | 'textarea' | 'number' | 'select'
  default: unknown
  options?: Array<{ label: string; value: string | number }>
  static?: boolean
  description?: string
}

export interface DialogConfig {
  title: string
  tabs: Array<{
    label: string
    entries: DialogConfigEntry[]
  }>
}

export type CleanupStyles = Record<string, string>
