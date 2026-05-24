#!/bin/bash
set -e

# ============================================
# 飞书看板一键部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh
# ============================================

echo "=========================================="
echo "  飞书 AI 交付战情看板 — 一键部署"
echo "=========================================="
echo ""

# Check docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装。请先安装 Docker："
    echo "   curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装。"
    exit 1
fi

# Check .env.local
if [ ! -f .env.local ]; then
    echo "📝 未找到 .env.local，从模板创建..."
    cp .env.example .env.local
    echo ""
    echo "⚠️  请编辑 .env.local 填入飞书应用凭证："
    echo "   vim .env.local"
    echo ""
    echo "   必填项："
    echo "   - FEISHU_APP_ID"
    echo "   - FEISHU_APP_SECRET"
    echo "   - FEISHU_VERIFICATION_TOKEN"
    echo "   - FEISHU_DEFAULT_CHAT_ID"
    echo "   - NEXT_PUBLIC_APP_BASE_URL (你的域名，如 https://kanban.yourcompany.com)"
    echo "   - NEXT_PUBLIC_FEISHU_APP_ID (同 FEISHU_APP_ID)"
    echo ""
    echo "   填完后重新运行: ./deploy.sh"
    exit 0
fi

# Check SSL certs
if [ ! -f nginx/ssl/fullchain.pem ] || [ ! -f nginx/ssl/privkey.pem ]; then
    echo ""
    echo "⚠️  SSL 证书未找到。"
    echo ""
    echo "   方式一：手动放入证书"
    echo "   cp /your/cert/fullchain.pem nginx/ssl/fullchain.pem"
    echo "   cp /your/cert/privkey.pem nginx/ssl/privkey.pem"
    echo ""
    echo "   方式二：用 Let's Encrypt 自动申请（需要域名已解析到本机）"
    echo "   先注释掉 docker-compose.yml 中 nginx 的 443 端口和 ssl volume"
    echo "   启动后用 certbot 申请证书"
    echo ""
    read -p "   是否先用 HTTP 模式启动？(y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   使用 HTTP 模式..."
        # Create a simple HTTP-only config
        cat > nginx/conf.d/kanban.conf << 'HTTPCONF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://kanban:3015;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
HTTPCONF
        # Remove 443 port mapping temporarily
        echo "   ⚠️  注意：飞书要求 HTTPS，HTTP 模式仅用于测试"
    else
        echo "   请放入证书后重新运行 ./deploy.sh"
        exit 0
    fi
fi

# Update domain in nginx config
DOMAIN=$(grep NEXT_PUBLIC_APP_BASE_URL .env.local | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||' | sed 's|/||g')
if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost:3015" ]; then
    sed -i "s/kanban.yourcompany.com/$DOMAIN/g" nginx/conf.d/kanban.conf
    echo "✅ Nginx 域名已设置为: $DOMAIN"
fi

echo ""
echo "🚀 开始构建和启动..."
echo ""

# Build and start
docker compose up -d --build

echo ""
echo "=========================================="
echo "  ✅ 部署完成！"
echo "=========================================="
echo ""
echo "  服务状态："
docker compose ps
echo ""
echo "  查看日志: docker compose logs -f"
echo "  停止服务: docker compose down"
echo "  重启服务: docker compose restart"
echo ""
echo "  下一步："
echo "  1. 确认 https://$DOMAIN 能正常访问"
echo "  2. 在飞书开放平台配置网页应用地址"
echo "  3. 发布应用"
echo ""
