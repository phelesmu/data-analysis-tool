# Deployment Guide

这份文档按“能直接照着执行”为目标来写。

项目本质上是一个静态前端站点。

所以部署到虚拟机时，最稳的做法是：

1. 本地构建 `dist/`
2. 上传到虚拟机
3. 用 `nginx` 托管

---

## 1. 适用场景

这份方案适合：

- Ubuntu / Debian 虚拟机
- CentOS / Rocky / Alma 也能照着改
- 前端静态站点
- 页面路由需要 `index.html` 回退

---

## 2. 本地准备

先在你本机确认构建没问题：

```bash
npm install
npm run build
```

构建完成后会得到：

- `dist/`

这个目录就是要部署到服务器上的内容。

---

## 3. 服务器准备

下面以 Ubuntu 为例。

### 3.1 安装 nginx

```bash
sudo apt update
sudo apt install -y nginx
```

确认服务状态：

```bash
sudo systemctl status nginx
```

设置开机启动：

```bash
sudo systemctl enable nginx
```

### 3.2 打开防火墙

如果你启用了 `ufw`：

```bash
sudo ufw allow 'Nginx Full'
sudo ufw status
```

---

## 4. 创建部署目录

建议目录：

- `/var/www/data-analysis-tool`

创建目录：

```bash
sudo mkdir -p /var/www/data-analysis-tool
```

给当前用户临时写权限有两种方式。

### 方式一：直接用 `sudo` 拷贝

最简单。

### 方式二：改目录归属

如果你后面会频繁更新：

```bash
sudo chown -R $USER:$USER /var/www/data-analysis-tool
```

---

## 5. 上传构建产物

### 方式一：用 `scp`

在你本机执行：

```bash
scp -r dist/* your_user@your_server_ip:/var/www/data-analysis-tool/
```

### 方式二：用 `rsync`

推荐。

它会同步变更，不会每次都全量重传。

```bash
rsync -avz --delete dist/ your_user@your_server_ip:/var/www/data-analysis-tool/
```

---

## 6. 配置 nginx

创建站点配置：

```bash
sudo nano /etc/nginx/sites-available/data-analysis-tool
```

写入下面这份配置。

如果你还没有域名，先把 `server_name` 写成服务器 IP 或 `_`。

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _;

    root /var/www/data-analysis-tool;
    index index.html;

    access_log /var/log/nginx/data-analysis-tool.access.log;
    error_log  /var/log/nginx/data-analysis-tool.error.log;

    gzip on;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        application/xml+rss
        image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
        try_files $uri =404;
    }
}
```

这个配置做了几件事：

- 站点根目录指向 `dist`
- 支持前端路由回退到 `index.html`
- 静态资源加缓存
- 记录独立日志

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/data-analysis-tool /etc/nginx/sites-enabled/data-analysis-tool
```

如果默认站点会冲突，删掉默认站点：

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

测试配置：

```bash
sudo nginx -t
```

重载服务：

```bash
sudo systemctl reload nginx
```

---

## 7. 访问验证

浏览器打开：

- `http://your_server_ip`

如果你配置了域名：

- `http://your-domain.com`

如果页面能正常打开，并且刷新内部路由不报 `404`，说明部署成功。

---

## 8. 绑定域名

如果你有域名：

1. 在域名解析平台添加 `A` 记录
2. 指向你的虚拟机公网 IP
3. 把 `server_name _;` 改成你的域名

例如：

```nginx
server_name data.example.com;
```

改完后重新加载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 9. 配 HTTPS

推荐直接用 `certbot`。

安装：

```bash
sudo apt install -y certbot python3-certbot-nginx
```

签发证书：

```bash
sudo certbot --nginx -d your-domain.com
```

如果你还有 `www`：

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

签发后 `certbot` 会自动帮你改 `nginx` 配置。

检查自动续期：

```bash
sudo systemctl status certbot.timer
```

手动测试续期：

```bash
sudo certbot renew --dry-run
```

---

## 10. 后续更新

以后你每次发布只需要 3 步。

### 本地重新构建

```bash
npm run build
```

### 同步到服务器

```bash
rsync -avz --delete dist/ your_user@your_server_ip:/var/www/data-analysis-tool/
```

### 可选：重载 nginx

静态文件更新通常不需要重载。

只有改了配置文件才需要：

```bash
sudo systemctl reload nginx
```

---

## 11. 常见排障

### 页面空白

先看浏览器控制台。

再看是不是资源路径加载失败。

这个项目已经使用相对 `base`：

- `vite.config.ts` 里是 `base: './'`

所以直接放在站点根目录下通常没问题。

### 刷新子路由 404

原因通常是没有配置：

```nginx
try_files $uri $uri/ /index.html;
```

把这条补上再重载 `nginx`。

### nginx 配置错误

先跑：

```bash
sudo nginx -t
```

不要盲目重启。

### 没有权限写入部署目录

两种解决方式：

```bash
sudo chown -R $USER:$USER /var/www/data-analysis-tool
```

或者上传时直接用 `sudo` 中转。

### 服务器上还是旧页面

先确认你上传的是新的 `dist/`。

然后清浏览器缓存。

如果用了 CDN，再清 CDN 缓存。

---

## 12. 推荐目录结构

```text
/var/www/data-analysis-tool
├── index.html
├── assets/
└── ...
```

---

## 13. 最短命令版

如果你已经懂上面内容，最短流程就是：

### 本地

```bash
npm run build
rsync -avz --delete dist/ your_user@your_server_ip:/var/www/data-analysis-tool/
```

### 服务器

```bash
sudo apt update
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/data-analysis-tool
sudo ln -s /etc/nginx/sites-available/data-analysis-tool /etc/nginx/sites-enabled/data-analysis-tool
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 14. GitHub Pages

如果你不想维护虚拟机，也可以直接用 GitHub Pages。

仓库里已经有工作流：

- `.github/workflows/deploy-pages.yml`

只要仓库支持 Pages，并启用 `GitHub Actions` 作为发布源，就可以自动部署。
