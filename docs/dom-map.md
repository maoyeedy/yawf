# Weibo DOM Map

## Selector Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Library classes | `woo-*`, `wbpro-*` | `woo-panel-main`, `wbpro-textcut` |
| Hashed CSS Modules | `_[name]_[hash]` — use `[class*="..."]` | `[class*="_wrap_"]`, `[class*="_title_"]` |

---

## Top Navigation

| Element | Selector |
|---------|----------|
| Nav container | `div.woo-panel-main.woo-panel-bottom` |
| Logo | `a[class*="_logoWrap_"]` |
| Search input | `div.woo-input-wrap > input.woo-input-main` |
| Tab nav | `div.woo-tab-nav > div.woo-tab-item-main` |
| Right action icons | `div[class*="_right_"]` |

## Left Sidebar

| Element | Selector |
|---------|----------|
| Sidebar container | `div[class*="_side_"]` |
| Menu item | `div[class*="_main_"]` |
| Menu icon | `i.woo-font` |
| Menu text | `span[class*="_text_"]` |

## Main Feed

| Element | Selector |
|---------|----------|
| Feed wrapper | `main[class*="_wrap_"]` |
| Publisher widget | `div[class*="_publishCard_"]` |
| Publisher input | `textarea[class*="_input_"]` |
| Post article | `article.woo-panel-main` |
| Post header | `header.woo-box-flex` |
| Author avatar | `div.woo-avatar-main` |
| Author name | `div[class*="_nick_"]` |
| Post text | `div.wbpro-feed-content div[class*="_wbtext_"]` |
| Retweet box | `div.retweet` |
| Action footer | `footer` |
| Like button | `.woo-like-main` |
| Comment button | `.woo-font--comment` |

## Right Sidebar

| Element | Selector |
|---------|----------|
| Sidebar container | `div.rightSide[class*="_sideBox_"]` |
| Hot search widget | `div.hotBand` |
| Hot search list | `.wbpro-side-panel` |
| Hot search rank | `div.wbpro-fontnum-rank` |
| Hot search text | `div.wbpro-textcut` |
| User recommendations | `.wbpro-side-card4` |
| Follow button | `.woo-button-primary` |
| Creator center | `div.wbpro-side-card-3` |
| Help/copyright | `div.wbpro-side-copy` |

## Core Structural Selectors

| Element | Selector | Notes |
|---------|----------|-------|
| Post container | `article.woo-panel-main` | Highest-level post/feed item |
| Feed scroller | `div#scroller` | Primary infinite scroll container |
| Right sidebar | `div.rightSide[class*="_sideBox_"]` | Contains hot search and recommendations |
| Publisher box | `div[class*="_publishCard_"]` | Post creation area |

## Interaction & Input Elements

| Element | Selector | Notes |
|---------|----------|-------|
| Post input | `textarea[class*="_input_"]` | |
| Post submit button | `button[class*="_btn_"]:has(span:contains("发送"))` | Target by text within hashed class |
| Visibility dropdown | `div[class*="_limits_"]` | Defaults to "公开" |
| Media upload | `input[type="file"][class*="_file_"]` | |

## Post Content Extraction

| Element | Selector | Notes |
|---------|----------|-------|
| Author name | `a[class*="_name_"] span[title]` | |
| Author UID | `[usercard="UID"]` | On avatar/name links, e.g. `[usercard="5950660819"]` |
| Post text | `div[class*="_wbtext_"]` | Use `.innerText` to clean HTML entities |
| Post timestamp | `a[class*="_time_"]` | `title` attribute has absolute date: `2026-03-10 16:53` |
| Retweet source | `div.retweet` | |

## Post Actions (Engagement)

| Element | Selector |
|---------|----------|
| Like button | `button.woo-like-main` |
| Comment button | `div[class*="_item_"]:has(i.woo-font--comment)` |
| Forward button | `div[class*="_item_"]:has(i.woo-font--retweet)` |
| Post menu (more) | `div[class*="_more_"] i.woo-font--angleDown` |

## Hot Search (Trending)

| Element | Selector | Notes |
|---------|----------|-------|
| Rank number | `div.rank` | |
| Topic title | `div.wbpro-textcut[title]` | |
| Trend status | `div.f13.clb` | e.g. "当前爆词", "18:12登顶" |
