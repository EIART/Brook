# UI 重设计规格文档

## 背景

当前 UI 存在严重的可见性和功能性问题，需要全面重做。本次重设计针对"桌面摆件"使用场景——用户将此窗口常驻桌面，从 2-3 米距离偶尔瞥看当前歌词。

---

## 设计目标

1. **远距离可读**：当前歌词在 2-3 米外一眼可辨
2. **极简沉浸**：平时只有歌词，没有多余控件
3. **Apple 设计语言**：毛玻璃材质、系统字体、标准缓动曲线

---

## 视觉规格

### 字体

- 中文：PingFang SC
- 英文：SF Pro Display（`-apple-system` / `BlinkMacSystemFont`）
- 不加载外部字体

### 背景（专辑色调主题）

```css
background:
  radial-gradient(ellipse at 30% 20%, rgba(90,40,130,0.7), transparent 60%),
  radial-gradient(ellipse at 70% 80%, rgba(30,60,120,0.6), transparent 55%),
  #06060e;
```

### 歌词层次（4 行）

| 行         | font-size               | font-weight | color                      | 其他                   |
|------------|-------------------------|-------------|----------------------------|------------------------|
| 上一行     | clamp(16px, 2.4vw, 26px) | 300         | rgba(255,255,255,0.28)     | —                      |
| 当前行     | clamp(34px, 5.2vw, 60px) | 600         | #fff                       | text-shadow 0 0 40px rgba(255,255,255,0.25) |
| 译文       | clamp(15px, 2.2vw, 24px) | 300         | rgba(255,255,255,0.35)     | font-style: italic     |
| 下一行     | clamp(16px, 2.4vw, 26px) | 300         | rgba(255,255,255,0.18)     | filter: blur(0.5px)    |

> **层次逻辑**：当前行（实体白）> 上一行（淡清晰）> 译文（淡斜体辅助）> 下一行（最淡+轻微模糊）。
> 译文是辅助信息，不应比上下文行更突出。

### 译文降级情况

译文行在两种情况下隐藏：
1. 用户按 `L` 关闭译文
2. 当前歌词行无对应译文

**隐藏时**：译文行 DOM 节点不渲染（条件渲染，`translationEnabled && line.translation`），歌词区退化为 3 行（prev / cur / next），flex 布局自动调整间距，不留空白占位。

### 顶部胶囊（HUD）

```
position: absolute, top: 20px, left: 50%, transform: translateX(-50%)
background: rgba(255,255,255,0.07)
backdrop-filter: blur(20px) saturate(180%)
border: 1px solid rgba(255,255,255,0.1)
border-radius: 100px
padding: 7px 16px 7px 10px

内容（左→右）：
  专辑封面缩略图 22×22px, border-radius: 5px
  歌名 11px / 500w / rgba(255,255,255,0.85)
  分隔点 4×4px circle rgba(255,255,255,0.2)
  歌手名 10px / rgba(255,255,255,0.35)
```

> 胶囊在近距离（坐在屏幕前）可读，远距离仅作为色块锚点，不要求可读。

### 进度条

进度条用两层 `<div>` 实现（外层轨道 + 内层填充）：

```
外层：position: absolute, bottom: 0, left: 0, right: 0
      height: 3px, background-color: rgba(255,255,255,0.06)
内层：height: 100%, background-color: rgba(255,255,255,0.28)
      width 由 JS 动态设置（百分比）
```

> 由 2px 调整为 3px，在远距离勉强可见。

---

## 交互规格

### 歌词切换动效

所有行同时过渡，形成"整体流动"而非单行跳入。缓动曲线统一使用 `cubic-bezier(0.16, 1, 0.3, 1)`（比原来的 `0.25, 0.46, 0.45, 0.94` 前段更猛，契合节拍冲击感），时长 380ms。

```css
.lyric-line {
  transition:
    transform 380ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 380ms cubic-bezier(0.16, 1, 0.3, 1),
    font-size 380ms cubic-bezier(0.16, 1, 0.3, 1),
    filter 380ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

各行在歌词切换时的运动规则：

| 行 | 过渡内容 | 说明 |
|----|----------|------|
| 新当前行（入场）| `translateY(14px)→0` + `opacity: 0→1` + `font-size: prev-size→cur-size` | 从下方淡入 |
| 旧当前行→上一行 | `font-size: cur-size→prev-size` + `opacity: 1→0.28` | 缩小淡出，无位移动画（依赖 flex 布局自然流动） |
| 旧上一行（离场）| `opacity: 0.28→0` | 淡出消失（行数结构只保留 4 行，最旧的行 unmount） |
| 新下一行 | `opacity: 0→0.18` | 淡入 |
| 译文行 | `opacity` 跟随当前行切换淡入淡出，无位移 | — |

> 除新当前行外，其余行只做 opacity/font-size 过渡，依靠 flex 布局间距自动完成垂直位移，不需要额外的 translateY。

### 悬停叠层

- **覆盖范围**：`position: absolute; inset: 0`，全屏覆盖窗口
- **背景**：`rgba(0,0,0,0.55)` + `backdrop-filter: blur(2px)`
- **进入**：鼠标在窗口内停留 **300ms** 后触发（CSS `transition-delay: 300ms`，防无意划过）
- **退出**：立即开始，`opacity` 200ms fade-out，`transition-delay: 0ms`

叠层内容（flex-direction: column，align-items: center，justify-content: center，gap: 16px）：

**区块 1 — 曲目信息**
```
外层：flex row，gap: 10px，align-items: center
  专辑封面：36×36px，border-radius: 7px（flex-shrink: 0）
  右侧文字列：flex column，gap: 2px
    歌名：font-size: 13px, font-weight: 500, color: rgba(255,255,255,0.85)
    歌手·专辑：font-size: 11px, color: rgba(255,255,255,0.35)
```

**区块 2 — 进度条（flex row，gap: 8px，align-items: center）**
```
时间戳（左）：font-size: 9px, color: rgba(255,255,255,0.3)
进度条轨道：width: 120px（固定值，桌面摆件窗口宽度通常≥300px，不响应窗口宽度）
             height: 2px, background-color: rgba(255,255,255,0.12)
  进度条填充：width 由 JS 动态设置（百分比），background-color: rgba(255,255,255,0.45)
时间戳（右）：同左侧样式
```

**区块 3 — 快捷键徽章（flex row，gap: 24px）**
```
每个徽章（flex column，align-items: center，gap: 5px）：
  键名徽章：28×28px, background: rgba(255,255,255,0.1), border: 1px solid rgba(255,255,255,0.18)
            border-radius: 6px, font-size: 12px, font-weight: 500, color: rgba(255,255,255,0.8)
  说明文字：font-size: 9px, color: rgba(255,255,255,0.35)
内容：T/主题  L/译文  ,/设置
```

> 快捷键提示是悬停叠层的子元素，**不在平时状态常驻**。

### 主题选择器（按 T 打开）

- 从底部滑入的 Sheet（`position: absolute; bottom: 0; left: 0; right: 0`）
- 背景：`rgba(12,12,24,0.85)`，`backdrop-filter: blur(20px) saturate(180%)`（与胶囊同参数，通过透明度区分层级）
- `border-top: 1px solid rgba(255,255,255,0.07)`
- 7 列缩略图网格（`grid-template-columns: repeat(7, 1fr)`，gap: 8px）
- 缩略图：16:9 比例，`border-radius: 6px`，`border: 1px solid rgba(255,255,255,0.08)`
- 当前选中主题：`border: 1.5px solid rgba(255,255,255,0.7)`，`box-shadow: 0 0 0 2px rgba(255,255,255,0.15)`
- 最后一格为"+ 导入"按钮（虚线边框，无背景）
- 顶部 header：左侧「选择主题」(10px uppercase)，右侧「×」关闭按钮

### 键盘快捷键

| 键 | 功能 |
|----|------|
| T  | 切换主题选择器 |
| L  | 切换译文显示 |
| ,  | 打开设置 |

---

## 组件变更清单

| 组件 | 状态 | 变更内容 |
|------|------|----------|
| `src/renderer/components/LyricsDisplay.tsx` | 已存在，重写 | 4 行结构（prev/cur/trans/next），去掉 prev2/next2；新动效（transition 替代纯 animation）；译文改 0.35+斜体；下一行改 0.18+blur(0.5px) |
| `src/renderer/components/ControlBar.tsx` | 已存在，重写 | 悬停叠层加 300ms 进入延迟；快捷键提示移入叠层内部（不再是独立的 absolute 元素） |
| `src/renderer/hooks/useHover.ts` | 已存在，修改 | 加 300ms 进入延迟（`enterDelay` 参数） |
| `src/renderer/src/index.css` | 已存在，修改 | 进度条高度更新为 3px |
| `src/renderer/components/ThemePicker.tsx` | 已存在，**不动** | 逻辑不变 |
| `src/renderer/components/SettingsPage.tsx` | 已存在，**不动** | 逻辑不变 |
| `src/renderer/src/App.tsx` | 已存在，**不动** | 逻辑不变 |

---

## 非目标（本次不做）

- 窗口尺寸自定义（设置里已有）
- 歌词搜索/编辑
- 多显示器支持
- 移动端适配
