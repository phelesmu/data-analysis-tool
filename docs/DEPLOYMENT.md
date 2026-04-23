# Deployment Guide

## 1. GitHub Pages

这个项目是纯前端静态站点。

最省事的发布方式就是 GitHub Pages。

仓库内已经提供工作流：

- `.github/workflows/deploy-pages.yml`

触发分支：

- `main`
- `nonspark-version`

发布地址通常是：

- `https://phelesmu.github.io/data-analysis-tool/`

如果仓库还没开启 Pages：

1. 打开仓库 `Settings`
2. 进入 `Pages`
3. `Build and deployment` 选择 `GitHub Actions`

之后每次推送都会自动重新发布。

## 2. 发给同事

### 直接发仓库

```bash
git clone https://github.com/phelesmu/data-analysis-tool.git
cd data-analysis-tool
npm install
npm run dev
```

### 直接发构建结果

```bash
npm run build
npx serve dist
```

这种方式不需要同事理解项目结构。

只要能跑一个静态文件服务就行。

## 3. 部署到 Linux 虚拟机

先在本地构建：

```bash
npm run build
```

把 `dist/` 上传到虚拟机，比如：

- `/var/www/data-analysis-tool`

然后配置 `nginx`：

```nginx
server {
  listen 80;
  server_name _;
  root /var/www/data-analysis-tool;
  index index.html;

  location / {
    try_files $uri /index.html;
  }
}
```

重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 4. 可选方案

如果你以后想要更省维护：

- `Vercel`
- `Netlify`

这两个平台直接连 GitHub 仓库就能自动部署。

构建参数：

- Build command: `npm run build`
- Output directory: `dist`
