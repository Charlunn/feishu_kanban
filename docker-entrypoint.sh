#!/bin/sh
# 从 Docker Secret 文件中读取数据库密码，构建 DATABASE_URL 后启动应用
# 避免密码出现在 environment 变量（docker inspect 可见）中

set -e

DB_PASS=$(cat /run/secrets/db_password | tr -d '[:space:]')
export DATABASE_URL="postgresql://kanban:${DB_PASS}@postgres/kanban?sslmode=disable"

exec npx next start --port 3015
