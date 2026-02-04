import { useState, useEffect, useCallback, useRef } from "react";

// ─── Furniture Bank Color System ───
const BRAND = {
  bg: "#0c1017",
  surface: "#131a24",
  surfaceBorder: "#1c2638",
  surfaceHover: "#182030",
  text: "#e8edf5",
  textMuted: "#7b8ba5",
  textDim: "#4a5a74",
  accent: "#38bdf8",
  accentDim: "#0c4a6e",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
  orange: "#fb923c",
};

const QUEUE_CONFIG = {
  "Guidance Queue": { color: "#38bdf8", short: "Guidance Queue", icon: "◆" },
  "Support Queue": { color: "#fb923c", short: "Support Queue", icon: "▲" },
  "COE Queue": { color: "#a78bfa", short: "COE Queue", icon: "●" },
  "Admin Queue": { color: "#f87171", short: "Sys Admin Queue", icon: "■" },
  "Sorting Hat": { color: "#94a3b8", short: "Sorting Hat", icon: "★" },
  triage: { color: "#64748b", short: "Triage (Unqueued)", icon: "○" },
};

const DEPT_CONFIG = {
  "Leadership": { color: "#f472b6", short: "Leadership" },
  "Operations": { color: "#38bdf8", short: "Operations" },
  "IT/Technology": { color: "#a78bfa", short: "IT/Technology" },
  "Development": { color: "#34d399", short: "Development" },
  "Client Services": { color: "#fbbf24", short: "Client Services" },
  "Sales": { color: "#fb923c", short: "Sales" },
  "Multi-Department Impact": { color: "#e879f9", short: "Multi-Dept" },
  none: { color: "#475569", short: "Uncategorized" },
};

const REQUEST_TYPES = ["Problem", "Feature Request", "Agenda Item", "To-Do", "Roadmap Item", "Question", "Report", "Bug", "Improvement", "Data Quality Goal", "Technology Evaluation"];

const STATUS_CONFIG = {
  Triage: { color: "#94a3b8", type: "unstarted" },
  New: { color: "#60a5fa", type: "unstarted" },
  Backlog: { color: "#64748b", type: "unstarted" },
  "In Progress": { color: "#38bdf8", type: "started" },
  Evaluating: { color: "#a78bfa", type: "started" },
  Blocked: { color: "#f87171", type: "started" },
  Completed: { color: "#34d399", type: "completed" },
  Canceled: { color: "#f87171", type: "completed" },
  Duplicate: { color: "#6b7280", type: "completed" },
  "Parking Lot": { color: "#64748b", type: "completed" },
  Roadmap: { color: "#818cf8", type: "completed" },
};

const PRIORITY_CONFIG = {
  1: { label: "Urgent", color: "#ef4444" },
  2: { label: "High", color: "#f97316" },
  3: { label: "Normal", color: "#eab308" },
  4: { label: "Low", color: "#94a3b8" },
  0: { label: "None", color: "#374151" },
};

const PROJECT_COLORS = [
  "#38bdf8", "#34d399", "#a78bfa", "#fbbf24",
  "#fb923c", "#f472b6", "#e879f9", "#818cf8",
];

const TEAM_NAMES = {
  "Guidance Team": "DG",
  "Center Of Excellence": "COE",
};

const USER_DISPLAY = {
  "sami@ascendably.com": "Sami Zoss",
  "matt@ascendably.com": "Matt Henry",
  "tim@thehumanstack.com": "Tim Lockie",
  "dan.kershaw@furniturebank.org": "Dan Kershaw",
  "samantha.bernardo@furniturebank.org": "Sam Bernardo",
  "daniel.lombardi@furniturebank.org": "Daniel Lombardi",
  "cto@furniturebank.org": "CTO",
};

// ─── SVG Donut ───
function DonutChart({ data, total, size = 210, label }) {
  const r = size / 2 - 18;
  const ir = r * 0.58;
  const c = size / 2;
  let cum = 0;
  const segs = data.filter((d) => d.value > 0).map((d) => {
    const s = (cum / total) * 2 * Math.PI - Math.PI / 2;
    cum += d.value;
    const e = (cum / total) * 2 * Math.PI - Math.PI / 2;
    const la = e - s > Math.PI ? 1 : 0;
    return {
      ...d,
      path: `M ${c + r * Math.cos(s)} ${c + r * Math.sin(s)} A ${r} ${r} 0 ${la} 1 ${c + r * Math.cos(e)} ${c + r * Math.sin(e)} L ${c + ir * Math.cos(e)} ${c + ir * Math.sin(e)} A ${ir} ${ir} 0 ${la} 0 ${c + ir * Math.cos(s)} ${c + ir * Math.sin(s)} Z`,
    };
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle cx={c} cy={c} r={r} fill="none" stroke={BRAND.surfaceBorder} strokeWidth={r - ir} />
        ) : (
          segs.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} opacity={0.88} style={{ transition: "opacity 0.2s", cursor: "default" }}
              onMouseEnter={(e) => (e.target.style.opacity = 1)}
              onMouseLeave={(e) => (e.target.style.opacity = 0.88)}>
              <title>{`${s.label}: ${s.value}`}</title>
            </path>
          ))
        )}
        <text x={c} y={c - 6} textAnchor="middle" fill={BRAND.text} fontSize="30" fontWeight="800" fontFamily="'Outfit', sans-serif">{total}</text>
        <text x={c} y={c + 14} textAnchor="middle" fill={BRAND.textMuted} fontSize="10" fontFamily="'Outfit', sans-serif" letterSpacing="1.5" style={{ textTransform: "uppercase" }}>{label}</text>
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: "10px", justifyContent: "center", maxWidth: size + 80 }}>
        {data.filter((d) => d.value > 0).map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: BRAND.textMuted, fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
            <span>{d.label} <span style={{ fontWeight: 600, color: BRAND.text }}>{d.value}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Chart ───
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 130, fontSize: "11px", color: BRAND.textMuted, textAlign: "right", flexShrink: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}>{d.label}</div>
          <div style={{ flex: 1, height: 26, background: BRAND.bg, borderRadius: "5px", overflow: "hidden", position: "relative", border: `1px solid ${BRAND.surfaceBorder}` }}>
            <div style={{
              width: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${d.color}99, ${d.color})`,
              borderRadius: "5px",
              transition: "width 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
            }} />
            <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: "12px", fontWeight: 700, color: BRAND.text, fontFamily: "'Outfit', sans-serif" }}>{d.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Monthly Trend Bars ───
function MonthlyBars({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: 150, padding: "0 4px" }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", flex: 1, minWidth: 32 }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: BRAND.text, fontFamily: "'Outfit', sans-serif" }}>{d.value || ""}</span>
            <div style={{
              width: "100%", maxWidth: 40,
              height: `${Math.max((d.value / max) * 110, d.value > 0 ? 4 : 0)}px`,
              background: `linear-gradient(180deg, ${d.color}, ${d.color}66)`,
              borderRadius: "4px 4px 0 0",
              transition: "height 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
            }} />
            <span style={{ fontSize: "9px", color: BRAND.textDim, fontFamily: "'Outfit', sans-serif", textAlign: "center" }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ───
function StatCard({ label, value, sub, color, small }) {
  return (
    <div style={{
      background: BRAND.surface,
      border: `1px solid ${BRAND.surfaceBorder}`,
      borderRadius: 10,
      padding: small ? "14px 16px" : "18px 20px",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: small ? 80 : 100, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color || BRAND.accent, opacity: 0.7 }} />
      <div style={{ fontSize: "10px", color: BRAND.textDim, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6, textAlign: "center", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: small ? "32px" : "38px", fontWeight: 800, color: BRAND.text, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "9px", color: BRAND.textDim, marginTop: 4, fontFamily: "'Outfit', sans-serif" }}>{sub}</div>}
    </div>
  );
}

// ─── Section Header ───
function SH({ children, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 28, marginBottom: 14, paddingBottom: 6, borderBottom: `1px solid ${BRAND.surfaceBorder}` }}>
      {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: BRAND.textDim, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: 2 }}>{children}</h2>
    </div>
  );
}

// ─── Card ───
function Card({ children, title, style: s }) {
  return (
    <div style={{ background: BRAND.surface, border: `1px solid ${BRAND.surfaceBorder}`, borderRadius: 10, padding: 20, ...s }}>
      {title && <div style={{ fontSize: 11, color: BRAND.textDim, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14, fontWeight: 600 }}>{title}</div>}
      {children}
    </div>
  );
}

// ─── Issue Row ───
function IssueRow({ issue }) {
  const q = (issue.labels || []).find((l) => QUEUE_CONFIG[l]);
  const dept = (issue.labels || []).find((l) => DEPT_CONFIG[l]);
  const reqType = (issue.labels || []).find((l) => REQUEST_TYPES.includes(l));
  const qc = q ? QUEUE_CONFIG[q] : null;
  const sc = STATUS_CONFIG[issue.status] || { color: "#64748b" };
  const pc = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG[0];

  const handleClick = () => {
    if (issue.url) {
      window.open(issue.url, '_blank');
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8,
        background: BRAND.bg, border: `1px solid ${BRAND.surfaceBorder}`, transition: "all 0.2s",
        cursor: issue.url ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = BRAND.accent + "44";
        if (issue.url) e.currentTarget.style.background = BRAND.surfaceHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = BRAND.surfaceBorder;
        e.currentTarget.style.background = BRAND.bg;
      }}
    >
      <div style={{ width: 3, height: 30, borderRadius: 2, background: pc.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: BRAND.text, fontFamily: "'Outfit', sans-serif", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <span style={{ color: BRAND.textDim, fontWeight: 600 }}>{issue.identifier}</span> · {issue.title}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
          {issue.team && (
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: `${BRAND.accent}18`, color: BRAND.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>
              {TEAM_NAMES[issue.team] || issue.team}
            </span>
          )}
          {qc && (
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: `${qc.color}18`, color: qc.color, fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}>
              {qc.short}
            </span>
          )}
          {dept && (
            <span style={{ fontSize: 9, color: DEPT_CONFIG[dept]?.color || BRAND.textDim, fontFamily: "'Outfit', sans-serif" }}>
              {DEPT_CONFIG[dept]?.short || dept}
            </span>
          )}
          {reqType && (
            <span style={{ fontSize: 9, color: BRAND.textDim, fontFamily: "'Outfit', sans-serif" }}>
              {reqType}
            </span>
          )}
          {issue.project && (
            <span style={{ fontSize: 9, color: BRAND.textDim, fontFamily: "'Outfit', sans-serif", fontStyle: "italic" }}>
              {issue.project}
            </span>
          )}
        </div>
      </div>
      <div style={{
        fontSize: 9, padding: "2px 7px", borderRadius: 4,
        background: `${sc.color}18`, color: sc.color,
        fontFamily: "'Outfit', sans-serif", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap",
      }}>
        {issue.status}
      </div>
      {issue.url && (
        <div style={{ color: BRAND.textDim, fontSize: 12, flexShrink: 0 }} title="Open in Linear">
          ↗
        </div>
      )}
    </div>
  );
}

// ─── Tab Button ───
function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? BRAND.accent + "20" : "transparent",
      border: `1px solid ${active ? BRAND.accent + "44" : BRAND.surfaceBorder}`,
      borderRadius: 6, padding: "5px 14px", fontSize: 11, fontWeight: 600,
      color: active ? BRAND.accent : BRAND.textMuted,
      cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.2s",
    }}>{children}</button>
  );
}

// ─── Connection Status Bar ───
function ConnectionStatus({ loading, error, lastUpdated, autoRefresh, setAutoRefresh, refreshInterval, setRefreshInterval, onRefresh }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 16px",
      background: BRAND.surface,
      border: `1px solid ${BRAND.surfaceBorder}`,
      borderRadius: 8,
      marginBottom: 20,
      flexWrap: "wrap",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {loading ? (
          <>
            <span style={{
              width: 10, height: 10,
              border: `2px solid ${BRAND.textDim}`,
              borderTop: `2px solid ${BRAND.accent}`,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite"
            }} />
            <span style={{ fontSize: 12, color: BRAND.textMuted, fontFamily: "'Outfit', sans-serif" }}>
              Syncing with Linear...
            </span>
          </>
        ) : error ? (
          <>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND.danger }} />
            <span style={{ fontSize: 12, color: BRAND.danger, fontFamily: "'Outfit', sans-serif" }}>
              {error}
            </span>
            <button onClick={onRefresh} style={{
              padding: "4px 10px", borderRadius: 4, border: "none",
              background: BRAND.accent, color: BRAND.bg, fontSize: 11,
              fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif"
            }}>Retry</button>
          </>
        ) : (
          <>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND.success, animation: autoRefresh ? "pulse 2s infinite" : "none" }} />
            <span style={{ fontSize: 12, color: BRAND.textMuted, fontFamily: "'Outfit', sans-serif" }}>
              Connected to Linear
            </span>
            {lastUpdated && (
              <span style={{ fontSize: 10, color: BRAND.textDim, fontFamily: "'Outfit', sans-serif" }}>
                · Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            style={{ accentColor: BRAND.accent, width: 14, height: 14, cursor: "pointer" }}
          />
          <span style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: "'Outfit', sans-serif" }}>
            Auto-refresh
          </span>
        </label>

        {autoRefresh && (
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            style={{
              padding: "3px 6px", borderRadius: 4,
              border: `1px solid ${BRAND.surfaceBorder}`,
              background: BRAND.bg, color: BRAND.text,
              fontSize: 10, fontFamily: "'Outfit', sans-serif", cursor: "pointer",
            }}
          >
            <option value={30}>30s</option>
            <option value={60}>1m</option>
            <option value={300}>5m</option>
          </select>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════
const DEFAULT_API_URL = "/api/linear";

export default function FurnitureBankDashboard() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true); // Start loading immediately
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");

  // URL input state
  const [dataUrl, setDataUrl] = useState(DEFAULT_API_URL);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const refreshTimerRef = useRef(null);

  const fetchIssues = useCallback(async (urlToFetch) => {
    const url = urlToFetch || dataUrl || DEFAULT_API_URL;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle different response formats
      let issueData = [];

      if (Array.isArray(data)) {
        // Direct array of issues
        issueData = data;
      } else if (data.issues && Array.isArray(data.issues)) {
        // { issues: [...] } format
        issueData = data.issues;
      } else if (data.data && Array.isArray(data.data)) {
        // { data: [...] } format
        issueData = data.data;
      } else if (data.error) {
        throw new Error(data.error);
      }

      // Normalize issue format
      issueData = issueData.map((i) => ({
        identifier: i.identifier || i.id || i.key || "",
        title: i.title || i.name || i.summary || "",
        status: i.status?.name || i.status || "Unknown",
        priority: i.priority?.value ?? i.priority ?? 0,
        labels: i.labels?.map(l => l.name || l) || i.labels || [],
        project: i.project?.name || i.project || null,
        team: i.team?.name || i.team || null,
        createdAt: i.createdAt || i.created_at || i.created || new Date().toISOString(),
        completedAt: i.completedAt || i.completed_at || i.completed || null,
        url: i.url || null,
        creator: i.creator?.email || i.creator || null,
        assignee: i.assignee?.email || i.assignee || null,
      }));

      if (issueData.length === 0) {
        throw new Error("No issues found");
      }

      setIssues(issueData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dataUrl]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchIssues(DEFAULT_API_URL);
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && dataUrl.trim() && !loading) {
      refreshTimerRef.current = setInterval(() => {
        fetchIssues(dataUrl);
      }, refreshInterval * 1000);

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, dataUrl, loading, fetchIssues]);

  // ─── Computed Metrics ───
  const CLOSED_STATUSES = ["Completed", "Canceled", "Duplicate", "Parking Lot", "Roadmap"];
  const filteredByTeam = teamFilter === "all" ? issues : issues.filter((i) => i.team === teamFilter);
  const active = filteredByTeam.filter((i) => !CLOSED_STATUSES.includes(i.status));
  const completed = filteredByTeam.filter((i) => i.status === "Completed");
  const closed = filteredByTeam.filter((i) => CLOSED_STATUSES.includes(i.status));

  const queueKeys = Object.keys(QUEUE_CONFIG).filter((k) => k !== "triage");
  const queueCounts = {};
  queueKeys.forEach((k) => (queueCounts[k] = 0));
  queueCounts["triage"] = 0;
  active.forEach((issue) => {
    const q = (issue.labels || []).find((l) => queueKeys.includes(l));
    if (q) queueCounts[q]++;
    else queueCounts["triage"]++;
  });

  const deptKeys = Object.keys(DEPT_CONFIG).filter((k) => k !== "none");
  const deptCounts = {};
  deptKeys.forEach((k) => (deptCounts[k] = 0));
  deptCounts["none"] = 0;
  active.forEach((issue) => {
    const d = (issue.labels || []).find((l) => deptKeys.includes(l));
    if (d) deptCounts[d]++;
    else deptCounts["none"]++;
  });

  const creatorCounts = {};
  filteredByTeam.forEach((i) => { const c = i.creator || "unknown"; creatorCounts[c] = (creatorCounts[c] || 0) + 1; });

  const priCounts = {};
  active.forEach((i) => { const p = i.priority ?? 0; priCounts[p] = (priCounts[p] || 0) + 1; });

  const now = new Date();
  const thisMS = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMS = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastME = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const openedThis = filteredByTeam.filter((i) => new Date(i.createdAt) >= thisMS).length;
  const closedThis = closed.filter((i) => i.completedAt && new Date(i.completedAt) >= thisMS).length;
  const completedThis = completed.filter((i) => i.completedAt && new Date(i.completedAt) >= thisMS).length;
  const openedLast = filteredByTeam.filter((i) => { const d = new Date(i.createdAt); return d >= lastMS && d <= lastME; }).length;
  const closedLast = closed.filter((i) => { if (!i.completedAt) return false; const d = new Date(i.completedAt); return d >= lastMS && d <= lastME; }).length;
  const completedLast = completed.filter((i) => { if (!i.completedAt) return false; const d = new Date(i.completedAt); return d >= lastMS && d <= lastME; }).length;

  const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trend = [];
  for (let m = 5; m >= 0; m--) {
    const s = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const e = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59);
    trend.push({
      label: MN[s.getMonth()],
      opened: filteredByTeam.filter((i) => { const d = new Date(i.createdAt); return d >= s && d <= e; }).length,
      completed: completed.filter((i) => { if (!i.completedAt) return false; const d = new Date(i.completedAt); return d >= s && d <= e; }).length,
    });
  }

  const queueDonut = Object.entries(queueCounts).filter(([, v]) => v > 0).map(([k, v]) => ({ label: QUEUE_CONFIG[k].short, value: v, color: QUEUE_CONFIG[k].color }));
  const deptDonut = Object.entries(deptCounts).filter(([, v]) => v > 0).map(([k, v]) => ({ label: DEPT_CONFIG[k].short, value: v, color: DEPT_CONFIG[k].color }));
  const creatorDonut = Object.entries(creatorCounts).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({
    label: USER_DISPLAY[k] || k.split("@")[0], value: v, color: PROJECT_COLORS[i % PROJECT_COLORS.length],
  }));

  const queueBar = Object.entries(queueCounts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: QUEUE_CONFIG[k].short, value: v, color: QUEUE_CONFIG[k].color }));
  const priBar = [1, 2, 3, 4, 0].filter((p) => priCounts[p]).map((p) => ({ label: PRIORITY_CONFIG[p].label, value: priCounts[p], color: PRIORITY_CONFIG[p].color }));

  const closedByQueue = {};
  closed.forEach((i) => {
    const q = (i.labels || []).find((l) => queueKeys.includes(l));
    const key = q || "triage";
    closedByQueue[key] = (closedByQueue[key] || 0) + 1;
  });
  const closedBar = Object.entries(closedByQueue).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: QUEUE_CONFIG[k]?.short || k, value: v, color: QUEUE_CONFIG[k]?.color || "#64748b" }));

  let displayIssues = active;
  if (activeTab !== "all") {
    displayIssues = activeTab === "triage"
      ? active.filter((i) => !(i.labels || []).some((l) => queueKeys.includes(l)))
      : active.filter((i) => (i.labels || []).includes(activeTab));
  }
  displayIssues = displayIssues.sort((a, b) => (a.priority || 99) - (b.priority || 99));

  // Get unique teams for filter
  const uniqueTeams = [...new Set(issues.map(i => i.team).filter(Boolean))];

  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg, padding: "20px 24px", fontFamily: "'Outfit', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, color: BRAND.accent, textTransform: "uppercase", letterSpacing: 3, fontWeight: 700, marginBottom: 3 }}>Furniture Bank · Digital Guidance</div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: BRAND.text, letterSpacing: "-0.5px" }}>Requests Dashboard</h1>
            <div style={{ fontSize: 11, color: BRAND.textDim, marginTop: 3 }}>Managed Success · Ascendably</div>
          </div>
          <div style={{ textAlign: "right" }}>
            {lastUpdated && (
              <div style={{ fontSize: 10, color: BRAND.textDim }}>
                Last updated: {lastUpdated.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </div>
            )}
            {error && <div style={{ fontSize: 9, color: BRAND.danger, marginTop: 2 }}>{error}</div>}
          </div>
        </div>

        {/* Connection Status */}
        <ConnectionStatus
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          refreshInterval={refreshInterval}
          setRefreshInterval={setRefreshInterval}
          onRefresh={() => fetchIssues()}
        />

        {/* Show dashboard content only when we have data */}
        {issues.length === 0 && !loading ? (
          <Card style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 18, color: BRAND.text, fontWeight: 600, marginBottom: 8 }}>
              {error ? "Connection Issue" : "No Issues Found"}
            </div>
            <div style={{ fontSize: 13, color: BRAND.textMuted, maxWidth: 400, margin: "0 auto" }}>
              {error ? "Check your Linear API key configuration in Vercel." : "Your Linear workspace has no issues to display."}
            </div>
          </Card>
        ) : issues.length === 0 && loading ? (
          <Card style={{ textAlign: "center", padding: 60 }}>
            <div style={{
              width: 40, height: 40,
              border: `3px solid ${BRAND.surfaceBorder}`,
              borderTop: `3px solid ${BRAND.accent}`,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px"
            }} />
            <div style={{ fontSize: 14, color: BRAND.textMuted, fontFamily: "'Outfit', sans-serif" }}>
              Loading issues from Linear...
            </div>
          </Card>
        ) : (
          <>
            {/* Team Filter */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              <TabBtn active={teamFilter === "all"} onClick={() => setTeamFilter("all")}>All Teams ({issues.length})</TabBtn>
              {uniqueTeams.map((team) => (
                <TabBtn key={team} active={teamFilter === team} onClick={() => setTeamFilter(team)}>
                  {TEAM_NAMES[team] || team} ({issues.filter(i => i.team === team).length})
                </TabBtn>
              ))}
            </div>

            {/* Queue Status Cards */}
            <SH icon="⚡">Current Queue Status</SH>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              {Object.entries(queueCounts).filter(([k, v]) => v > 0 || ["Guidance Queue", "Support Queue", "COE Queue", "Admin Queue", "triage"].includes(k)).map(([key, count]) => (
                <StatCard
                  key={key}
                  label={QUEUE_CONFIG[key]?.short || key}
                  value={count}
                  color={QUEUE_CONFIG[key]?.color}
                  small
                />
              ))}
            </div>

            {/* Distribution Row */}
            <SH icon="📊">Distribution</SH>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              <Card title="Active by Queue"><div style={{ display: "flex", justifyContent: "center" }}><DonutChart data={queueDonut} total={active.length} label="Active" /></div></Card>
              <Card title="Active by Department"><div style={{ display: "flex", justifyContent: "center" }}><DonutChart data={deptDonut} total={active.length} label="Active" /></div></Card>
              <Card title="Requests by Creator"><div style={{ display: "flex", justifyContent: "center" }}><DonutChart data={creatorDonut} total={filteredByTeam.length} label="Total" /></div></Card>
            </div>

            {/* This Month */}
            <SH icon="📅">This Month</SH>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <StatCard label="Opened" value={openedThis} color={BRAND.accent} />
              <StatCard label="Closed" value={closedThis} sub="Completed + Canceled + Duplicate" color={BRAND.orange} />
              <StatCard label="Completed" value={completedThis} sub="Done" color={BRAND.success} />
            </div>

            {/* Breakdown */}
            <SH icon="📋">Breakdown</SH>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
              <Card title="Active by Queue"><BarChart data={queueBar} /></Card>
              <Card title="Active by Priority"><BarChart data={priBar} /></Card>
              <Card title="Closed by Queue">{closedBar.length > 0 ? <BarChart data={closedBar} /> : <div style={{ color: BRAND.textDim, fontSize: 12, textAlign: "center", padding: 20 }}>No closed items yet</div>}</Card>
            </div>

            {/* Last Month */}
            <SH icon="🗓️">Last Month</SH>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <StatCard label="Opened" value={openedLast} color={BRAND.accent} small />
              <StatCard label="Closed" value={closedLast} color={BRAND.orange} small />
              <StatCard label="Completed" value={completedLast} color={BRAND.success} small />
            </div>

            {/* Trends */}
            <SH icon="📈">Trends (6 Months)</SH>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Card title="Opened by Month"><MonthlyBars data={trend.map((t) => ({ label: t.label, value: t.opened, color: BRAND.accent }))} /></Card>
              <Card title="Completed by Month"><MonthlyBars data={trend.map((t) => ({ label: t.label, value: t.completed, color: BRAND.success }))} /></Card>
            </div>

            {/* Active Issues */}
            <SH icon="🔥">Active Requests ({displayIssues.length})</SH>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              <TabBtn active={activeTab === "all"} onClick={() => setActiveTab("all")}>All ({active.length})</TabBtn>
              {Object.entries(queueCounts).filter(([, v]) => v > 0).map(([k, v]) => (
                <TabBtn key={k} active={activeTab === k} onClick={() => setActiveTab(k)}>{QUEUE_CONFIG[k].short} ({v})</TabBtn>
              ))}
            </div>
            <Card>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {displayIssues.map((issue, i) => <IssueRow key={i} issue={issue} />)}
                {displayIssues.length === 0 && <div style={{ textAlign: "center", padding: 28, color: BRAND.textDim, fontSize: 13 }}>No active requests in this queue</div>}
              </div>
            </Card>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "28px 0 12px", fontSize: 10, color: BRAND.textDim }}>
          Furniture Bank · Managed Success · Powered by Linear + Claude
        </div>
      </div>
    </div>
  );
}
