# StudyOS 0.0.22 — 实施与验收

验收日期：2026-10-17（Asia/Shanghai）。基线：上轮已发布的 `StudyOS_0.0.21.html`，SHA-256 为 `84aefc6b8e562ae9a4dc53b490e1b559007cade0a98a282c65d7ac5489a94a47`。原版文件保持不变，Git 检查点为 `c2d9cad`，本轮在 `design/studyos-0.0.22` 独立分支实施。

## 实际修改

1. 顶部只常驻 Search、Settings；空闲不再显示 Timer 或 Quick guide。会话运行、暂停和待保存时显示对应入口，继续使用原会话。
2. More 改为随触发按钮定位的 280px 非模态下拉菜单。七个现有入口按学习、其他、帮助分组；支持外部点击、Escape、Tab 与方向键。移除了旧遮罩、大面板、模态声明及焦点循环。
3. Today 和 Planner 日列表共用任务行。标题 15px/500，辅助信息 13px，最小行高 56px；时长和操作列固定。普通待办/完成不再重复显示色块，保留无障碍状态。真实会话分别显示 In progress、Paused、Ready to save；ready 不被误判为正在计时。
4. Today、Planner 共用目标及活动组件：暖灰侧栏、24px 内边距、16px 标题、3px 蓝色进度条，统一 `n of m complete` 和分钟格式。Planner 使用选中日期的目标和活动范围；非当前周明确显示对应周。
5. 首次空列表只有空状态的主 Add task；已有任务时恢复顶部入口。搜索无结果和全部完成单独表达。Getting started 改为单步轻量提示；可跳过 Availability、可关闭并保存。Today 只保留列表下方的 Availability 主入口。
6. Review 仅在至少三项已完成且有关联记录的任务时显示具体估时建议；数据解释集中到一个折叠区。保留计时/补记区别和记录修改能力。
7. 整理涉及的导航、菜单、任务和侧栏样式；删除已确认失效的旧大菜单专用规则。保留其它功能代码，不增加应用依赖、艺术素材或新存储结构。

实际编辑的主要文件：`source/navigation.js`、`source/ui-v4.js`、`source/today.js`、`source/ui-text.js`、`source/app.js` 的展示部分、`source/command-menu.js` 的菜单关闭衔接，以及 `product.css`、`today.css`、`icons.css`、`workspace.css`、`v4.css`、`styles.css` 中本轮相关组件规则。构建输出为 `StudyOS_0.0.22.html`。

## 实际运行环境

- Chromium 154.0.8037.57、Playwright 1.62.1。
- 1366×768、1440×900、1920×1080 CSS px，device scale factor 1，默认 100% 缩放；英语浏览器界面、Asia/Shanghai 本地时区。
- 每组测试使用独立浏览器上下文，没有接触真实用户浏览器资料。截图中的 10 项任务、目标和记录只在测试环境中存在。
- 截图来自实际 HTML 页面。稳定状态截图结束有限过渡后捕获，不包含生成图或设计效果图。

## 逐项验收表

| 验收项 | 结果 | 实际证据 |
| --- | --- | --- |
| 恢复原版、独立版本与检查点 | 通过 | 原版哈希核对；恢复出的 31 个嵌入块可精确重建原版；保存 Git 检查点 |
| 顶部导航、Search/Settings、空闲无 Timer、Guide 移入 More | 通过 | `round1.cjs`；三种桌面尺寸导航检查 |
| More 宽 280px、触发按钮下方 8px、边缘留距与内部滚动 | 通过 | 三种规定尺寸，另加 980×400 的低高度窗口测量 |
| More 七个入口跳转、再次点击/外部点击/Escape 关闭 | 通过 | Notebook、Goal tree、Plan insights、Study assessment、Website blocking、Archive、Quick guide 均实际打开 |
| More 的 Tab 可退出、Escape 归还焦点、方向键可访问 | 通过 | `round1.cjs`；无 aria-modal、无旧焦点陷阱 |
| 搜索按钮及 Ctrl+K，包括从 More 打开搜索 | 通过 | `round1.cjs`、`layout.cjs`；关闭搜索后可继续导航 |
| 任务待办/运行/暂停/待保存/完成状态 | 通过 | `round2.cjs`、`workflow.cjs`；ready 不显示运行；已完成仍保持勾选 |
| 10 个任务，长中英文及标点，时长/操作列对齐 | 通过 | `layout.cjs` 三种尺寸，实际字号 15px、行高≥56px、列间不相交 |
| 普通待办不显示重复 To do 标签；无障碍状态保留 | 通过 | `round2.cjs`；正常状态使用仅供辅助技术读取的文字 |
| Today 与 Planner 共用目标：无内容/部分完成/全部完成 | 通过 | `round3.cjs`、`layout.cjs`；No goal set、1 of 2 complete、2 of 2 complete |
| Planner 日期上下文与活动统计 | 通过 | 当前日期与 65 天后的日期分别验证；未来目标不会显示当前周记录；Review 跳转携带选中日期 |
| 首次使用、搜索无结果、筛选下全部完成 | 通过 | `round4.cjs`；空列表只有一个主要 Add task；Clear filters/View all tasks 可操作 |
| Getting started 更新、跳过与关闭保存 | 通过 | 1→2→3 步、Skip for now、关闭后刷新不再出现 |
| Availability 完整填写与保存日常模板 | 通过 | `schedule.cjs`；起床/睡眠、学习窗口、40 分钟弹性午饭、缓冲、模板均保存并刷新恢复 |
| 超负荷时展开信息；调整仍先预览 | 通过 | 超负荷标签与详情；缩小任务先显示预览，确认前原任务不变 |
| Review 记录不足不显示空泛建议 | 通过 | 零记录、1/2 项完成记录不显示建议；3 项完成且有关联记录才显示实际合计依据 |
| Review 解释可找到且不重复铺开 | 通过 | `round5.cjs`；一个 About these records 折叠区；计时/手动记录区分保留 |
| 页面与本轮菜单/表单/错误信息英文 | 通过 | 实际打开 Today、Planner、Focus、Review、Settings、Assessment、Plan insights、Blocking、Guide；检查可见文字；用户中文任务/笔记保留 |
| 新建、编辑、勾选完成与 Undo | 通过 | `workflow.cjs`；修改后 task ID 不变；完成/撤销恢复任务进度 |
| Enter/输入法确认不会误创建，键盘明确提交可用 | 通过 | 时长输入 Enter、IME Enter 不创建；按钮聚焦 Enter 仅创建一项 |
| 50 分钟任务开始为 50:00 | 通过 | 实际点击 Start，检查计时值及 duration=3000000 |
| Pause 不计时、Resume 不新建会话 | 通过 | 可控时钟推进 60 秒后为 49:00；暂停推进 120 秒仍为 49:00；继续推进 30 秒为 48:30；session ID 不变 |
| Exit focus view、切页和刷新不重置会话 | 通过 | 布局退出后计时继续；顶部入口返回同一会话；暂停刷新后仍为 48:30 |
| 运行参数修改沿用原确认机制 | 通过 | 修改为 40 分钟并 Apply，原会话仍是 50 分钟，弹出 Change this session?；Keep current session 保持原会话 |
| 计时自然结束后待保存，三个位置状态一致 | 通过 | 推进剩余时间触发原 finishTimer；Today、Focus、顶栏均 Ready to save；保存前无学习记录、剩余工作量保持 |
| 手动 Finish session、Save session、防止重复保存 | 通过 | 另一次会话暂停后手动 Finish，记录 1.5 分钟；双提交仅写一条；明确完成任务后 Undo 保留学习记录 |
| 保存后刷新，任务与学习记录存在 | 通过 | 两条记录的 ID 与时长核对；中文标题与记录笔记不被翻译 |
| 保存失败真实提示，保留输入后重试 | 通过 | 隔离测试注入 localStorage 写入失败；不新增任务、保留表单；恢复写入后重试仅新增一次 |
| 选中、悬停复位、键盘焦点和禁用状态 | 通过 | `interactions.cjs`；实际样式取值、Tab/Enter、任务更多菜单、不可点击的测评返回控件 |
| 减少动态效果 | 通过 | 浏览器 prefers-reduced-motion=reduce 时无运行中的页面切换动画 |
| 三种尺寸四个主页面及 Settings 不意外横向滚动 | 通过 | `layout.cjs`；导航不换行、任务列不重叠，无新 JavaScript 错误 |
| 0.0.21 旧存档在 0.0.22 中读取 | 通过 | 先由原版读取规范化的测试存档，再用新版读取并深比较；任务、设置、ID、记录和图片全部一致 |
| 备份/恢复含笔记与图片 | 通过 | Settings 实际导出完整备份，另一个空浏览器上下文导入，逐项比较并刷新确认 |
| 底层计算和存储保护 | 通过 | 16 个模块及 13 个计时/存储函数与原版逐字节相同；存储键、IndexedDB 名称、版本、原 S 标志不变 |
| 单文件与断网使用 | 通过 | 无外链脚本；页面加载后关闭网络，Planner/Focus/Review 继续运行 |
| 用户电脑直接双击 HTML、file:// 环境 | 未验证 | 云浏览器策略返回 ERR_BLOCKED_BY_ADMINISTRATOR；已验证 HTTP 加载后的离线运行，不能代替用户电脑 file:// 测试 |
| Safari / Firefox / 不同系统高 DPI | 未验证 | 本轮仅有上述 Chromium 桌面环境 |
| 实际扩展跨站屏蔽、系统通知/休眠、系统打印 | 未验证 | 本轮未运行扩展后台或操作系统级场景；相关原始模块保留，未把普通网页描述成跨站拦截器 |

## 修复循环记录

| 检查中发现的问题 | 原因 | 处理及复验 |
| --- | --- | --- |
| 清理样式后任务标题仍为 16px | 历史 workspace.css 的通用 `.task-title` 与 `.task-row .task-title` 使用了 16px!important | 删除已被替代的强制规则，使用现有字号变量；三尺寸重新测量为 15px，重新生成 Today/Planner 等截图 |
| 初次截图落在页面淡入中间，不能作为最终证据 | 有限页面过渡未完成 | 使用真实导航操作，并在稳定状态捕获；替换最终证据截图。没有修改业务逻辑或用效果图替代 |
| 测试脚本最初把 Goal tree 当成弹窗，并把创建按钮当成 submit | 与原有真实交互不符 | 按原有目标树路由、显式 save-task 按钮修正测试；没有为通过测试而改变产品行为 |
| 迁移比较最初包含人工测试数据尚未补全的默认字段 | 原版加载时本来就会补全默认字段 | 先通过原版自己的加载流程建立基准，再读取新版深比较；完整一致 |

最终已执行场景没有剩余“未通过”项。未验证项如上，不计入通过数量。

## 截图

以下都是 1440×900、100% 缩放的实际运行截图，测试内容不写入发布文件：

- [Today 空状态](screenshots/Today-empty.png)
- [Today 十个任务](screenshots/Today-tasks.png)
- [More 展开](screenshots/More.png)
- [Planner 共用侧栏](screenshots/Planner.png)
- [Focus 暂停](screenshots/Focus-paused.png)
- [Review](screenshots/Review.png)

计时测试用 Playwright 固定时钟模拟时间推进，运行的是原始计时计算与保存函数，没有等待真实的 50 分钟，也没有把模拟时长写入任何真实用户存档。

云环境的 `start_skill` 启动说明已保存为配置草稿；需要在环境设置中审核、保存并发布后才会用于后续环境。这不影响下载和使用单文件 HTML。
