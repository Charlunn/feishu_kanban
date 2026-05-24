"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BoardSummary, FeishuUserSession, StartupBoardState, StartupTask, TaskPriority, TaskStatus, TaskType } from "@/domain/models";
import { TASK_COLUMNS } from "@/domain/operations";
import { TaskActionPanel } from "./TaskActionPanel";
import { setNavTitle, setNavFeishuBlue, isInFeishu, requestFeishuAuthCode } from "@/lib/feishu/jssdk";

// ===== Constants =====
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: "紧急", high: "高", normal: "中", low: "低"
};

const TYPE_LABEL: Record<TaskType, string> = {
  sales: "线索跟进", diagnosis: "诊断复核", delivery: "交付验收",
  ops: "内部运营", product: "产品搭建", feishu: "飞书集成"
};

const RISK_LABEL: Record<string, string> = {
  customer_facing: "客户可见", ai_output: "AI草稿",
  quote_scope: "报价", sensitive_data: "敏感", ops_only: "内部"
};

type Tab = "board" | "create" | "stats" | "me";

type DragState = {
  taskId: string;
  title: string;
  sourceStatus: TaskStatus;
  pointerId: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
  active: boolean;
  overStatus?: TaskStatus;
};

// ===== Main App Component =====
export function KanbanApp({
  initialState,
  initialSummary,
  feishuReady
}: {
  initialState: StartupBoardState;
  initialSummary: BoardSummary;
  feishuReady: boolean;
}) {
  const [state, setState] = useState(initialState);
  const [tab, setTab] = useState<Tab>("board");
  const [memberId, setMemberId] = useState(initialState.team[0]?.id || "");
  const [activeLane, setActiveLane] = useState<TaskStatus>("ready");
  const [toast, setToast] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pending, setPending] = useState("");
  const [session, setSession] = useState<FeishuUserSession | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<StartupTask | null>(null);

  const activeMember = state.team.find((m) => m.id === memberId) || state.team[0];

  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, StartupTask[]> = {
      pool: [], ready: [], claimed: [], doing: [], blocked: [], review: [], done: []
    };
    for (const task of state.tasks) grouped[task.status].push(task);
    return grouped;
  }, [state.tasks]);

  const summary: BoardSummary = useMemo(() => ({
    total: state.tasks.length,
    open: state.tasks.filter((t) => t.status !== "done").length,
    inProgress: state.tasks.filter((t) => t.status === "claimed" || t.status === "doing").length,
    waitingReview: state.tasks.filter((t) => t.status === "review").length,
    done: state.tasks.filter((t) => t.status === "done").length,
    blocked: state.tasks.filter((t) => t.status === "blocked").length,
    availableMembers: state.team.filter((m) => m.mode !== "away").length
  }), [state]);

  // Count overdue tasks
  const overdueCount = useMemo(() => {
    const now = Date.now();
    return state.tasks.filter((t) =>
      t.dueAt && t.status !== "done" && new Date(t.dueAt).getTime() < now
    ).length;
  }, [state.tasks]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  // Feishu login on mount (if in Feishu container)
  useEffect(() => {
    if (!isInFeishu()) return;
    attemptFeishuLogin();
    setNavFeishuBlue();
  }, []);

  // Keep Feishu nav bar title in sync with current tab + badge count
  useEffect(() => {
    if (!isInFeishu()) return;
    const badgeCount = summary.waitingReview + overdueCount;
    const tabNames: Record<Tab, string> = {
      board: badgeCount > 0 ? `看板 (${badgeCount})` : "看板",
      create: "派活",
      stats: "数据统计",
      me: "我的"
    };
    setNavTitle(tabNames[tab]);
  }, [tab, summary.waitingReview, overdueCount]);

  async function attemptFeishuLogin() {
    setLoginLoading(true);
    try {
      const appId = document.querySelector<HTMLMetaElement>('meta[name="feishu-app-id"]')?.content || "";
      if (!appId) {
        showToast("飞书应用 App ID 未配置");
        return;
      }

      const code = await requestFeishuAuthCode(appId);
      const resp = await fetch("/api/feishu/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code })
      });
      const json = await resp.json();
      if (resp.ok && json.session) {
        setSession(json.session);
        setMemberId(json.session.memberId);
        showToast(`欢迎回来，${json.session.name}`);
      } else {
        showToast(json.error || "登录失败，使用手动选择");
      }
    } catch {
      showToast("飞书登录异常，使用手动选择身份");
    } finally {
      setLoginLoading(false);
    }
  }

  async function refresh() {
    const res = await fetch("/api/tasks");
    const json = (await res.json()) as { board: StartupBoardState };
    setState(json.board);
    showToast("已同步");
  }

  async function moveByDrop(taskId: string, targetStatus: TaskStatus) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;
    setPending(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/move`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId, targetStatus })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "移动失败");
      setState(json.board);
      const col = TASK_COLUMNS.find((c) => c.status === targetStatus);
      showToast(`已移至「${col?.label || targetStatus}」`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPending("");
    }
  }

  // ===== Drag handlers =====
  function beginDrag(e: React.PointerEvent<HTMLElement>, task: StartupTask) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button,input,select,textarea,a")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      taskId: task.id, title: task.title, sourceStatus: task.status,
      pointerId: e.pointerId, originX: e.clientX, originY: e.clientY,
      x: e.clientX, y: e.clientY, active: false
    });
  }

  function moveDrag(e: React.PointerEvent<HTMLElement>) {
    setDrag((cur) => {
      if (!cur || cur.pointerId !== e.pointerId) return cur;
      const dist = Math.hypot(e.clientX - cur.originX, e.clientY - cur.originY);
      const active = cur.active || dist > 7;
      const overStatus = active ? getDropStatus(e.clientX, e.clientY) : undefined;
      return { ...cur, x: e.clientX, y: e.clientY, active, overStatus };
    });
  }

  function endDrag(e: React.PointerEvent<HTMLElement>) {
    const cur = drag;
    setDrag(null);
    if (!cur || cur.pointerId !== e.pointerId || !cur.active || !cur.overStatus) return;
    void moveByDrop(cur.taskId, cur.overStatus);
  }

  return (
    <div className="app-shell">
      {/* Desktop Sidebar Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-brand">战</div>
        <button className={`sidebar-item ${tab === "board" ? "active" : ""}`} onClick={() => setTab("board")}>
          <svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h16" /></svg>
          <span>看板</span>
          {(summary.waitingReview + overdueCount) > 0 && <span className="sidebar-badge">{summary.waitingReview + overdueCount}</span>}
        </button>
        <button className={`sidebar-item ${tab === "create" ? "active" : ""}`} onClick={() => setTab("create")}>
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
          <span>派活</span>
        </button>
        <button className={`sidebar-item ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>
          <svg viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 5-5" /></svg>
          <span>数据</span>
        </button>
        <div className="sidebar-spacer" />
        <button className={`sidebar-item ${tab === "me" ? "active" : ""}`} onClick={() => setTab("me")}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>
          <span>我的</span>
        </button>
      </nav>

      {/* Main content wrapper */}
      <div className="app-main">
        {/* Desktop Header */}
        <header className="desktop-header">
          <span className="desktop-header-title">
            {tab === "board" ? "任务看板" : tab === "create" ? "派活" : tab === "stats" ? "数据统计" : "我的"}
          </span>
          <span className={feishuReady ? "desktop-header-status" : "desktop-header-status offline"}>
            {feishuReady ? "飞书已连接" : "本地预览"}
          </span>
          <button className="desktop-header-avatar" onClick={() => setTab("me")}>
            {session?.name?.[0] || activeMember.name[0]}
          </button>
        </header>

        {/* Mobile Top Bar */}
        <header className="top-bar">
          <span className="top-bar-title">
            {session ? `${session.name}的工作台` : "AI交付战情看板"}
          </span>
          <span className={feishuReady ? "top-bar-status" : "top-bar-status offline"}>
            {feishuReady ? "飞书已连接" : "本地预览"}
          </span>
          <button className="top-bar-avatar" onClick={() => setTab("me")} aria-label="我的">
            {session?.name?.[0] || activeMember.name[0]}
          </button>
        </header>

        {/* Toast */}
        {toast && <div className="toast">{toast}</div>}

        {/* Login loading */}
        {loginLoading && <div className="toast">正在通过飞书登录...</div>}

        {/* Page Content */}
        {tab === "board" && (
          <BoardPage
            columns={columns} summary={summary} activeLane={activeLane}
            setActiveLane={setActiveLane} state={state} drag={drag}
            pending={pending} beginDrag={beginDrag} moveDrag={moveDrag}
            endDrag={endDrag} cancelDrag={() => setDrag(null)}
            onRefresh={refresh} overdueCount={overdueCount}
            onSelectTask={setSelectedTask}
          />
        )}
        {tab === "create" && (
          <CreatePage
            state={state} memberId={memberId}
            onCreated={(board) => { setState(board); setTab("board"); showToast("任务已创建"); }}
            onError={(msg) => showToast(msg)}
          />
        )}
        {tab === "me" && (
          <MePage
            state={state} memberId={memberId} setMemberId={setMemberId}
            columns={columns} session={session}
            onLogin={() => { if (isInFeishu()) attemptFeishuLogin(); else showToast("请在飞书中打开以使用飞书登录"); }}
          />
        )}
        {tab === "stats" && (
          <StatsPage state={state} memberId={memberId} />
        )}

        {/* Floating drag card */}
        {drag?.active && (
          <div className="floating-card" style={{ transform: `translate3d(${drag.x + 12}px, ${drag.y - 40}px, 0)` }}>
            <div className="floating-card-title">{drag.title}</div>
            <div className="floating-card-target">
              {drag.overStatus ? `→ ${TASK_COLUMNS.find((c) => c.status === drag.overStatus)?.label}` : "拖到目标列"}
            </div>
          </div>
        )}

        {/* Drop tray (mobile) */}
        {drag?.active && (
          <div className="drop-tray" aria-label="拖拽目标">
            {TASK_COLUMNS.filter((c) => c.status !== drag.sourceStatus).map((col) => (
              <div key={col.status} className={`drop-target ${drag.overStatus === col.status ? "is-over" : ""}`} data-drop-status={col.status}>
                <span>{col.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Task Action Panel */}
        {selectedTask && (
          <TaskActionPanel
            task={selectedTask}
            state={state}
            memberId={memberId}
            onClose={() => setSelectedTask(null)}
            onAction={({ board, message }) => {
              setState(board);
              showToast(message);
              setSelectedTask(null);
            }}
          />
        )}
      </div>

      {/* Bottom Nav (mobile only) */}
      <nav className="bottom-nav">
        <button className={`nav-item ${tab === "board" ? "active" : ""}`} onClick={() => setTab("board")}>
          <svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h16" /></svg>
          <span>看板</span>
          {(summary.waitingReview + overdueCount) > 0 && (
            <span className="nav-badge">{summary.waitingReview + overdueCount}</span>
          )}
        </button>
        <button className={`nav-item ${tab === "create" ? "active" : ""}`} onClick={() => setTab("create")}>
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
          <span>派活</span>
        </button>
        <button className={`nav-item ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>
          <svg viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 5-5" /></svg>
          <span>数据</span>
        </button>
        <button className={`nav-item ${tab === "me" ? "active" : ""}`} onClick={() => setTab("me")}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>
          <span>我的</span>
        </button>
      </nav>
    </div>
  );
}

// ===== Board Page =====
function BoardPage({
  columns, summary, activeLane, setActiveLane, state, drag, pending,
  beginDrag, moveDrag, endDrag, cancelDrag, onRefresh, overdueCount, onSelectTask
}: {
  columns: Record<TaskStatus, StartupTask[]>;
  summary: BoardSummary;
  activeLane: TaskStatus;
  setActiveLane: (s: TaskStatus) => void;
  state: StartupBoardState;
  drag: DragState | null;
  pending: string;
  beginDrag: (e: React.PointerEvent<HTMLElement>, task: StartupTask) => void;
  moveDrag: (e: React.PointerEvent<HTMLElement>) => void;
  endDrag: (e: React.PointerEvent<HTMLElement>) => void;
  cancelDrag: () => void;
  onRefresh: () => void;
  overdueCount: number;
  onSelectTask: (task: StartupTask) => void;
}) {
  const readyCount = columns.pool.length + columns.ready.length;

  return (
    <div className="page-content">
      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-value blue">{readyCount}</div>
          <div className="stat-label">可领取</div>
        </div>
        <div className="stat-item">
          <div className="stat-value green">{summary.inProgress}</div>
          <div className="stat-label">推进中</div>
        </div>
        <div className="stat-item">
          <div className="stat-value orange">{summary.waitingReview}</div>
          <div className="stat-label">待复核</div>
        </div>
        <div className="stat-item">
          <div className="stat-value red">{summary.blocked + overdueCount}</div>
          <div className="stat-label">需关注</div>
        </div>
      </div>

      {/* Lane Tabs */}
      <div className="lane-tabs">
        {TASK_COLUMNS.map((col) => (
          <button key={col.status} className={`lane-tab ${activeLane === col.status ? "active" : ""}`}
            onClick={() => setActiveLane(col.status)}>
            {col.label}
            <span className="lane-tab-count">{columns[col.status].length}</span>
          </button>
        ))}
      </div>

      {/* Mobile: single lane view */}
      <div className="mobile-board">
        <div className="task-list">
          {columns[activeLane].length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">这一列暂时没有任务</div>
            </div>
          )}
          {columns[activeLane].map((task) => (
            <TaskCard key={task.id} task={task} team={state.team}
              pending={pending === task.id} ghosted={drag?.taskId === task.id && drag.active}
              onPointerDown={(e) => beginDrag(e, task)} onPointerMove={moveDrag}
              onPointerUp={endDrag} onPointerCancel={cancelDrag}
              onTap={() => onSelectTask(task)} />
          ))}
        </div>
      </div>

      {/* Desktop: full kanban */}
      <div className="desktop-board">
        <div className="kanban-desktop">
          {TASK_COLUMNS.map((col) => (
            <section key={col.status}
              className={`kanban-column ${drag?.overStatus === col.status ? "is-over" : ""}`}
              data-drop-status={col.status}>
              <div className="kanban-column-header">
                <span className="kanban-column-title">{col.label}</span>
                <span className="kanban-column-count">{columns[col.status].length}</span>
              </div>
              {columns[col.status].map((task) => (
                <TaskCard key={task.id} task={task} team={state.team}
                  pending={pending === task.id} ghosted={drag?.taskId === task.id && drag.active}
                  onPointerDown={(e) => beginDrag(e, task)} onPointerMove={moveDrag}
                  onPointerUp={endDrag} onPointerCancel={cancelDrag}
                  onTap={() => onSelectTask(task)} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Task Card =====
function TaskCard({
  task, team, pending, ghosted,
  onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onTap
}: {
  task: StartupTask; team: StartupBoardState["team"];
  pending: boolean; ghosted: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
  onTap?: () => void;
}) {
  const assignee = team.find((m) => m.id === task.assigneeUserId);
  const isOverdue = task.dueAt && task.status !== "done" && new Date(task.dueAt).getTime() < Date.now();
  const isDueSoon = task.dueAt && task.status !== "done" && !isOverdue &&
    (new Date(task.dueAt).getTime() - Date.now()) < 4 * 60 * 60 * 1000;

  return (
    <article
      className={`task-card ${ghosted ? "ghosted" : ""} ${isOverdue ? "overdue" : ""}`}
      data-task-id={task.id}
      onClick={onTap}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
      style={{ position: "relative" }}>
      <div className="task-card-header">
        <span className={`task-priority ${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
        <span className="task-type">{TYPE_LABEL[task.type]}</span>
        {isOverdue && <span className="task-due-tag overdue">已超期</span>}
        {isDueSoon && <span className="task-due-tag soon">即将到期</span>}
      </div>
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-outcome">{task.outcome}</div>
      {task.blockedReason && <div className="task-blocked-note">⚠ {task.blockedReason}</div>}
      {task.dueAt && (
        <div className="task-due-line">
          截止：{formatDue(task.dueAt)}
        </div>
      )}
      <div className="task-card-footer">
        <div className="task-assignee">
          <span className={`task-assignee-avatar ${assignee ? "" : "empty"}`}>
            {assignee ? assignee.name[0] : "?"}
          </span>
          <span>{assignee ? assignee.name : "未认领"}</span>
        </div>
        {task.riskFlags.length > 0 && (
          <div className="task-risk-tags">
            {task.riskFlags.slice(0, 2).map((flag) => (
              <span key={flag} className="task-risk-tag">{RISK_LABEL[flag] || flag}</span>
            ))}
          </div>
        )}
      </div>
      {pending && <div className="sync-indicator">同步中...</div>}
    </article>
  );
}

// ===== Create Page =====
function CreatePage({
  state, memberId, onCreated, onError
}: {
  state: StartupBoardState; memberId: string;
  onCreated: (board: StartupBoardState) => void;
  onError: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const riskFlags = fd.getAll("riskFlags").map(String);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: fd.get("title"),
          outcome: fd.get("outcome"),
          context: fd.get("context") || "",
          type: fd.get("type"),
          priority: fd.get("priority"),
          acceptanceCriteria: fd.get("acceptanceCriteria"),
          dueAt: fd.get("dueAt") || undefined,
          actorUserId: memberId,
          riskFlags
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "创建失败");
      form.reset();
      onCreated(json.board);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "创建失败";
      setError(msg);
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="create-page">
      <h2>派一个任务</h2>
      <p className="create-hint">说清楚要做什么、做到什么程度算完成。边界不清的任务会先进任务池。</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">任务标题</label>
          <input className="form-input" name="title" placeholder="例：复核张总诊断报告结论" required />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">业务类型</label>
            <select className="form-select" name="type" defaultValue="delivery">
              {Object.entries(TYPE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">优先级</label>
            <select className="form-select" name="priority" defaultValue="normal">
              <option value="urgent">紧急（今天）</option>
              <option value="high">高（明天前）</option>
              <option value="normal">中（本周）</option>
              <option value="low">低（排队）</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">截止时间（选填）</label>
          <input className="form-input" name="dueAt" type="datetime-local" />
        </div>

        <div className="form-group">
          <label className="form-label">完成标准</label>
          <textarea className="form-textarea" name="outcome"
            placeholder="做完后应该产出什么、达到什么效果" required />
        </div>

        <div className="form-group">
          <label className="form-label">验收条件（每行一条，1-6条）</label>
          <textarea className="form-textarea" name="acceptanceCriteria"
            placeholder={"1. 结论无夸大\n2. 数据来源标注\n3. 复核人签字"} required />
        </div>

        <div className="form-group">
          <label className="form-label">背景补充（选填）</label>
          <textarea className="form-textarea" name="context"
            placeholder="相关客户、材料链接、注意事项" style={{ minHeight: 56 }} />
        </div>

        <div className="form-group">
          <label className="form-label">边界标记</label>
          <div className="risk-options">
            {Object.entries(RISK_LABEL).map(([value, label]) => (
              <label key={value} className="risk-option">
                <input type="checkbox" name="riskFlags" value={value} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <button className="submit-btn" type="submit" disabled={submitting}>
          {submitting ? "提交中..." : "提出任务"}
        </button>
        {error && <div className="form-error">{error}</div>}
      </form>
    </div>
  );
}

// ===== Me Page =====
function MePage({
  state, memberId, setMemberId, columns, session, onLogin
}: {
  state: StartupBoardState; memberId: string;
  setMemberId: (id: string) => void;
  columns: Record<TaskStatus, StartupTask[]>;
  session: FeishuUserSession | null;
  onLogin: () => void;
}) {
  const member = state.team.find((m) => m.id === memberId) || state.team[0];
  const myTasks = state.tasks.filter(
    (t) => t.assigneeUserId === memberId && t.status !== "done"
  );
  const activeCount = myTasks.filter(
    (t) => t.status === "claimed" || t.status === "doing" || t.status === "review"
  ).length;
  const wipRatio = activeCount / member.maxActiveTasks;
  const myOverdue = myTasks.filter(
    (t) => t.dueAt && new Date(t.dueAt).getTime() < Date.now()
  );

  return (
    <div className="my-page">
      {/* Identity */}
      <div className="my-header">
        <div className="my-avatar">{session?.name?.[0] || member.name[0]}</div>
        <div className="my-info">
          <h3>{session?.name || member.name}</h3>
          <p>{member.roleLabel}</p>
          {session && <p className="my-login-hint">✓ 飞书已登录</p>}
        </div>
      </div>

      {/* Login button if not logged in via Feishu */}
      {!session && (
        <button className="feishu-login-btn" onClick={onLogin}>
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          飞书登录
        </button>
      )}

      {/* Member switcher */}
      <div className="my-section">
        <div className="my-section-title">
          {session ? "当前身份" : "选择身份（预览模式）"}
        </div>
        <div className="member-switcher">
          {state.team.map((m) => (
            <button key={m.id}
              className={`member-chip ${m.id === memberId ? "active" : ""}`}
              onClick={() => setMemberId(m.id)}>
              <span className="member-chip-avatar">{m.name[0]}</span>
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* WIP */}
      <div className="my-section">
        <div className="my-section-title">当前负载</div>
        <div className="wip-bar">
          <span className="wip-bar-label">WIP</span>
          <div className="wip-bar-track">
            <div className={`wip-bar-fill ${wipRatio >= 1 ? "full" : wipRatio >= 0.75 ? "warning" : ""}`}
              style={{ width: `${Math.min(100, wipRatio * 100)}%` }} />
          </div>
          <span className="wip-bar-text">{activeCount}/{member.maxActiveTasks}</span>
        </div>
      </div>

      {/* Overdue warning */}
      {myOverdue.length > 0 && (
        <div className="my-section">
          <div className="my-section-title" style={{ color: "var(--red)" }}>
            ⚠ 超期任务 ({myOverdue.length})
          </div>
          <div className="task-list">
            {myOverdue.map((task) => (
              <div key={task.id} className="task-card overdue" style={{ cursor: "default", touchAction: "auto" }}>
                <div className="task-card-header">
                  <span className={`task-priority ${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
                  <span className="task-due-tag overdue">超期</span>
                </div>
                <div className="task-card-title">{task.title}</div>
                {task.dueAt && <div className="task-due-line">截止：{formatDue(task.dueAt)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My tasks */}
      <div className="my-section">
        <div className="my-section-title">我的任务 ({myTasks.length})</div>
        <div className="task-list">
          {myTasks.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-text">当前没有进行中的任务，去看板领一个？</div>
            </div>
          )}
          {myTasks.map((task) => (
            <div key={task.id} className="task-card" style={{ cursor: "default", touchAction: "auto" }}>
              <div className="task-card-header">
                <span className={`task-priority ${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
                <span className="task-type">{TYPE_LABEL[task.type]}</span>
                <span className="task-type">{TASK_COLUMNS.find((c) => c.status === task.status)?.label}</span>
              </div>
              <div className="task-card-title">{task.title}</div>
              {task.dueAt && <div className="task-due-line">截止：{formatDue(task.dueAt)}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Utilities =====
function getDropStatus(x: number, y: number): TaskStatus | undefined {
  const el = document.elementsFromPoint(x, y).find((e) => {
    return Boolean((e as HTMLElement).dataset?.dropStatus);
  }) as HTMLElement | undefined;
  return el?.dataset.dropStatus as TaskStatus | undefined;
}

function formatDue(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const hours = Math.round(diff / (1000 * 60 * 60));
  const days = Math.round(diff / (1000 * 60 * 60 * 24));

  const timeStr = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

  if (diff < 0) {
    const absHours = Math.abs(hours);
    if (absHours < 24) return `${timeStr}（超期${absHours}小时）`;
    return `${timeStr}（超期${Math.abs(days)}天）`;
  }
  if (hours < 4) return `${timeStr}（${hours}小时后）`;
  if (days < 1) return `${timeStr}（今天）`;
  if (days < 2) return `${timeStr}（明天）`;
  return timeStr;
}

// ===== Stats Page =====
function StatsPage({ state, memberId }: { state: StartupBoardState; memberId: string }) {
  const now = new Date();

  // Activity heatmap: last 12 weeks (84 days)
  const heatmapData = useMemo(() => {
    const days: Array<{ date: string; count: number; dayOfWeek: number }> = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      // Count workLog entries on this day
      let count = 0;
      for (const task of state.tasks) {
        for (const log of task.workLog) {
          if (log.at.slice(0, 10) === dateStr) count++;
        }
      }
      days.push({ date: dateStr, count, dayOfWeek: d.getDay() });
    }
    return days;
  }, [state.tasks]);

  // Streak: consecutive days with activity
  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const hasActivity = state.tasks.some((t) =>
        t.workLog.some((log) => log.at.slice(0, 10) === dateStr)
      );
      if (hasActivity) count++;
      else if (i > 0) break; // allow today to be empty
    }
    return count;
  }, [state.tasks]);

  // Cycle time: average hours from claimed to done
  const cycleTime = useMemo(() => {
    const doneTasks = state.tasks.filter((t) => t.status === "done" && t.claimedAt && t.completedAt);
    if (doneTasks.length === 0) return null;
    const totalHours = doneTasks.reduce((sum, t) => {
      const start = new Date(t.claimedAt!).getTime();
      const end = new Date(t.completedAt!).getTime();
      return sum + (end - start) / (1000 * 60 * 60);
    }, 0);
    return Math.round(totalHours / doneTasks.length);
  }, [state.tasks]);

  // Throughput: tasks completed per week (last 4 weeks)
  const throughput = useMemo(() => {
    const weeks: Array<{ label: string; count: number }> = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const count = state.tasks.filter((t) => {
        if (!t.completedAt) return false;
        const completed = new Date(t.completedAt).getTime();
        return completed >= weekStart.getTime() && completed < weekEnd.getTime();
      }).length;
      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      weeks.push({ label, count });
    }
    return weeks;
  }, [state.tasks]);

  const maxThroughput = Math.max(...throughput.map((w) => w.count), 1);

  // Upcoming milestones: tasks with dueAt sorted by date
  const milestones = useMemo(() => {
    return state.tasks
      .filter((t) => t.dueAt && t.status !== "done")
      .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
      .slice(0, 6);
  }, [state.tasks]);

  // Per-member stats
  const memberStats = useMemo(() => {
    return state.team.map((m) => {
      const completed = state.tasks.filter((t) => t.assigneeUserId === m.id && t.status === "done").length;
      const active = state.tasks.filter((t) => t.assigneeUserId === m.id && t.status !== "done" && t.status !== "pool" && t.status !== "ready").length;
      return { ...m, completed, active };
    });
  }, [state]);

  return (
    <div className="stats-page">
      {/* Streak + Cycle Time */}
      <div className="stats-highlights">
        <div className="highlight-card">
          <div className="highlight-value">{streak}</div>
          <div className="highlight-label">连续活跃天</div>
        </div>
        <div className="highlight-card">
          <div className="highlight-value">{cycleTime !== null ? `${cycleTime}h` : "-"}</div>
          <div className="highlight-label">平均周期</div>
        </div>
        <div className="highlight-card">
          <div className="highlight-value">{state.tasks.filter((t) => t.status === "done").length}</div>
          <div className="highlight-label">已完成</div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="stats-section">
        <div className="stats-section-title">活动热力图（12周）</div>
        <div className="heatmap-container">
          <div className="heatmap-grid">
            {heatmapData.map((day, i) => (
              <div key={i} className={`heatmap-cell level-${Math.min(4, day.count)}`}
                title={`${day.date}: ${day.count} 次操作`}
                style={{ gridRow: day.dayOfWeek + 1 }} />
            ))}
          </div>
          <div className="heatmap-legend">
            <span>少</span>
            <div className="heatmap-cell level-0" />
            <div className="heatmap-cell level-1" />
            <div className="heatmap-cell level-2" />
            <div className="heatmap-cell level-3" />
            <div className="heatmap-cell level-4" />
            <span>多</span>
          </div>
        </div>
      </div>

      {/* Throughput Bar Chart */}
      <div className="stats-section">
        <div className="stats-section-title">每周吞吐量</div>
        <div className="throughput-chart">
          {throughput.map((week, i) => (
            <div key={i} className="throughput-bar-wrapper">
              <div className="throughput-bar"
                style={{ height: `${(week.count / maxThroughput) * 100}%` }}>
                {week.count > 0 && <span>{week.count}</span>}
              </div>
              <div className="throughput-label">{week.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Leaderboard */}
      <div className="stats-section">
        <div className="stats-section-title">团队工作量</div>
        <div className="leaderboard">
          {memberStats.map((m) => (
            <div key={m.id} className="leaderboard-row">
              <span className="leaderboard-avatar">{m.name[0]}</span>
              <span className="leaderboard-name">{m.name}</span>
              <div className="leaderboard-bars">
                <span className="leaderboard-done" style={{ width: `${Math.min(100, m.completed * 20)}%` }} />
              </div>
              <span className="leaderboard-count">{m.completed} 完成 / {m.active} 进行</span>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone Calendar */}
      {milestones.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">即将到来的里程碑</div>
          <div className="milestone-list">
            {milestones.map((task) => {
              const due = new Date(task.dueAt!);
              const isOverdue = due.getTime() < now.getTime();
              return (
                <div key={task.id} className={`milestone-item ${isOverdue ? "overdue" : ""}`}>
                  <div className="milestone-date">
                    <span className="milestone-month">{due.getMonth() + 1}月</span>
                    <span className="milestone-day">{due.getDate()}</span>
                  </div>
                  <div className="milestone-info">
                    <div className="milestone-title">{task.title}</div>
                    <div className="milestone-meta">
                      <span className={`task-priority ${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
                      <span>{TYPE_LABEL[task.type]}</span>
                      {isOverdue && <span className="task-due-tag overdue">超期</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
