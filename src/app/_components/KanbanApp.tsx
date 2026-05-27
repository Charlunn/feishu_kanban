"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TASK_TYPES } from "@/domain/models";
import type { BoardSummary, FeishuUserSession, MemberMode, StartupBoardState, StartupTask, TaskPriority, TaskStatus, TaskType, TeamMember, TeamPermission } from "@/domain/models";
import { TASK_COLUMNS } from "@/domain/operations";
import { ALL_PERMISSIONS, PERMISSION_LABELS, boardRoles, canCreateTask, canDeleteTask, canManageRoles, canManageTeam, roleForMember } from "@/domain/permissions";
import { TaskActionPanel } from "./TaskActionPanel";
import { setNavTitle, setNavFeishuBlue, isInFeishu, requestFeishuAuthCode } from "@/lib/feishu/jssdk";

// ===== Constants =====
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: "紧急", high: "高", normal: "中", low: "低"
};

const TYPE_LABEL: Record<TaskType, string> = {
  sales: "线索跟进", diagnosis: "诊断复核", delivery: "交付验收",
  quote: "报价确认", ops: "内部运营", product: "产品搭建", feishu: "飞书集成"
};

const RISK_LABEL: Record<string, string> = {
  customer_facing: "客户可见", ai_output: "AI草稿",
  quote_scope: "报价", sensitive_data: "敏感", ops_only: "内部"
};

const MODE_LABEL: Record<MemberMode, string> = {
  available: "可接任务",
  focused: "专注中",
  reviewing: "复核中",
  away: "离开"
};

type Tab = "board" | "gantt" | "create" | "stats" | "admin" | "me";

type MemberPatch = {
  name?: string;
  roleId?: string;
  permissions?: TeamPermission[];
  mode?: MemberMode;
  maxActiveTasks?: number;
  skills?: TaskType[];
};

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

const GUEST_MEMBER: TeamMember = {
  id: "guest",
  name: "未登录",
  roleLabel: "访客",
  feishuOpenId: "",
  roleId: "role_employee",
  permissions: [],
  mode: "available",
  maxActiveTasks: 0,
  skills: []
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
  const [inFeishuClient, setInFeishuClient] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeMember = state.team.find((m) => m.id === memberId) || state.team[0] || GUEST_MEMBER;
  const mayCreateTask = activeMember ? canCreateTask(activeMember, state) : false;
  const mayManageTeam = activeMember ? canManageTeam(activeMember, state) : false;
  const mayManageRoles = activeMember ? canManageRoles(activeMember, state) : false;
  const mayDeleteTask = activeMember ? canDeleteTask(activeMember, state) : false;
  const connectionLabel = session ? "飞书已登录" : inFeishuClient ? "飞书内打开" : feishuReady ? "飞书已配置" : "本地预览";

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
    setInFeishuClient(isInFeishu());
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
      gantt: "甘特图",
      create: "派活",
      stats: "数据统计",
      admin: "管理",
      me: "我的"
    };
    setNavTitle(tabNames[tab]);
  }, [tab, summary.waitingReview, overdueCount]);

  useEffect(() => {
    if (tab === "create" && !mayCreateTask) setTab("board");
  }, [tab, mayCreateTask]);

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
        if (json.board) setState(json.board);
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
      <nav className={`sidebar-nav ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-brand-row">
          <div className="sidebar-brand">
            <img src="/brand/logo-icon-white-64.png" alt="DOTSTACK" className="sidebar-brand-logo" width={36} height={36} />
            <div className="sidebar-brand-copy">
              <strong>点栈 KANBAN</strong>
              <span>DOTSTACK</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
            title={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
          >
            <svg viewBox="0 0 24 24">
              {sidebarCollapsed ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
            </svg>
          </button>
        </div>
        <button className={`sidebar-item ${tab === "board" ? "active" : ""}`} onClick={() => setTab("board")}>
          <svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h16" /></svg>
          <span className="sidebar-item-label">看板</span>
          {(summary.waitingReview + overdueCount) > 0 && <span className="sidebar-badge">{summary.waitingReview + overdueCount}</span>}
        </button>
        <button className={`sidebar-item ${tab === "gantt" ? "active" : ""}`} onClick={() => setTab("gantt")}>
          <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h7" /></svg>
          <span className="sidebar-item-label">甘特</span>
        </button>
        {mayCreateTask && (
          <button className={`sidebar-item ${tab === "create" ? "active" : ""}`} onClick={() => setTab("create")}>
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
            <span className="sidebar-item-label">派活</span>
          </button>
        )}
        <button className={`sidebar-item ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>
          <svg viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 5-5" /></svg>
          <span className="sidebar-item-label">数据</span>
        </button>
        {(mayManageTeam || mayManageRoles) && (
          <button className={`sidebar-item ${tab === "admin" ? "active" : ""}`} onClick={() => setTab("admin")}>
            <svg viewBox="0 0 24 24"><path d="M12 3v18M5 8h14M7 16h10" /></svg>
            <span className="sidebar-item-label">管理</span>
          </button>
        )}
        <div className="sidebar-spacer" />
        <button className={`sidebar-item ${tab === "me" ? "active" : ""}`} onClick={() => setTab("me")}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>
          <span className="sidebar-item-label">我的</span>
        </button>
      </nav>

      {/* Main content wrapper */}
      <div className="app-main">
        {/* Desktop Header */}
        <header className="desktop-header">
          <span className="desktop-header-title">
            {tab === "board" ? "任务看板" : tab === "gantt" ? "甘特图" : tab === "create" ? "派活" : tab === "stats" ? "数据统计" : tab === "admin" ? "管理后台" : "我的"}
          </span>
          <div className="desktop-header-brand">
            <img src="/brand/logo-icon-color-64.png" alt="" aria-hidden="true" width={18} height={18} />
            <span>点栈 KANBAN</span>
          </div>
          <span className={session || inFeishuClient || feishuReady ? "desktop-header-status" : "desktop-header-status offline"}>
            {connectionLabel}
          </span>
          <button className="desktop-header-avatar" onClick={() => setTab("me")}>
            {session?.name?.[0] || activeMember.name[0]}
          </button>
        </header>

        {/* Mobile Top Bar */}
        <header className="top-bar">
          <span className="top-bar-title">
            {session ? `${session.name} · 点栈 KANBAN` : "点栈 KANBAN"}
          </span>
          <span className={session || inFeishuClient || feishuReady ? "top-bar-status" : "top-bar-status offline"}>
            {connectionLabel}
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
        {tab === "gantt" && (
          <GanttPage state={state} onSelectTask={setSelectedTask} />
        )}
        {tab === "create" && mayCreateTask && (
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
            canManage={mayManageTeam}
            canManageRoles={mayManageRoles}
            onTeamUpdated={setState}
            onError={showToast}
            onLogin={() => { if (isInFeishu()) attemptFeishuLogin(); else showToast("请在飞书中打开以使用飞书登录"); }}
          />
        )}
        {tab === "stats" && (
          <StatsPage state={state} memberId={memberId} />
        )}
        {tab === "admin" && (mayManageTeam || mayManageRoles) && (
          <AdminPage
            state={state}
            memberId={memberId}
            canManage={mayManageTeam}
            canManageRoles={mayManageRoles}
            onTeamUpdated={setState}
            onError={showToast}
          />
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
            canDelete={mayDeleteTask}
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
        <button className={`nav-item ${tab === "gantt" ? "active" : ""}`} onClick={() => setTab("gantt")}>
          <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h7" /></svg>
          <span>甘特</span>
        </button>
        {mayCreateTask && (
          <button className={`nav-item ${tab === "create" ? "active" : ""}`} onClick={() => setTab("create")}>
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
            <span>派活</span>
          </button>
        )}
        <button className={`nav-item ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>
          <svg viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 5-5" /></svg>
          <span>数据</span>
        </button>
        {(mayManageTeam || mayManageRoles) && (
          <button className={`nav-item ${tab === "admin" ? "active" : ""}`} onClick={() => setTab("admin")}>
            <svg viewBox="0 0 24 24"><path d="M12 3v18M5 8h14M7 16h10" /></svg>
            <span>管理</span>
          </button>
        )}
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
          acceptanceCriteria: fd.get("acceptanceCriteria") ?? "",
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
          <label className="form-label">验收条件（选填，每行一条，最多 6 条）</label>
          <textarea className="form-textarea" name="acceptanceCriteria"
            placeholder={"1. 结论无夸大\n2. 数据来源标注\n3. 复核人签字"} />
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
  state, memberId, setMemberId, columns, session, canManage, canManageRoles, onTeamUpdated, onError, onLogin
}: {
  state: StartupBoardState; memberId: string;
  setMemberId: (id: string) => void;
  columns: Record<TaskStatus, StartupTask[]>;
  session: FeishuUserSession | null;
  canManage: boolean;
  canManageRoles: boolean;
  onTeamUpdated: (state: StartupBoardState) => void;
  onError: (message: string) => void;
  onLogin: () => void;
}) {
  void columns;
  const member = state.team.find((m) => m.id === memberId) || state.team[0] || GUEST_MEMBER;
  const myTasks = state.tasks.filter(
    (t) => t.assigneeUserId === memberId && t.status !== "done"
  );
  const activeCount = myTasks.filter(
    (t) => t.status === "claimed" || t.status === "doing" || t.status === "review"
  ).length;
  const wipRatio = member.maxActiveTasks > 0 ? activeCount / member.maxActiveTasks : 1;
  const myOverdue = myTasks.filter(
    (t) => t.dueAt && new Date(t.dueAt).getTime() < Date.now()
  );
  const roles = boardRoles(state);
  const [newRoleName, setNewRoleName] = useState("");
  const [tokenName, setTokenName] = useState("网页 AI Token");
  const [agentTokens, setAgentTokens] = useState<Array<{ id: string; name: string; tokenPreview: string; createdAt: string; lastUsedAt?: string; revokedAt?: string }>>([]);
  const [agentBusy, setAgentBusy] = useState(false);
  const [freshToken, setFreshToken] = useState("");
  const [skillBundle, setSkillBundle] = useState<{ fileName: string; content: string; cliCommand: string; cliDownloadPath: string } | null>(null);

  useEffect(() => {
    if (!session) {
      setAgentTokens([]);
      setFreshToken("");
      setSkillBundle(null);
      return;
    }
    void loadAgentTokens();
  }, [session?.memberId, session?.accessToken]);

  function formatDateTime(value?: string) {
    if (!value) return "未使用";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
  }

  function downloadText(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  async function loadAgentTokens() {
    if (!session) return;
    try {
      const res = await fetch(`/api/agent/tokens?memberId=${encodeURIComponent(session.memberId)}`, {
        headers: {
          "x-feishu-access-token": session.accessToken
        }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "获取 AI Token 失败");
      setAgentTokens(json.data.tokens || []);
    } catch (error) {
      onError(error instanceof Error ? error.message : "获取 AI Token 失败");
    }
  }

  async function createAgentToken() {
    if (!session) {
      onError("请先通过飞书登录。");
      return;
    }
    setAgentBusy(true);
    try {
      const res = await fetch("/api/agent/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          memberId: session.memberId,
          accessToken: session.accessToken,
          name: tokenName.trim() || "网页 AI Token"
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "创建 AI Token 失败");
      setFreshToken(json.data.token);
      setSkillBundle(json.data.skill);
      setAgentTokens(json.data.tokens || []);
      onTeamUpdated(json.data.board);
      onError("已生成新的 AI Token。");
    } catch (error) {
      onError(error instanceof Error ? error.message : "创建 AI Token 失败");
    } finally {
      setAgentBusy(false);
    }
  }

  async function revokeAgentToken(tokenId: string) {
    if (!session) return;
    setAgentBusy(true);
    try {
      const res = await fetch(`/api/agent/tokens/${tokenId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          memberId: session.memberId,
          accessToken: session.accessToken
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "吊销 AI Token 失败");
      setAgentTokens(json.data.tokens || []);
      if (freshToken) {
        setFreshToken("");
        setSkillBundle(null);
      }
      onError("AI Token 已吊销。");
    } catch (error) {
      onError(error instanceof Error ? error.message : "吊销 AI Token 失败");
    } finally {
      setAgentBusy(false);
    }
  }

  async function updateMember(targetId: string, patch: MemberPatch) {
    try {
      const res = await fetch(`/api/team/${targetId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actorUserId: memberId, ...patch })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "成员更新失败");
      onTeamUpdated(json.board);
    } catch (error) {
      onError(error instanceof Error ? error.message : "成员更新失败");
    }
  }

  async function createRole() {
    const name = newRoleName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actorUserId: memberId, name, permissions: [] })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "角色创建失败");
      setNewRoleName("");
      onTeamUpdated(json.board);
    } catch (error) {
      onError(error instanceof Error ? error.message : "角色创建失败");
    }
  }

  async function updateRole(roleId: string, patch: { name?: string; permissions?: TeamPermission[] }) {
    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actorUserId: memberId, ...patch })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "角色更新失败");
      onTeamUpdated(json.board);
    } catch (error) {
      onError(error instanceof Error ? error.message : "角色更新失败");
    }
  }

  async function deleteRole(roleId: string) {
    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actorUserId: memberId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "角色删除失败");
      onTeamUpdated(json.board);
    } catch (error) {
      onError(error instanceof Error ? error.message : "角色删除失败");
    }
  }

  return (
    <div className="my-page">
      <div className="my-header">
        <div className="my-avatar">{session?.name?.[0] || member.name[0]}</div>
        <div className="my-info">
          <h3>{session?.name || member.name}</h3>
          <p>{member.roleLabel}</p>
          {session && <p className="my-login-hint">✓ 飞书已登录</p>}
        </div>
      </div>

      {!session && (
        <button className="feishu-login-btn" onClick={onLogin}>
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          飞书登录
        </button>
      )}

      <div className="my-section">
        <div className="my-section-title">
          {session ? "当前身份" : "选择身份（预览模式）"}
        </div>
        <div className="member-switcher">
          {(session ? state.team.filter((m) => m.id === memberId) : state.team).map((m) => (
            <button key={m.id}
              className={`member-chip ${m.id === memberId ? "active" : ""}`}
              onClick={() => { if (!session) setMemberId(m.id); }}>
              <span className="member-chip-avatar">{m.name[0]}</span>
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="my-section">
        <div className="my-section-title">AI 代理</div>
        {!session && (
          <div className="empty-state">
            <div className="empty-state-text">先用飞书登录，才能生成你的专属 AI Token 和 Skill。</div>
          </div>
        )}
        {session && (
          <div className="agent-panel">
            <div className="agent-form-row">
              <input
                className="form-input"
                value={tokenName}
                onChange={(event) => setTokenName(event.currentTarget.value)}
                placeholder="Token 名称"
              />
              <button className="action-btn action-primary" onClick={createAgentToken} disabled={agentBusy}>
                {agentBusy ? "处理中..." : "生成 Token"}
              </button>
            </div>
            <div className="agent-hint">
              生成后可直接下载专属 Skill，外部 AI 会自动带上当前用户 Token 调用你的 Web API。
            </div>

            {freshToken && skillBundle && (
              <div className="agent-result-card">
                <div className="agent-result-title">刚生成的 Token</div>
                <code className="agent-token-value">{freshToken}</code>
                <div className="agent-action-row">
                  <button className="action-btn action-secondary" onClick={() => navigator.clipboard?.writeText(freshToken).then(() => onError("Token 已复制。")).catch(() => onError("复制失败，请手动复制。"))}>
                    复制 Token
                  </button>
                  <button className="action-btn action-secondary" onClick={() => downloadText(skillBundle.fileName, skillBundle.content)}>
                    下载 Skill
                  </button>
                  <button className="action-btn action-secondary" onClick={() => navigator.clipboard?.writeText(skillBundle.cliCommand).then(() => onError("CLI 命令已复制。")).catch(() => onError("复制失败，请手动复制。"))}>
                    复制 CLI 命令
                  </button>
                  <a className="action-btn action-secondary agent-link-btn" href={skillBundle.cliDownloadPath} download>
                    下载 CLI
                  </a>
                </div>
              </div>
            )}

            <div className="agent-token-list">
              {(agentTokens.length === 0) && (
                <div className="empty-state">
                  <div className="empty-state-text">还没有可用的 AI Token。</div>
                </div>
              )}
              {agentTokens.map((token) => (
                <div key={token.id} className="task-card" style={{ cursor: "default", touchAction: "auto" }}>
                  <div className="task-card-header">
                    <span className="task-type">{token.name}</span>
                    <span className={`task-type ${token.revokedAt ? "task-type-danger" : ""}`}>
                      {token.revokedAt ? "已吊销" : "生效中"}
                    </span>
                  </div>
                  <div className="task-card-title" style={{ fontSize: 14 }}>{token.tokenPreview}</div>
                  <div className="task-due-line">创建时间：{formatDateTime(token.createdAt)}</div>
                  <div className="task-due-line">最后使用：{formatDateTime(token.lastUsedAt)}</div>
                  {!token.revokedAt && (
                    <div className="agent-action-row" style={{ marginTop: 10 }}>
                      <button className="action-btn action-danger" onClick={() => revokeAgentToken(token.id)} disabled={agentBusy}>
                        吊销
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {canManage && (
        <div className="my-section" style={{ display: "none" }}>
          <div className="my-section-title">成员管理</div>
          <div className="task-list">
            {state.team.map((m) => {
              const role = roleForMember(state, m);
              const explicit = (m.permissions || []).filter((permission) => !role.permissions.includes(permission));
              return (
                <div key={m.id} className="task-card" style={{ cursor: "default", touchAction: "auto" }}>
                  <div className="task-card-header">
                    <span className="task-type">{role.name}</span>
                    <span className="task-type">{m.feishuOpenId ? "已绑定飞书" : "未绑定"}</span>
                  </div>
                  <input
                    className="form-input"
                    defaultValue={m.name}
                    onBlur={(event) => {
                      const name = event.currentTarget.value.trim();
                      if (name && name !== m.name) updateMember(m.id, { name });
                    }}
                    aria-label="成员名称"
                  />
                  <select className="form-select" value={role.id} onChange={(event) => updateMember(m.id, { roleId: event.currentTarget.value })}>
                    {roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <div className="risk-options compact">
                    {ALL_PERMISSIONS.map((permission) => (
                      <label key={permission} className="risk-option">
                        <input
                          type="checkbox"
                          checked={role.permissions.includes(permission) || explicit.includes(permission)}
                          disabled={role.permissions.includes(permission)}
                          onChange={(event) => {
                            const next = new Set(explicit);
                            if (event.currentTarget.checked) next.add(permission);
                            else next.delete(permission);
                            updateMember(m.id, { permissions: Array.from(next) });
                          }}
                        />
                        {PERMISSION_LABELS[permission]}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {canManageRoles && (
        <div className="my-section" style={{ display: "none" }}>
          <div className="my-section-title">角色管理</div>
          <div className="action-form" style={{ marginBottom: 10 }}>
            <input className="form-input" placeholder="新角色名称" value={newRoleName} onChange={(event) => setNewRoleName(event.currentTarget.value)} />
            <button className="action-btn action-primary" onClick={createRole} disabled={!newRoleName.trim()}>创建角色</button>
          </div>
          <div className="task-list">
            {roles.map((role) => (
              <div key={role.id} className="task-card" style={{ cursor: "default", touchAction: "auto" }}>
                <div className="task-card-header">
                  <span className="task-type">{role.system ? "系统角色" : "自定义角色"}</span>
                  {!role.system && <button className="panel-icon-btn" onClick={() => deleteRole(role.id)}>删除</button>}
                </div>
                <input
                  className="form-input"
                  defaultValue={role.name}
                  disabled={role.id === "role_founder"}
                  onBlur={(event) => {
                    const name = event.currentTarget.value.trim();
                    if (name && name !== role.name) updateRole(role.id, { name });
                  }}
                />
                <div className="risk-options compact">
                  {ALL_PERMISSIONS.map((permission) => (
                    <label key={permission} className="risk-option">
                      <input
                        type="checkbox"
                        checked={role.permissions.includes(permission)}
                        disabled={role.id === "role_founder"}
                        onChange={(event) => {
                          const next = new Set(role.permissions);
                          if (event.currentTarget.checked) next.add(permission);
                          else next.delete(permission);
                          updateRole(role.id, { permissions: Array.from(next) });
                        }}
                      />
                      {PERMISSION_LABELS[permission]}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {myOverdue.length > 0 && (
        <div className="my-section">
          <div className="my-section-title" style={{ color: "var(--red)" }}>
            超期任务 ({myOverdue.length})
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

// ===== Admin Page =====
function AdminPage({
  state,
  memberId,
  canManage,
  canManageRoles,
  onTeamUpdated,
  onError
}: {
  state: StartupBoardState;
  memberId: string;
  canManage: boolean;
  canManageRoles: boolean;
  onTeamUpdated: (state: StartupBoardState) => void;
  onError: (message: string) => void;
}) {
  const roles = boardRoles(state);
  const [newRoleName, setNewRoleName] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState(state.team[0]?.id || "");
  const selectedMember = state.team.find((member) => member.id === selectedMemberId) || state.team[0];

  useEffect(() => {
    if (!state.team.some((member) => member.id === selectedMemberId)) {
      setSelectedMemberId(state.team[0]?.id || "");
    }
  }, [selectedMemberId, state.team]);

  async function updateMember(targetId: string, patch: MemberPatch) {
    try {
      const res = await fetch(`/api/team/${targetId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actorUserId: memberId, ...patch })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "成员更新失败");
      onTeamUpdated(json.board);
    } catch (error) {
      onError(error instanceof Error ? error.message : "成员更新失败");
    }
  }

  async function createRole() {
    const name = newRoleName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actorUserId: memberId, name, permissions: [] })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "角色创建失败");
      setNewRoleName("");
      onTeamUpdated(json.board);
    } catch (error) {
      onError(error instanceof Error ? error.message : "角色创建失败");
    }
  }

  async function updateRole(roleId: string, patch: { name?: string; permissions?: TeamPermission[] }) {
    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actorUserId: memberId, ...patch })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "角色更新失败");
      onTeamUpdated(json.board);
    } catch (error) {
      onError(error instanceof Error ? error.message : "角色更新失败");
    }
  }

  async function deleteRole(roleId: string) {
    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actorUserId: memberId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "角色删除失败");
      onTeamUpdated(json.board);
    } catch (error) {
      onError(error instanceof Error ? error.message : "角色删除失败");
    }
  }

  function activeTasksForMember(targetId: string): number {
    return state.tasks.filter((task) => task.assigneeUserId === targetId && ["claimed", "doing", "review"].includes(task.status)).length;
  }

  return (
    <div className="admin-page">
      <div className="analytics-hero">
        <div>
          <h2>管理后台</h2>
          <p>管理用户、角色和权限。用户随飞书账号自动加入，不限制人数。</p>
        </div>
      </div>

      <div className="admin-grid">
        {canManage && (
          <section className="analytics-card wide">
            <div className="analytics-card-header">
              <div>
                <h3>用户管理</h3>
                <p>{state.team.length} 个账号，权限跟随账号而不是角色统计口径。</p>
              </div>
            </div>
            <div className="admin-user-shell">
              <div className="admin-user-table" role="table" aria-label="用户列表">
                <div className="admin-user-row admin-user-row-head" role="row">
                  <span>用户</span>
                  <span>角色</span>
                  <span>状态</span>
                  <span>负载</span>
                </div>
                {state.team.map((m) => {
                  const role = roleForMember(state, m);
                  const activeCount = activeTasksForMember(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`admin-user-row ${selectedMember?.id === m.id ? "active" : ""}`}
                      onClick={() => setSelectedMemberId(m.id)}
                    >
                      <span className="admin-user-cell-main">
                        {m.avatarUrl ? <img className="admin-user-avatar" src={m.avatarUrl} alt="" /> : <span className="admin-user-avatar fallback">{m.name[0]}</span>}
                        <span>
                          <strong>{m.name}</strong>
                          <small>{m.feishuOpenId || "未绑定飞书"}</small>
                        </span>
                      </span>
                      <span>{role.name}</span>
                      <span>{MODE_LABEL[m.mode]}</span>
                      <span>{activeCount}/{m.maxActiveTasks}</span>
                    </button>
                  );
                })}
              </div>

              {selectedMember && (() => {
                const role = roleForMember(state, selectedMember);
                const explicit = (selectedMember.permissions || []).filter((permission) => !role.permissions.includes(permission));
                const activeCount = activeTasksForMember(selectedMember.id);
                const selectedSkills = selectedMember.skills || [];
                return (
                  <aside key={selectedMember.id} className="admin-user-detail">
                    <div className="admin-user-detail-head">
                      {selectedMember.avatarUrl ? <img className="admin-user-avatar large" src={selectedMember.avatarUrl} alt="" /> : <span className="admin-user-avatar large fallback">{selectedMember.name[0]}</span>}
                      <div>
                        <strong>{selectedMember.name}</strong>
                        <small>{role.name} · {activeCount}/{selectedMember.maxActiveTasks}</small>
                      </div>
                    </div>

                    <div className="admin-form-grid">
                      <label>
                        <span>姓名</span>
                        <input
                          className="form-input"
                          defaultValue={selectedMember.name}
                          onBlur={(event) => {
                            const name = event.currentTarget.value.trim();
                            if (name && name !== selectedMember.name) updateMember(selectedMember.id, { name });
                          }}
                        />
                      </label>
                      <label>
                        <span>角色</span>
                        <select className="form-select" value={role.id} onChange={(event) => updateMember(selectedMember.id, { roleId: event.currentTarget.value })}>
                          {roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>状态</span>
                        <select className="form-select" value={selectedMember.mode} onChange={(event) => updateMember(selectedMember.id, { mode: event.currentTarget.value as MemberMode })}>
                          {Object.entries(MODE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>负载上限</span>
                        <input
                          className="form-input"
                          type="number"
                          min={0}
                          defaultValue={selectedMember.maxActiveTasks}
                          onBlur={(event) => {
                            const maxActiveTasks = Number(event.currentTarget.value);
                            if (Number.isInteger(maxActiveTasks) && maxActiveTasks >= 0 && maxActiveTasks !== selectedMember.maxActiveTasks) {
                              updateMember(selectedMember.id, { maxActiveTasks });
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="admin-fieldset">
                      <div className="admin-fieldset-title">技能</div>
                      <div className="admin-check-grid">
                        {TASK_TYPES.map((type) => (
                          <label key={type} className="risk-option">
                            <input
                              type="checkbox"
                              checked={selectedSkills.includes(type)}
                              onChange={(event) => {
                                const next = new Set(selectedSkills);
                                if (event.currentTarget.checked) next.add(type);
                                else next.delete(type);
                                updateMember(selectedMember.id, { skills: Array.from(next) });
                              }}
                            />
                            {TYPE_LABEL[type]}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="admin-fieldset">
                      <div className="admin-fieldset-title">额外权限</div>
                      <div className="admin-check-grid">
                        {ALL_PERMISSIONS.map((permission) => (
                          <label key={permission} className="risk-option">
                            <input
                              type="checkbox"
                              checked={role.permissions.includes(permission) || explicit.includes(permission)}
                              disabled={role.permissions.includes(permission)}
                              onChange={(event) => {
                                const next = new Set(explicit);
                                if (event.currentTarget.checked) next.add(permission);
                                else next.delete(permission);
                                updateMember(selectedMember.id, { permissions: Array.from(next) });
                              }}
                            />
                            {PERMISSION_LABELS[permission]}
                          </label>
                        ))}
                      </div>
                    </div>

                    <dl className="admin-user-meta">
                      <div><dt>Open ID</dt><dd>{selectedMember.feishuOpenId || "未绑定"}</dd></div>
                      {selectedMember.feishuUnionId && <div><dt>Union ID</dt><dd>{selectedMember.feishuUnionId}</dd></div>}
                      <div><dt>最后登录</dt><dd>{selectedMember.lastLoginAt ? new Date(selectedMember.lastLoginAt).toLocaleString("zh-CN") : "无记录"}</dd></div>
                    </dl>
                  </aside>
                );
              })()}
            </div>
          </section>
        )}

        {canManageRoles && (
          <section className="analytics-card">
            <div className="analytics-card-header">
              <div>
                <h3>角色管理</h3>
                <p>创建角色并定义默认权限，再分配给用户。</p>
              </div>
            </div>
            <div className="action-form" style={{ marginBottom: 12 }}>
              <input className="form-input" placeholder="新角色名称" value={newRoleName} onChange={(event) => setNewRoleName(event.currentTarget.value)} />
              <button className="action-btn action-primary" onClick={createRole} disabled={!newRoleName.trim()}>创建角色</button>
            </div>
            <div className="admin-role-list">
              {roles.map((role) => (
                <div key={role.id} className="admin-role-card">
                  <div className="admin-user-head">
                    <div>
                      <strong>{role.name}</strong>
                      <small>{role.system ? "系统角色" : "自定义角色"}</small>
                    </div>
                    {!role.system && <button className="panel-icon-btn" onClick={() => deleteRole(role.id)}>删除</button>}
                  </div>
                  <input
                    className="form-input"
                    defaultValue={role.name}
                    onBlur={(event) => {
                      const name = event.currentTarget.value.trim();
                      if (name && name !== role.name) updateRole(role.id, { name });
                    }}
                  />
                  <div className="risk-options compact">
                    {ALL_PERMISSIONS.map((permission) => (
                      <label key={permission} className="risk-option">
                        <input
                          type="checkbox"
                          checked={role.permissions.includes(permission)}
                          onChange={(event) => {
                            const next = new Set(role.permissions);
                            if (event.currentTarget.checked) next.add(permission);
                            else next.delete(permission);
                            updateRole(role.id, { permissions: Array.from(next) });
                          }}
                        />
                        {PERMISSION_LABELS[permission]}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ===== Gantt Page =====
function GanttPage({
  state,
  onSelectTask
}: {
  state: StartupBoardState;
  onSelectTask: (task: StartupTask) => void;
}) {
  const [rangeDays, setRangeDays] = useState(30);
  const [memberFilter, setMemberFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");

  const today = startOfDay(new Date());
  const rangeStart = useMemo(() => {
    const earliest = state.tasks.reduce<Date | null>((acc, task) => {
      const start = taskStartDate(task);
      return !acc || start < acc ? start : acc;
    }, null);
    return earliest && earliest < today ? earliest : today;
  }, [state.tasks, today]);
  const rangeEnd = useMemo(() => addDays(today, rangeDays), [today, rangeDays]);

  const days = useMemo(() => {
    const total = Math.max(1, daysBetween(rangeStart, rangeEnd) + 1);
    return Array.from({ length: total }, (_, index) => addDays(rangeStart, index));
  }, [rangeStart, rangeEnd]);

  const rows = useMemo(() => {
    return state.tasks
      .filter((task) => task.status !== "done" || task.completedAt)
      .filter((task) => memberFilter === "all" || task.assigneeUserId === memberFilter || task.createdByUserId === memberFilter)
      .filter((task) => statusFilter === "all" || task.status === statusFilter)
      .map((task) => {
        const start = taskStartDate(task);
        const end = taskEndDate(task);
        const left = clampPercent((daysBetween(rangeStart, start) / Math.max(1, days.length - 1)) * 100);
        const width = Math.max(3, clampPercent((Math.max(1, daysBetween(start, end) + 1) / Math.max(1, days.length)) * 100));
        const assignee = state.team.find((member) => member.id === task.assigneeUserId);
        const overdue = Boolean(task.dueAt && task.status !== "done" && new Date(task.dueAt).getTime() < Date.now());
        return { task, start, end, left, width, assignee, overdue };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime() || PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority]);
  }, [state, memberFilter, statusFilter, rangeStart, days.length]);

  const milestoneTasks = useMemo(() => {
    return state.tasks
      .filter((task) => task.dueAt && task.status !== "done")
      .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
      .slice(0, 5);
  }, [state.tasks]);

  const overloadedMembers = useMemo(() => {
    return state.team
      .map((member) => {
        const active = state.tasks.filter((task) => task.assigneeUserId === member.id && ["claimed", "doing", "review"].includes(task.status)).length;
        return { member, active };
      })
      .filter((item) => item.member.maxActiveTasks > 0 && item.active >= item.member.maxActiveTasks);
  }, [state]);

  return (
    <div className="gantt-page">
      <div className="gantt-toolbar">
        <div>
          <h2>甘特图</h2>
          <p>按创建、领取、开始、截止和完成时间推算任务排期。</p>
        </div>
        <div className="gantt-controls">
          <select className="form-select" value={rangeDays} onChange={(event) => setRangeDays(Number(event.currentTarget.value))}>
            <option value={14}>未来 14 天</option>
            <option value={30}>未来 30 天</option>
            <option value={60}>未来 60 天</option>
            <option value={90}>未来 90 天</option>
          </select>
          <select className="form-select" value={memberFilter} onChange={(event) => setMemberFilter(event.currentTarget.value)}>
            <option value="all">全部成员</option>
            {state.team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
          <select className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as TaskStatus | "all")}>
            <option value="all">全部状态</option>
            {TASK_COLUMNS.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}
          </select>
        </div>
      </div>

      <div className="gantt-summary">
        <div><span>{rows.length}</span><small>排期任务</small></div>
        <div><span>{milestoneTasks.length}</span><small>近期里程碑</small></div>
        <div><span>{overloadedMembers.length}</span><small>满载成员</small></div>
      </div>

      <div className="gantt-grid">
        <div className="gantt-header">
          <div className="gantt-task-head">任务</div>
          <div className="gantt-date-head" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(28px, 1fr))` }}>
            {days.map((day) => (
              <span key={day.toISOString()} className={isSameDay(day, today) ? "today" : ""}>
                {day.getDate()}
              </span>
            ))}
          </div>
        </div>

        {rows.length === 0 && (
          <div className="gantt-empty">当前筛选下没有可展示的任务。</div>
        )}

        {rows.map(({ task, left, width, assignee, overdue }) => (
          <button key={task.id} className="gantt-row" onClick={() => onSelectTask(task)}>
            <div className="gantt-task-cell">
              <span className={`task-priority ${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
              <strong>{task.title}</strong>
              <small>{assignee?.name || "未认领"} · {TASK_COLUMNS.find((column) => column.status === task.status)?.label}</small>
            </div>
            <div className="gantt-lane">
              <span className={`gantt-bar ${task.status} ${overdue ? "overdue" : ""}`} style={{ left: `${left}%`, width: `${width}%` }}>
                {task.dueAt ? new Date(task.dueAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) : "未设截止"}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="gantt-side-panels">
        <section>
          <h3>近期里程碑</h3>
          {milestoneTasks.length === 0 && <p>暂无未完成截止项。</p>}
          {milestoneTasks.map((task) => (
            <button key={task.id} onClick={() => onSelectTask(task)}>
              <span>{new Date(task.dueAt!).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</span>
              <strong>{task.title}</strong>
            </button>
          ))}
        </section>
        <section>
          <h3>容量提醒</h3>
          {overloadedMembers.length === 0 && <p>当前无人达到 WIP 上限。</p>}
          {overloadedMembers.map(({ member, active }) => (
            <div key={member.id} className="capacity-item">
              <strong>{member.name}</strong>
              <span>{active}/{member.maxActiveTasks}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

// ===== Utilities =====
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3
};

function taskStartDate(task: StartupTask): Date {
  return startOfDay(new Date(task.startedAt || task.claimedAt || task.createdAt));
}

function taskEndDate(task: StartupTask): Date {
  if (task.completedAt) return startOfDay(new Date(task.completedAt));
  if (task.dueAt) return startOfDay(new Date(task.dueAt));
  return addDays(taskStartDate(task), task.status === "pool" || task.status === "ready" ? 1 : 3);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86_400_000);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

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

function heatmapLevel(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
}

// ===== Stats Page =====
function StatsPage({ state, memberId }: { state: StartupBoardState; memberId: string }) {
  const [heatmapScope, setHeatmapScope] = useState<"team" | "me">("team");
  const [hoveredHeatmapDate, setHoveredHeatmapDate] = useState<string | null>(null);
  const [heatmapDays, setHeatmapDays] = useState(182);
  const heatmapContainerRef = useRef<HTMLDivElement | null>(null);
  const now = new Date();

  useEffect(() => {
    const node = heatmapContainerRef.current;
    if (!node) return;

    const updateHeatmapDays = (width: number) => {
      const weekCount = Math.max(4, Math.min(52, Math.floor(width / 15)));
      setHeatmapDays(weekCount * 7);
    };

    updateHeatmapDays(node.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      updateHeatmapDays(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const accountMembers = useMemo(() => {
    return state.team.filter((m) => m.feishuOpenId && !m.feishuOpenId.endsWith("_demo"));
  }, [state.team]);

  const heatmapData = useMemo(() => {
    const days: Array<{
      date: string;
      dayOfWeek: number;
      label: string;
      teamLogs: number;
      teamCreated: number;
      teamCompleted: number;
      teamActors: number;
      myLogs: number;
      myCreated: number;
      myCompleted: number;
    }> = [];

    for (let i = 363; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const actorSet = new Set<string>();
      let teamLogs = 0;
      let myLogs = 0;
      let teamCreated = 0;
      let myCreated = 0;
      let teamCompleted = 0;
      let myCompleted = 0;

      for (const task of state.tasks) {
        if (task.createdAt.slice(0, 10) === date) {
          teamCreated += 1;
          if (task.createdByUserId === memberId) myCreated += 1;
        }
        if (task.completedAt?.slice(0, 10) === date) {
          teamCompleted += 1;
          if (task.assigneeUserId === memberId) myCompleted += 1;
        }
        for (const log of task.workLog) {
          if (log.at.slice(0, 10) !== date) continue;
          teamLogs += 1;
          actorSet.add(log.actorUserId);
          if (log.actorUserId === memberId) myLogs += 1;
        }
      }

      days.push({
        date,
        dayOfWeek: d.getDay(),
        label: d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric", weekday: "short" }),
        teamLogs,
        teamCreated,
        teamCompleted,
        teamActors: actorSet.size,
        myLogs,
        myCreated,
        myCompleted
      });
    }

    return days;
  }, [memberId, now, state.tasks]);

  const scopedHeatmap = useMemo(() => {
    return heatmapData.map((day) => {
      const count = heatmapScope === "team" ? day.teamLogs : day.myLogs;
      return {
        ...day,
        count,
        created: heatmapScope === "team" ? day.teamCreated : day.myCreated,
        completed: heatmapScope === "team" ? day.teamCompleted : day.myCompleted
      };
    });
  }, [heatmapData, heatmapScope]);

  const visibleHeatmap = useMemo(() => {
    return scopedHeatmap.slice(-heatmapDays);
  }, [heatmapDays, scopedHeatmap]);

  const hoveredHeatmap = visibleHeatmap.find((day) => day.date === hoveredHeatmapDate)
    || [...visibleHeatmap].reverse().find((day) => day.count > 0)
    || visibleHeatmap[visibleHeatmap.length - 1];

  const heatmapTotal = visibleHeatmap.reduce((sum, day) => sum + day.count, 0);
  const heatmapPeak = visibleHeatmap.reduce((max, day) => Math.max(max, day.count), 0);
  const heatmapStreak = useMemo(() => {
    let count = 0;
    for (let i = visibleHeatmap.length - 1; i >= 0; i--) {
      if (visibleHeatmap[i].count > 0) count += 1;
      else if (count > 0) break;
    }
    return count;
  }, [visibleHeatmap]);

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

  const recentDailyFlow = useMemo(() => {
    return heatmapData.slice(-14).map((day) => ({
      label: day.label.replace(/^(\d+\/\d+).*/, "$1"),
      created: day.teamCreated,
      completed: day.teamCompleted
    }));
  }, [heatmapData]);

  const maxDailyFlow = Math.max(...recentDailyFlow.flatMap((day) => [day.created, day.completed]), 1);

  const weeklyFlow = useMemo(() => {
    const weeks: Array<{ label: string; created: number; completed: number }> = [];
    for (let w = 5; w >= 0; w--) {
      const start = startOfDay(addDays(now, -(w + 1) * 7 + 1));
      const end = startOfDay(addDays(now, -w * 7 + 1));
      let created = 0;
      let completed = 0;
      for (const task of state.tasks) {
        const createdAt = new Date(task.createdAt).getTime();
        if (createdAt >= start.getTime() && createdAt < end.getTime()) created += 1;
        if (task.completedAt) {
          const completedAt = new Date(task.completedAt).getTime();
          if (completedAt >= start.getTime() && completedAt < end.getTime()) completed += 1;
        }
      }
      weeks.push({
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        created,
        completed
      });
    }
    return weeks;
  }, [now, state.tasks]);

  const maxWeeklyFlow = Math.max(...weeklyFlow.flatMap((week) => [week.created, week.completed]), 1);

  const milestones = useMemo(() => {
    return state.tasks
      .filter((t) => t.dueAt && t.status !== "done")
      .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
      .slice(0, 6);
  }, [state.tasks]);

  const memberStats = useMemo(() => {
    return accountMembers.map((m) => {
      const memberTasks = state.tasks.filter((t) => t.assigneeUserId === m.id);
      const completedTasks = memberTasks.filter((t) => t.status === "done");
      const active = memberTasks.filter((t) => t.status === "claimed" || t.status === "doing" || t.status === "review").length;
      const review = memberTasks.filter((t) => t.status === "review").length;
      const overdue = memberTasks.filter((t) => t.dueAt && t.status !== "done" && new Date(t.dueAt).getTime() < now.getTime()).length;
      const load = Math.min(100, Math.round((active / Math.max(1, m.maxActiveTasks || 1)) * 100));
      const cycleHours = completedTasks
        .filter((t) => t.claimedAt && t.completedAt)
        .map((t) => (new Date(t.completedAt!).getTime() - new Date(t.claimedAt!).getTime()) / 3_600_000);
      const avgCycle = cycleHours.length ? Math.round(cycleHours.reduce((sum, hours) => sum + hours, 0) / cycleHours.length) : null;
      return { ...m, completed: completedTasks.length, active, review, overdue, load, avgCycle };
    }).sort((a, b) => b.completed - a.completed || b.active - a.active);
  }, [accountMembers, now, state.tasks]);

  const riskBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of state.tasks) {
      for (const flag of task.riskFlags) counts.set(flag, (counts.get(flag) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([flag, count]) => ({ flag, label: RISK_LABEL[flag] || flag, count }))
      .sort((a, b) => b.count - a.count);
  }, [state.tasks]);

  const dueBreakdown = useMemo(() => {
    const buckets = {
      overdue: 0,
      today: 0,
      soon: 0,
      week: 0,
      later: 0,
      none: 0
    };

    for (const task of state.tasks) {
      if (task.status === "done") continue;
      if (!task.dueAt) {
        buckets.none += 1;
        continue;
      }
      const diff = new Date(task.dueAt).getTime() - now.getTime();
      if (diff < 0) buckets.overdue += 1;
      else if (diff < 86_400_000) buckets.today += 1;
      else if (diff < 3 * 86_400_000) buckets.soon += 1;
      else if (diff < 7 * 86_400_000) buckets.week += 1;
      else buckets.later += 1;
    }

    return [
      { label: "已超期", count: buckets.overdue },
      { label: "24小时内", count: buckets.today },
      { label: "3天内", count: buckets.soon },
      { label: "本周内", count: buckets.week },
      { label: "更晚", count: buckets.later },
      { label: "未设截止", count: buckets.none }
    ];
  }, [now, state.tasks]);

  const blockedCount = state.tasks.filter((t) => t.status === "blocked").length;
  const overdueCount = state.tasks.filter((t) => t.dueAt && t.status !== "done" && new Date(t.dueAt).getTime() < now.getTime()).length;
  const openCount = state.tasks.filter((t) => t.status !== "done").length;
  const reviewCount = state.tasks.filter((t) => t.status === "review").length;
  const healthScore = Math.max(0, Math.min(100, 100 - blockedCount * 12 - overdueCount * 18 - reviewCount * 4));
  const totalCapacity = accountMembers.reduce((sum, member) => sum + member.maxActiveTasks, 0);
  const activeLoad = memberStats.reduce((sum, member) => sum + member.active, 0);
  const capacityRatio = Math.round((activeLoad / Math.max(1, totalCapacity)) * 100);
  const activeMemberCount = heatmapData[heatmapData.length - 1]?.teamActors || 0;

  return (
    <div className="stats-page">
      <div className="analytics-hero">
        <div>
          <h2>数据看板</h2>
          <p>拆开看每天的流量、成员负载、风险密度和交付节奏。</p>
        </div>
        <div className={`health-score ${healthScore < 60 ? "danger" : healthScore < 80 ? "warning" : ""}`}>
          <span>{healthScore}</span>
          <small>健康度</small>
        </div>
      </div>

      <div className="analytics-kpis">
        <div className="analytics-kpi">
          <small>未完成</small>
          <strong>{openCount}</strong>
          <span>{blockedCount} 阻塞 / {overdueCount} 超期</span>
        </div>
        <div className="analytics-kpi">
          <small>平均周期</small>
          <strong>{cycleTime !== null ? `${cycleTime}h` : "-"}</strong>
          <span>从认领到完成</span>
        </div>
        <div className="analytics-kpi">
          <small>{heatmapScope === "team" ? "团队连续活跃" : "个人连续活跃"}</small>
          <strong>{heatmapStreak}</strong>
          <span>{heatmapTotal} 次动作 / 峰值 {heatmapPeak}</span>
        </div>
        <div className="analytics-kpi">
          <small>容量使用</small>
          <strong>{capacityRatio}%</strong>
          <span>{activeLoad}/{totalCapacity} WIP，今日 {activeMemberCount} 人活跃</span>
        </div>
      </div>

      <div className="analytics-grid">
        <section className="analytics-card wide">
          <div className="analytics-card-header">
            <div>
              <h3>天热力图</h3>
              <p>按天查看任务操作密度，悬停看当天明细。</p>
            </div>
            <div className="analytics-toolbar">
              <div className="segmented-control">
                <button className={heatmapScope === "team" ? "active" : ""} onClick={() => setHeatmapScope("team")}>团队</button>
                <button className={heatmapScope === "me" ? "active" : ""} onClick={() => setHeatmapScope("me")}>个人</button>
              </div>
              <span>{heatmapDays} 天 / {heatmapTotal} 次动作</span>
            </div>
          </div>
          {hoveredHeatmap && (
            <div className="heatmap-detail">
              <strong>{hoveredHeatmap.label}</strong>
              <span>{hoveredHeatmap.count} 次操作</span>
              <span>{hoveredHeatmap.created} 新建</span>
              <span>{hoveredHeatmap.completed} 完成</span>
              {heatmapScope === "team" && <span>{hoveredHeatmap.teamActors} 人参与</span>}
            </div>
          )}
          <div className="heatmap-layout">
            <div className="heatmap-weekdays">
              <span>日</span>
              <span>一</span>
              <span>二</span>
              <span>三</span>
              <span>四</span>
              <span>五</span>
              <span>六</span>
            </div>
            <div className="heatmap-container" ref={heatmapContainerRef}>
              <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${Math.ceil(visibleHeatmap.length / 7)}, 12px)` }}>
                {visibleHeatmap.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    className={`heatmap-cell level-${heatmapLevel(day.count)} ${hoveredHeatmap?.date === day.date ? "active" : ""}`}
                    title={`${day.label}：${day.count} 次操作`}
                    style={{ gridRow: day.dayOfWeek + 1 }}
                    onMouseEnter={() => setHoveredHeatmapDate(day.date)}
                    onFocus={() => setHoveredHeatmapDate(day.date)}
                    onMouseLeave={() => setHoveredHeatmapDate(null)}
                    onBlur={() => setHoveredHeatmapDate(null)}
                  />
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
        </section>

        <section className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h3>14天流量</h3>
              <p>最近两周新建和完成的每日走势。</p>
            </div>
          </div>
          <div className="flow-chart">
            {recentDailyFlow.map((day) => (
              <div key={day.label} className="flow-day">
                <div className="flow-bars">
                  <span className="flow-bar created" style={{ height: `${Math.max(6, (day.created / maxDailyFlow) * 100)}%` }} title={`${day.label} 新建 ${day.created}`} />
                  <span className="flow-bar completed" style={{ height: `${Math.max(6, (day.completed / maxDailyFlow) * 100)}%` }} title={`${day.label} 完成 ${day.completed}`} />
                </div>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h3>周吞吐</h3>
              <p>近 6 周创建与完成对比。</p>
            </div>
          </div>
          <div className="throughput-chart dense">
            {weeklyFlow.map((week) => (
              <div key={week.label} className="throughput-bar-wrapper">
                <div className="throughput-pair">
                  <div className="throughput-bar created" style={{ height: `${Math.max(6, (week.created / maxWeeklyFlow) * 100)}%` }} title={`${week.label} 新建 ${week.created}`} />
                  <div className="throughput-bar" style={{ height: `${Math.max(6, (week.completed / maxWeeklyFlow) * 100)}%` }} title={`${week.label} 完成 ${week.completed}`} />
                </div>
                <div className="throughput-label">{week.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h3>团队负载</h3>
              <p>完成、进行、复核、超期一起看。</p>
            </div>
          </div>
          <div className="leaderboard">
            {memberStats.length === 0 && <div className="analytics-empty">暂无真实飞书账号数据。</div>}
            {memberStats.map((m) => (
              <div key={m.id} className="leaderboard-row detailed">
                <span className="leaderboard-avatar">{m.name[0]}</span>
                <div className="leaderboard-person">
                  <span className="leaderboard-name">{m.name}</span>
                  <span className="leaderboard-subline">{m.completed} 完成 · {m.review} 待复核 · {m.overdue} 超期</span>
                </div>
                <div className="leaderboard-bars">
                  <span className={m.load >= 100 ? "leaderboard-overload" : "leaderboard-done"} style={{ width: `${Math.max(4, m.load)}%` }} />
                </div>
                <span className="leaderboard-count">{m.active}/{m.maxActiveTasks} · {m.avgCycle !== null ? `${m.avgCycle}h` : "-"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h3>风险分布</h3>
              <p>哪些类型的高风险任务积压最多。</p>
            </div>
          </div>
          <div className="mini-metric-list">
            {riskBreakdown.length === 0 && <div className="analytics-empty">当前没有风险标记任务。</div>}
            {riskBreakdown.map((item) => (
              <div key={item.flag} className="mini-metric-row">
                <span>{item.label}</span>
                <div><i style={{ width: `${Math.max(6, (item.count / Math.max(1, riskBreakdown[0]?.count || 1)) * 100)}%` }} /></div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h3>截止分布</h3>
              <p>把未完成任务按时间压力拆开看。</p>
            </div>
          </div>
          <div className="due-grid">
            {dueBreakdown.map((item) => (
              <div key={item.label} className="due-grid-item">
                <strong>{item.count}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h3>状态分布</h3>
              <p>当前任务所在阶段。</p>
            </div>
          </div>
          <div className="status-stack">
            {TASK_COLUMNS.map((column) => {
              const count = state.tasks.filter((task) => task.status === column.status).length;
              const pct = Math.round((count / Math.max(1, state.tasks.length)) * 100);
              return (
                <div key={column.status} className="status-stack-row">
                  <span>{column.label}</span>
                  <div><i style={{ width: `${Math.max(2, pct)}%` }} /></div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className="analytics-card wide">
          <div className="analytics-card-header">
            <div>
              <h3>即将到来的里程碑</h3>
              <p>按截止时间排序的未完成任务。</p>
            </div>
          </div>
          {milestones.length === 0 && <div className="analytics-empty">暂无带截止时间的未完成任务。</div>}
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
        </section>
      </div>
    </div>
  );
}
