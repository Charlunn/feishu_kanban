"use client";

import { useEffect, useState } from "react";
import type { StartupBoardState, StartupTask, TaskStatus } from "@/domain/models";
import { TASK_COLUMNS } from "@/domain/operations";
import { shareTask, copyToClipboard, isInFeishu } from "@/lib/feishu/jssdk";

const TYPE_LABEL: Record<string, string> = {
  sales: "线索跟进", diagnosis: "诊断复核", delivery: "交付验收",
  ops: "内部运营", product: "产品搭建", feishu: "飞书集成"
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "紧急", high: "高", normal: "中", low: "低"
};

const RISK_LABEL: Record<string, string> = {
  customer_facing: "客户可见", ai_output: "AI草稿",
  quote_scope: "报价", sensitive_data: "敏感", ops_only: "内部"
};

const WEBAPPURL = typeof window !== "undefined"
  ? window.location.origin
  : (process.env.NEXT_PUBLIC_APP_BASE_URL ?? "");

interface TaskActionPanelProps {
  task: StartupTask;
  state: StartupBoardState;
  memberId: string;
  onClose: () => void;
  onAction: (result: { board: StartupBoardState; message: string }) => void;
}

export function TaskActionPanel({ task, state, memberId, onClose, onAction }: TaskActionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [blockReason, setBlockReason] = useState(task.blockedReason || "");
  const [reviewNote, setReviewNote] = useState("");
  const [meetingNote, setMeetingNote] = useState("");
  const [showMeeting, setShowMeeting] = useState(false);
  const [presence, setPresence] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const assignee = state.team.find((m) => m.id === task.assigneeUserId);
  const reviewer = state.team.find((m) => m.id === task.reviewerUserId);
  const isOverdue = task.dueAt && task.status !== "done" && new Date(task.dueAt).getTime() < Date.now();
  const col = TASK_COLUMNS.find((c) => c.status === task.status);

  // Load presence status for all team members
  useEffect(() => {
    async function loadPresence() {
      try {
        const res = await fetch("/api/feishu/presence");
        if (res.ok) {
          const json = await res.json() as { presence: Record<string, string> };
          setPresence(json.presence ?? {});
        }
      } catch { /* non-critical */ }
    }
    loadPresence();
  }, []);

  async function doMove(targetStatus: TaskStatus, note = "") {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/move`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId, targetStatus, note })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "操作失败");
      onAction({ board: json.board, message: `已流转到「${TASK_COLUMNS.find((c) => c.status === targetStatus)?.label}」` });
    } catch (err) {
      onAction({ board: state, message: err instanceof Error ? err.message : "操作失败" });
    } finally {
      setLoading(false);
    }
  }

  async function scheduleMeeting() {
    setLoading(true);
    try {
      const res = await fetch("/api/feishu/meeting", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          organizerId: memberId,
          note: meetingNote || `讨论：${task.title}`,
          durationMinutes: 15
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "创建会议失败");
      if (json.meetingUrl) window.open(json.meetingUrl, "_blank");
      else if (json.deepLink) window.open(json.deepLink, "_blank");
      onAction({ board: state, message: json.skipped ? "已生成会议预览" : "会议已创建" });
    } catch (err) {
      onAction({ board: state, message: err instanceof Error ? err.message : "创建会议失败" });
    } finally {
      setLoading(false);
      setShowMeeting(false);
    }
  }

  function handleShare() {
    shareTask(task, WEBAPPURL);
    onAction({ board: state, message: "分享链接已发送" });
  }

  function handleCopy() {
    const link = `${WEBAPPURL}?focus=${encodeURIComponent(task.id)}`;
    copyToClipboard(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const presenceIcon = (openId: string) => {
    const s = presence[openId];
    if (s === "active") return "🟢";
    if (s === "meeting") return "🔴";
    if (s === "away") return "🟡";
    return "";
  };

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="action-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="panel-header">
          <div className="panel-status-badge">{col?.label}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {/* Share button */}
            <button className="panel-icon-btn" onClick={handleShare} title="分享到飞书">
              📤
            </button>
            {/* Copy link button */}
            <button className="panel-icon-btn" onClick={handleCopy} title="复制链接">
              {copied ? "✅" : "🔗"}
            </button>
            <button className="panel-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Task info */}
        <div className="panel-body">
          <h3 className="panel-title">{task.title}</h3>
          <div className="panel-meta">
            <span className={`task-priority ${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
            <span className="task-type">{TYPE_LABEL[task.type]}</span>
            {isOverdue && <span className="task-due-tag overdue">已超期</span>}
          </div>

          <div className="panel-field">
            <label>目标</label>
            <p>{task.outcome}</p>
          </div>

          <div className="panel-field">
            <label>验收条件</label>
            <ul>{task.acceptanceCriteria.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>

          {task.context && (
            <div className="panel-field">
              <label>上下文</label>
              <p>{task.context}</p>
            </div>
          )}

          <div className="panel-field-row">
            <div className="panel-field">
              <label>负责人</label>
              <p>
                {presenceIcon(assignee?.feishuOpenId ?? "")}
                {" "}{assignee?.name || "未认领"}
              </p>
            </div>
            <div className="panel-field">
              <label>复核人</label>
              <p>
                {presenceIcon(reviewer?.feishuOpenId ?? "")}
                {" "}{reviewer?.name || "待分配"}
              </p>
            </div>
          </div>

          {task.dueAt && (
            <div className="panel-field">
              <label>截止时间</label>
              <p>{new Date(task.dueAt).toLocaleString("zh-CN")}</p>
            </div>
          )}

          {task.riskFlags.length > 0 && (
            <div className="panel-field">
              <label>边界标记</label>
              <div className="panel-tags">
                {task.riskFlags.map((f) => <span key={f} className="task-risk-tag">{RISK_LABEL[f] || f}</span>)}
              </div>
            </div>
          )}

          {task.blockedReason && (
            <div className="panel-field panel-blocked">
              <label>阻塞原因</label>
              <p>{task.blockedReason}</p>
            </div>
          )}

          {/* Work log */}
          {task.workLog.length > 0 && (
            <div className="panel-field">
              <label>操作记录（最近 5 条）</label>
              <div className="panel-log">
                {task.workLog.slice(0, 5).map((log) => (
                  <div key={log.id} className="log-entry">
                    <span className="log-time">{new Date(log.at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="log-actor">{state.team.find((m) => m.id === log.actorUserId)?.name || "系统"}</span>
                    <span className="log-note">{log.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stage-specific actions */}
        <div className="panel-actions">
          {/* Quick meeting button — always available */}
          <button className="action-btn action-meeting" onClick={() => setShowMeeting(!showMeeting)} disabled={loading}>
            📅 预约讨论
          </button>

          {showMeeting && (
            <div className="action-form">
              <input className="form-input" placeholder="讨论主题（选填）"
                value={meetingNote} onChange={(e) => setMeetingNote(e.target.value)} />
              <button className="action-btn action-primary" onClick={scheduleMeeting} disabled={loading}>
                {loading ? "创建中..." : "创建 15 分钟飞书会议"}
              </button>
            </div>
          )}

          {task.status === "pool" && (
            <button className="action-btn action-primary" onClick={() => doMove("ready")} disabled={loading}>
              ✓ 范围已确认，进入可领取
            </button>
          )}
          {(task.status === "ready" || task.status === "pool") && (
            <button className="action-btn action-primary" onClick={() => doMove("claimed")} disabled={loading}>
              🙋 我来负责
            </button>
          )}
          {task.status === "claimed" && task.assigneeUserId === memberId && (
            <button className="action-btn action-primary" onClick={() => doMove("doing")} disabled={loading}>
              ▶ 开始推进
            </button>
          )}
          {task.status === "doing" && task.assigneeUserId === memberId && (
            <button className="action-btn action-primary" onClick={() => doMove("review")} disabled={loading}>
              📋 提交复核
            </button>
          )}
          {task.status === "doing" && task.assigneeUserId === memberId && (
            <div className="action-form">
              <textarea className="form-textarea" placeholder="阻塞原因（必填）：缺什么资料/等谁的决定/依赖什么外部输入"
                value={blockReason} onChange={(e) => setBlockReason(e.target.value)} rows={2} />
              <button className="action-btn action-warning"
                onClick={() => { if (blockReason.trim()) doMove("blocked", blockReason); }}
                disabled={loading || !blockReason.trim()}>
                ⚠ 标记阻塞
              </button>
            </div>
          )}
          {task.status === "blocked" && (
            <>
              <button className="action-btn action-primary" onClick={() => doMove("doing")} disabled={loading}>
                ▶ 阻塞已解除，继续推进
              </button>
              <button className="action-btn action-secondary" onClick={() => doMove("ready")} disabled={loading}>
                ↩ 释放给团队
              </button>
            </>
          )}
          {task.status === "review" && task.assigneeUserId !== memberId && (
            <div className="action-form">
              <textarea className="form-textarea" placeholder="复核意见（选填）：确认验收条件是否达标"
                value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={2} />
              <button className="action-btn action-primary" onClick={() => doMove("done", reviewNote)} disabled={loading}>
                ✓ 复核通过，完成
              </button>
              <button className="action-btn action-warning" onClick={() => doMove("doing", reviewNote || "复核未通过，退回修改")} disabled={loading}>
                ↩ 退回修改
              </button>
            </div>
          )}
          {task.status === "review" && task.assigneeUserId === memberId && (
            <div className="action-hint">
              等待其他成员复核。高风险任务不能自己通过。<br/>
              <small>💡 对方在飞书消息上点 ✅ 也可直接通过</small>
            </div>
          )}
          {task.status === "done" && (
            <button className="action-btn action-secondary" onClick={() => doMove("doing", "重新打开任务")} disabled={loading}>
              ↩ 重新打开
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

