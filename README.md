# Data Analysis Tool

一个面向 CSV / Excel 的轻量数据分析工具。

它支持：

- 上传 `CSV`、`XLSX`、`XLS`
- 数据预览与列选择
- 条件筛选与日期范围筛选
- 时间分布和时间列对比
- 图表、统计、相关性分析
- `SQL` 查询、`JOIN`、关系图
- 导出当前结果
- 中英文切换

## 本地开发

```bash
npm install
npm run dev
```

默认本地地址：

- `http://127.0.0.1:5177`

说明：

- 项目脚本已经固定使用 `Node 22.12.0`
- 直接执行 `npm run dev` 和 `npm run build` 即可

## 常用命令

```bash
npm run dev
npm run build
npx tsc --noEmit
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
