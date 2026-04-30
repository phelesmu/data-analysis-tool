# 数据分析工具与能力清单

本文档汇总当前应用已经具备的数据分析工具、分析能力、输出结果和对应代码入口。

## 功能工具

| 序号 | 工具 / 模块 | 核心能力 | 适用输入 | 输出 / 结果 | 代码入口 |
|---:|---|---|---|---|---|
| 1 | 文件上传与解析 | 支持拖拽或选择文件；解析 `CSV`、`XLSX`、`XLS`；自动读取首个工作表；解析数字、日期、文本和空值 | 本地 CSV / Excel 文件 | 原始数据集、列信息、字段类型 | `src/components/FileUpload.tsx`, `src/lib/dataUtils.ts` |
| 2 | 多数据源管理 | 支持主文件、附加文件、SQL 结果、JOIN 结果、列投影结果之间切换 | 已加载文件和派生结果 | 可选数据源列表、行列数量标识 | `src/components/DataSourceSelector.tsx`, `src/App.tsx` |
| 3 | 数据表格预览 | 支持滚动表格、固定行号、列类型标识、列排序、显示 / 隐藏列、逐步加载更多行 | 当前数据源 | 可检查的明细数据表 | `src/components/DataTable.tsx` |
| 4 | 字段类型识别 | 自动识别 `numeric`、`date`、`text`；支持常见日期格式；支持千分位数字 | 解析后的数据行 | 字段类型元数据 | `src/lib/dataUtils.ts`, `src/lib/types.ts` |
| 5 | 条件筛选器 | 支持文本、数字、日期筛选；支持等于、不等于、包含、区间、大于、小于等；支持列与列对比；多个筛选条件按 AND 生效 | 当前基础数据源 | 筛选后的数据集、筛选数量 | `src/components/DataFilters.tsx`, `src/lib/dataUtils.ts` |
| 6 | 日期范围筛选 | 自动识别日期列；用滑块选择起止日期；支持应用和清空 | 含日期列的数据源 | 日期范围过滤后的数据 | `src/components/DateRangeSlider.tsx`, `src/lib/dataUtils.ts` |
| 7 | 时间分布图 | 根据时间跨度自动使用日、周、月粒度；显示记录数柱状图；可切换累计趋势线；按密度着色 | 日期列 | 时间分布图、累计趋势 | `src/components/TimelineChart.tsx` |
| 8 | 基础数据可视化 | 支持柱状图、折线图、饼图；可选择数值列；展示前 20 行数据 | 数值列 | 交互式图表 | `src/components/DataVisualization.tsx` |
| 9 | 统计摘要 | 自动计算数值列的数量、平均值、中位数、总和、最小值、最大值 | 数值列 | 统计卡片 | `src/components/StatisticsCards.tsx`, `src/lib/dataUtils.ts` |
| 10 | 相关性分析 | 计算数值列之间的 Pearson 相关系数；展示 Top 10 相关关系；展示相关矩阵；区分强、中、弱相关 | 至少 2 个数值列 | 相关矩阵、强相关排行 | `src/components/CorrelationAnalysis.tsx`, `src/lib/dataUtils.ts` |
| 11 | 散点图与回归分析 | 支持选择 X / Y 数值列；计算相关系数、R²、线性回归方程；绘制散点和回归线 | 至少 2 个数值列 | 散点图、回归线、回归指标 | `src/components/ScatterPlot.tsx` |
| 12 | 分组与聚合 | 支持多列分组；支持计数、去重计数、求和、平均值、最小值、最大值、中位数、标准差、方差；支持输出列别名和结果命名 | 当前数据源 | 分组结果表 | `src/components/GroupByPanel.tsx`, `src/lib/dataUtils.ts` |
| 13 | 分组对比图 | 自动读取分组结果；支持选择分类轴；支持多个数值列同时对比；数值轴支持 K / M 格式 | 分组聚合结果 | 聚合柱状对比图 | `src/components/AggregatedBarChart.tsx` |
| 14 | SQL 查询编辑器 | 使用 SQL 查询当前数据集；支持 `SELECT`、`WHERE`、`GROUP BY`、聚合、排序、限制行数；内置示例查询；支持 Ctrl / Cmd + Enter 执行 | 当前数据源 | 保存的查询结果 | `src/components/SqlQueryPanel.tsx` |
| 15 | JOIN 操作 | 支持 `INNER`、`LEFT`、`RIGHT`、`FULL` JOIN；可选择左右结果表和关联列；输出字段自动加 `L_`、`R_` 前缀 | 至少 2 个查询 / 分组结果 | JOIN 后的数据表 | `src/components/JoinPanel.tsx` |
| 16 | 关系图 | 用 D3 展示查询结果和 JOIN 结果之间的关系；支持拖拽节点、缩放平移、悬浮详情、字段高亮、节点字段折叠 | 查询结果和 JOIN 历史 | 表关系图 | `src/components/RelationshipDiagram.tsx` |
| 17 | 查询结果管理 | 保存 SQL、分组、JOIN 结果；每个结果支持表格、图表、统计三个视图；支持删除和导出 | 派生结果 | 可复用结果列表 | `src/components/QueryResults.tsx` |
| 18 | 当前数据导出 | 导出当前数据源、查询结果、时间对比筛选结果为 CSV | 当前数据源或派生结果 | CSV 文件 | `src/lib/dataUtils.ts`, `src/App.tsx`, `src/components/TimeCompare.tsx` |
| 19 | 时间对比 | 逐行比较两个时间列；识别 A 早于 B、B 早于 A、相等、缺失；计算平均时间差；支持按状态筛选和导出 | 至少 2 个时间列 | 时间顺序检查表、状态统计、CSV | `src/components/TimeCompare.tsx` |
| 20 | 中英文切换 | 支持中文和英文界面；语言设置保存在本地 | 用户语言选择 | 本地化界面文本 | `src/lib/i18n.tsx`, `src/hooks/useLocalStorageState.ts` |

## 技术支撑

| 分类 | 工具 / 依赖 | 当前用途 |
|---|---|---|
| 前端框架 | React 19、Vite、TypeScript | 构建单页数据分析应用 |
| UI 组件 | Radix UI、shadcn 风格组件、Tailwind CSS | 表单、按钮、表格、标签页、弹窗、下拉、滑块、日历等 |
| 图表 | Recharts | 柱状图、折线图、饼图、散点图、组合图 |
| 关系图 | D3 | JOIN 关系图、力导向布局、拖拽、缩放 |
| 文件解析 | xlsx、浏览器 FileReader | Excel / CSV 读取和解析 |
| SQL 引擎 | alasql | 浏览器内 SQL 查询和 JOIN |
| 日期处理 | date-fns | 日期解析辅助、格式化、区间计算 |
| 图标 | Phosphor Icons、lucide-react | 工具栏、标签页、按钮和状态图标 |
| 状态保存 | localStorage | 语言、可见列、关系图折叠状态 |
| 通知 | sonner | 上传、查询、导出、错误提示 |

## 当前边界

| 维度 | 当前边界 |
|---|---|
| 主文件类型 | `.csv`、`.xlsx`、`.xls` |
| 主文件大小 | 上传组件限制 50 MB |
| 附加文件大小 | 附加文件入口限制 5 MB |
| 解析行数 | CSV / Excel 最多读取约 10,000 行数据 |
| 表格默认渲染 | 默认展示前 500 行，可继续加载或显示全部 |
| 基础图表展示 | 默认使用前 20 行 |
| 分组对比图展示 | 默认使用前 50 个分组 |
| 时间对比表展示 | 默认展示前 1,000 行，完整结果可导出 |
| SQL 表名约定 | 当前数据集在 SQL 中使用 `?` 表示 |
| JOIN 输入限制 | JOIN 入口基于已保存的查询 / 分组 / JOIN 结果执行 |
