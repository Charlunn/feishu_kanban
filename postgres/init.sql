-- Feishu 看板数据库初始化
-- 仅在数据库首次创建时执行（postgres 容器 /docker-entrypoint-initdb.d/ 机制）

-- 主状态表：单行 JSONB 文档模式
-- 整个看板状态（team, tasks, auditLogs, feishu config）存为一条记录
-- 三人团队数据量极小，JSONB 查询性能绰绰有余
CREATE TABLE IF NOT EXISTS kanban_state (
    id      TEXT PRIMARY KEY DEFAULT 'main',
    state   JSONB NOT NULL,
    updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 审计日志单独落表（便于未来查询分析，不影响主状态性能）
-- 当前审计日志已内嵌在 state JSONB 中，此表为扩展预留
CREATE TABLE IF NOT EXISTS audit_log (
    id         BIGSERIAL PRIMARY KEY,
    at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id   TEXT,
    task_id    TEXT,
    action     TEXT NOT NULL,
    details    JSONB
);

-- 为 JSONB 状态加 GIN 索引，支持 state->'tasks' 的快速查询（未来扩展用）
CREATE INDEX IF NOT EXISTS idx_kanban_state_gin ON kanban_state USING GIN (state);

-- 创建只读角色（可选：未来接 Metabase 等数据可视化工具用）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kanban_readonly') THEN
        CREATE ROLE kanban_readonly LOGIN PASSWORD 'readonly_change_me';
        GRANT CONNECT ON DATABASE kanban TO kanban_readonly;
        GRANT USAGE ON SCHEMA public TO kanban_readonly;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO kanban_readonly;
    END IF;
END
$$;
