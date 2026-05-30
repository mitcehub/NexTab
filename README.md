# NexTab

一款美观的浏览器新标签页扩展，支持自定义快捷方式、多搜索引擎切换、壁纸更换与拖拽排序。

![NexTab Preview](docs/nextab-preview.png)

## 功能特性

- **实时时钟** — 大字体数字时钟，显示日期与星期
- **多搜索引擎** — 支持 Google、百度、Bing、知乎，可拖拽排序
- **快捷方式** — 预置常用网站，支持添加/编辑/删除，拖拽排序
- **智能图标** — 自动获取网站图标，支持手动指定，多级降级策略（GitHub → jsdelivr → Google → HTML 解析 → favicon.ico）
- **壁纸系统** — 内置精选壁纸，支持自定义上传
- **数据同步** — 设置自动保存至 localStorage，刷新不丢失
- **跨浏览器** — 同时支持 Chrome / Edge / Firefox

## 安装

### Chrome / Edge

1. 前往 [Releases](https://github.com/mitcehub/NexTab/releases) 下载最新版 `NexTab-Chrome.zip`
2. 解压到任意文件夹
3. 打开 `chrome://extensions/`（或 `edge://extensions/`），开启「开发者模式」
4. 点击「加载已解压的扩展程序」，选择解压后的文件夹

### Firefox

前往 [Firefox 附加组件商店](https://addons.mozilla.org/zh-CN/firefox/addon/newnextab/) 直接安装。

## 使用说明

### 快捷方式管理

- **添加** — 点击快捷方式网格末尾的「+」按钮
- **编辑** — 右键点击快捷方式，选择「编辑」
- **删除** — 右键点击快捷方式，选择「删除」
- **排序** — 长按拖拽到目标位置

### 图标获取

编辑快捷方式时，可点击「获取图标」按钮自动获取网站图标。也可在「图标URL」栏手动输入图标地址，手动输入的图标不会被自动刷新覆盖。

### 搜索引擎

点击搜索栏左侧的引擎图标可切换搜索引擎，在设置中可拖拽调整引擎顺序。

### 壁纸

点击右下角壁纸按钮可切换内置壁纸，也可上传自定义图片。

## 技术架构

```
Page/
├── manifest.json       # 扩展清单
├── newtab.html         # 新标签页入口
├── style.css           # 样式
├── js/
│   ├── main.js         # 主逻辑 & 设置面板
│   ├── store.js        # 状态管理 & localStorage
│   ├── sites.js        # 快捷方式渲染 & 拖拽排序
│   ├── favicon.js      # 图标获取管线 & 缓存
│   ├── search.js       # 搜索引擎逻辑
│   ├── settings.js     # 设置面板 & 引擎排序
│   ├── clock.js        # 时钟组件
│   ├── wallpaper.js    # 壁纸管理
│   ├── presets.js      # 预置站点数据
│   └── utils.js        # 工具函数
├── icons/              # 扩展图标
└── fonts/              # 字体文件
```

### 图标获取管线

图标获取采用 Provider 插件化降级链，按优先级依次尝试：

```
GitHub Icon Repo → jsdelivr CDN → Google Favicon API → HTML 解析 → /favicon.ico → 首字母 Fallback
```

- 每个 Provider 产出二进制 blob，不会再次进入解析器，避免递归
- 请求队列限制最大并发数为 4，防止批量刷新时卡顿
- 所有网络请求均设置 8 秒超时 + AbortController，避免请求挂起
- 缓存写入有优先级保护，低质量结果不会覆盖高质量结果

### 缓存系统

- 使用 IndexedDB 存储图标缓存
- 按来源类型区分 TTL：自动获取 7 天，手动获取 30 天
- 缓存 Key 标准化（去 www 前缀、统一 https、统一尾部斜杠）
- `locked` 标记防止手动图标被自动刷新覆盖

## 开发

```bash
# 克隆仓库
git clone https://github.com/mitcehub/NexTab.git

# 在浏览器中加载 Page/ 目录即可开发调试
```

## 许可证

MIT License
