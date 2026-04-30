# Data Analysis Tool

一个面向 CSV / Excel 的轻量数据分析工具。

## 功能能力

- 上传 `CSV`、`XLSX`、`XLS`
- 数据预览与列选择
- 条件筛选与日期范围筛选
- 时间分布和时间列对比
- 图表、统计、相关性分析
- `SQL` 查询、`JOIN`、关系图
- 导出当前结果
- 中英文切换

完整能力清单：

- [docs/DATA_ANALYSIS_TOOLS_AND_CAPABILITIES.md](docs/DATA_ANALYSIS_TOOLS_AND_CAPABILITIES.md)

## 演示资料

项目已经内置一套演示数据和教程。

| 类型 | 文件 | 说明 |
|---|---|---|
| 演示数据 CSV | [data/demo_data_analysis_tool.csv](data/demo_data_analysis_tool.csv) | 64 行、33 列，覆盖筛选、图表、统计、相关性、分组、SQL、JOIN、时间对比和导出演示 |
| Markdown 教程 | [docs/USER_TUTORIAL.md](docs/USER_TUTORIAL.md) | 适合直接在仓库里阅读和维护 |
| Word 教程 | [docs/data-analysis-tool-user-tutorial.docx](docs/data-analysis-tool-user-tutorial.docx) | 适合发给客户、同事或培训对象 |
| 教程截图 | [docs/assets/tutorial/](docs/assets/tutorial/) | 教程中使用的真实页面截图和说明图 |

推荐演示数据：

```text
data/demo_data_analysis_tool.csv
```

上传成功后，页面会显示：

```text
已加载 64 行和 33 列
```

## 快速演示流程

1. 启动本地服务。
2. 打开浏览器里的本地地址。
3. 上传 `data/demo_data_analysis_tool.csv`。
4. 先看表格和筛选器。
5. 再看图表、统计和相关性。
6. 继续演示分组聚合和 SQL 查询。
7. 生成两个查询结果后演示 JOIN。
8. 最后演示时间对比和 CSV 导出。

更完整的讲解顺序看：

- [docs/USER_TUTORIAL.md](docs/USER_TUTORIAL.md)
- [docs/data-analysis-tool-user-tutorial.docx](docs/data-analysis-tool-user-tutorial.docx)

## 本地开发

```bash
npm install
npm run dev
```

默认本地地址：

- 以终端输出为准
- 常见地址：`http://127.0.0.1:5173/`

说明：

- 项目脚本已经固定使用 `Node 22.12.0`
- 直接执行 `npm run dev` 和 `npm run build` 即可

如果要固定使用 `5002` 端口：

```bash
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5002 --configLoader runner
```

## 常用命令

```bash
npm run dev
npm run build
npx tsc --noEmit
```

## 重新生成教程截图

先启动本地服务。

如果页面运行在 `5002`：

```bash
APP_URL=http://127.0.0.1:5002/ node scripts/capture-tutorial-screenshots.mjs
```

如果页面运行在 `5001`：

```bash
node scripts/capture-tutorial-screenshots.mjs
```

截图会写入：

```text
docs/assets/tutorial/
```

## 重新生成 Word 教程

```bash
python3 scripts/build-word-tutorial.py
```

输出文件：

```text
docs/data-analysis-tool-user-tutorial.docx
```

## 发给同事的最简单方式

### 方式一：发源码仓库

适合同事会跑前端项目。

```bash
git clone https://github.com/phelesmu/data-analysis-tool.git
cd data-analysis-tool
npm install
npm run dev
```

### 方式二：发静态构建产物

适合同事只想直接打开和测试。

```bash
npm run build
npx serve dist
```

你也可以直接把 `dist/` 打包发给同事。

## 发布

仓库已经带上 GitHub Pages 工作流：

- 工作流文件：`.github/workflows/deploy-pages.yml`
- 推送到 `main` 或 `nonspark-version` 会自动触发部署

如果 GitHub Pages 已启用，发布地址通常是：

- `https://phelesmu.github.io/data-analysis-tool/`

## 部署到虚拟机

看这里：

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
