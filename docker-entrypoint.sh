#!/bin/sh
# 从 Docker Secret 文件中读取数据库密码，构建 DATABASE_URL 后启动应用
# 避免密码出现在 environment 变量（docker inspect 可见）中

set -e

DB_PASS=$(cat /run/secrets/db_password | tr -d '[:space:]')
DB_HOST=${DB_HOST:-postgresql}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-kanban}
DB_USER=${DB_USER:-kanban}

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

exec npx next start --port 3015
