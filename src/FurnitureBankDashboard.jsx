import React, { useState, useEffect, useCallback, useRef } from "react";

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
  "External Support": { color: "#22d3ee", short: "External Support" },
  none: { color: "#475569", short: "Uncategorized" },
};

const REQUEST_TYPES = ["Problem", "Feature Request", "Agenda Item", "To-Do", "Roadmap Item", "Question", "Report", "Bug", "Improvement", "Data Quality Goal", "Technology Evaluation", "Potential KPI"];

const STATUS_CONFIG = {
  Triage: { color: "#FC7840", type: "triage" },
  New: { color: "#60a5fa", type: "unstarted" },
  "In Progress": { color: "#4cb782", type: "started" },
  Evaluating: { color: "#f2c94c", type: "started" },
  Reviewing: { color: "#26b5ce", type: "started" },
  Blocked: { color: "#eb5757", type: "started" },
  Done: { color: "#5e6ad2", type: "completed" },
  Merged: { color: "#5e6ad2", type: "completed" },
  Cancelled: { color: "#5e6ad2", type: "completed" },
  Canceled: { color: "#5e6ad2", type: "completed" },
  "Parking Lot": { color: "#5e6ad2", type: "completed" },
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
  "Digital Guidance": "DG",
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

// Returns a stable identifier for grouping issues by creator. Falls back
// across email → name → displayName, so service accounts (no email) and
// external integrations still get distinct buckets when possible.
const creatorKey = (c) => {
  if (!c) return "unknown";
  return c.email || c.name || c.displayName || "unknown";
};

// Returns the legend/drill label for a creator. Curated USER_DISPLAY wins
// for known staff, then Linear's name/displayName, then the full email,
// then "Unknown".
const creatorLabel = (c) => {
  if (!c) return "Unknown";
  if (c.email && USER_DISPLAY[c.email]) return USER_DISPLAY[c.email];
  if (c.name) return c.name;
  if (c.displayName) return c.displayName;
  if (c.email) return c.email;
  return "Unknown";
};

// Set true when the URL includes ?debug=1. Used to surface diagnostic
// panels that should not appear in normal use.
const DEBUG_MODE = typeof window !== "undefined"
  && new URLSearchParams(window.location.search).get("debug") === "1";

const CLOSED_STATUSES = ["Done", "Merged", "Cancelled", "Canceled", "Parking Lot", "Roadmap"];

// ─── Chart Tooltip ───
function ChartTooltip({ text, x, y }) {
  if (!text) return null;
  return (
    <div style={{
      position: "fixed", left: x + 14, top: y - 10, pointerEvents: "none", zIndex: 2000,
      background: BRAND.bg, border: `1px solid ${BRAND.surfaceBorder}`, borderRadius: 6,
      padding: "6px 10px", fontSize: 11, color: BRAND.text, fontFamily: "'Outfit', sans-serif",
      boxShadow: "0 4px 12px rgba(0,0,0,0.5)", whiteSpace: "nowrap",
      opacity: 1, transform: "translateY(0)",
      transition: "opacity 0.12s, transform 0.12s",
    }}>{text}</div>
  );
}

// ─── SVG Donut ───
function DonutChart({ data, total, size = 210, label, onSegmentClick }) {
  const [tip, setTip] = useState(null);
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle cx={c} cy={c} r={r} fill="none" stroke={BRAND.surfaceBorder} strokeWidth={r - ir} />
        ) : (
          segs.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} opacity={0.88}
              style={{ transition: "opacity 0.2s", cursor: onSegmentClick ? "pointer" : "default" }}
              onClick={() => onSegmentClick && onSegmentClick(s.label, s.filterKey)}
              onMouseEnter={(e) => (e.target.style.opacity = 1)}
              onMouseMove={(e) => setTip({ text: `${s.label}: ${s.value} (${total > 0 ? Math.round((s.value / total) * 100) : 0}%)`, x: e.clientX, y: e.clientY })}
              onMouseLeave={(e) => { e.target.style.opacity = 0.88; setTip(null); }}
            />
          ))
        )}
        <text x={c} y={c - 6} textAnchor="middle" fill={BRAND.text} fontSize="30" fontWeight="800" fontFamily="'Outfit', sans-serif">{total}</text>
        <text x={c} y={c + 14} textAnchor="middle" fill={BRAND.textMuted} fontSize="10" fontFamily="'Outfit', sans-serif" letterSpacing="1.5" style={{ textTransform: "uppercase" }}>{label}</text>
      </svg>
      <ChartTooltip text={tip?.text} x={tip?.x || 0} y={tip?.y || 0} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: "10px", justifyContent: "center", maxWidth: size + 80 }}>
        {data.filter((d) => d.value > 0).map((d, i) => (
          <div key={i}
            onClick={() => onSegmentClick && onSegmentClick(d.label, d.filterKey)}
            style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: BRAND.textMuted, fontFamily: "'Outfit', sans-serif", cursor: onSegmentClick ? "pointer" : "default" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
            <span>{d.label} <span style={{ fontWeight: 600, color: BRAND.text }}>{d.value}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Chart ───
function BarChart({ data, onBarClick }) {
  const [tip, setTip] = useState(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", position: "relative" }}>
      {data.map((d, i) => (
        <div key={i}
          onClick={() => onBarClick && onBarClick(d.label, d.filterKey)}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: onBarClick ? "pointer" : "default", borderRadius: 6, padding: "2px 0", transition: "background 0.15s" }}
          onMouseEnter={(e) => onBarClick && (e.currentTarget.style.background = BRAND.surfaceHover)}
          onMouseMove={(e) => setTip({ text: `${d.label}: ${d.value} (${total > 0 ? Math.round((d.value / total) * 100) : 0}%)`, x: e.clientX, y: e.clientY })}
          onMouseLeave={(e) => { if (onBarClick) e.currentTarget.style.background = "transparent"; setTip(null); }}
        >
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
      <ChartTooltip text={tip?.text} x={tip?.x || 0} y={tip?.y || 0} />
    </div>
  );
}

// ─── Monthly Trend Bars (supports stacked) ───
function MonthlyBars({ data, stacked }) {
  const [tip, setTip] = useState(null);

  if (stacked) {
    const max = Math.max(...data.map((d) => Math.max(d.value1 + d.value2, 1)), 1);
    return (
      <div style={{ width: "100%", overflowX: "auto", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: 150, padding: "0 4px" }}>
          {data.map((d, i) => {
            const h1 = (d.value1 / max) * 110;
            const h2 = ((d.value2) / max) * 110;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", flex: 1, minWidth: 28 }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: BRAND.text, fontFamily: "'Outfit', sans-serif" }}>
                  {(d.value1 + d.value2) || ""}
                </span>
                <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 36, alignItems: "center" }}>
                  <div
                    onMouseMove={(e) => setTip({ text: `${d.label} — ${d.label2}: ${d.value2}`, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTip(null)}
                    style={{
                      width: "100%",
                      height: `${Math.max(h2, d.value2 > 0 ? 3 : 0)}px`,
                      background: `linear-gradient(180deg, ${d.color2}, ${d.color2}66)`,
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                      cursor: "default",
                    }} />
                  <div
                    onMouseMove={(e) => setTip({ text: `${d.label} — ${d.label1}: ${d.value1}`, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTip(null)}
                    style={{
                      width: "100%",
                      height: `${Math.max(h1, d.value1 > 0 ? 3 : 0)}px`,
                      background: `linear-gradient(180deg, ${d.color1}, ${d.color1}66)`,
                      borderRadius: h2 === 0 ? "4px 4px 0 0" : "0",
                      transition: "height 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                      cursor: "default",
                    }} />
                </div>
                <span style={{ fontSize: "9px", color: BRAND.textDim, fontFamily: "'Outfit', sans-serif", textAlign: "center" }}>{d.label}</span>
              </div>
            );
          })}
        </div>
        <ChartTooltip text={tip?.text} x={tip?.x || 0} y={tip?.y || 0} />
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ width: "100%", overflowX: "auto", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: 150, padding: "0 4px" }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", flex: 1, minWidth: 28 }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: BRAND.text, fontFamily: "'Outfit', sans-serif" }}>{d.value || ""}</span>
            <div
              onMouseMove={(e) => setTip({ text: `${d.label}: ${d.value}`, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setTip(null)}
              style={{
                width: "100%", maxWidth: 36,
                height: `${Math.max((d.value / max) * 110, d.value > 0 ? 4 : 0)}px`,
                background: `linear-gradient(180deg, ${d.color}, ${d.color}66)`,
                borderRadius: "4px 4px 0 0",
                transition: "height 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                cursor: "default",
              }} />
            <span style={{ fontSize: "9px", color: BRAND.textDim, fontFamily: "'Outfit', sans-serif", textAlign: "center" }}>{d.label}</span>
          </div>
        ))}
      </div>
      <ChartTooltip text={tip?.text} x={tip?.x || 0} y={tip?.y || 0} />
    </div>
  );
}

// ─── Stat Card ───
function StatCard({ label, value, sub, color, small, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: BRAND.surface,
        border: `1px solid ${BRAND.surfaceBorder}`,
        borderRadius: 10,
        padding: small ? "14px 16px" : "18px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: small ? 80 : 100, position: "relative", overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.2s, background 0.2s",
      }}
      onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.borderColor = BRAND.accent + "44"; e.currentTarget.style.background = BRAND.surfaceHover; } }}
      onMouseLeave={(e) => { if (onClick) { e.currentTarget.style.borderColor = BRAND.surfaceBorder; e.currentTarget.style.background = BRAND.surface; } }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color || BRAND.accent, opacity: 0.7 }} />
      <div style={{ fontSize: "10px", color: BRAND.textDim, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6, textAlign: "center", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: small ? "32px" : "38px", fontWeight: 800, color: BRAND.text, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "9px", color: BRAND.textDim, marginTop: 4, fontFamily: "'Outfit', sans-serif" }}>{sub}</div>}
      {onClick && <div style={{ fontSize: "8px", color: BRAND.textDim, marginTop: 4, fontFamily: "'Outfit', sans-serif", opacity: 0.6 }}>Click to view</div>}
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
function Card({ children, title, info, style: s }) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div style={{ background: BRAND.surface, border: `1px solid ${BRAND.surfaceBorder}`, borderRadius: 10, padding: 20, ...s }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: BRAND.textDim, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: showInfo ? 8 : 14, fontWeight: 600 }}>
          {title}
          {info && (
            <span
              onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
              style={{
                cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 16, height: 16, borderRadius: "50%", fontSize: 10, fontWeight: 700,
                background: showInfo ? BRAND.accent : BRAND.surfaceBorder,
                color: showInfo ? "#fff" : BRAND.textMuted,
                transition: "all 0.2s", flexShrink: 0, lineHeight: 1, textTransform: "none",
              }}
              onMouseEnter={(e) => { if (!showInfo) e.currentTarget.style.background = BRAND.accent + "66"; }}
              onMouseLeave={(e) => { if (!showInfo) e.currentTarget.style.background = BRAND.surfaceBorder; }}
            >i</span>
          )}
        </div>
      )}
      {showInfo && info && (
        <div style={{
          fontSize: 11, fontWeight: 400, color: BRAND.textMuted, fontFamily: "'Outfit', sans-serif",
          padding: "10px 12px", marginBottom: 14, borderRadius: 6, lineHeight: 1.6,
          background: `${BRAND.accent}0a`, border: `1px solid ${BRAND.accent}22`,
          borderLeft: `3px solid ${BRAND.accent}`,
        }}>{info}</div>
      )}
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

// ─── Drill-Down Panel ───
function DrillDownPanel({ title, issues, onClose }) {
  if (!issues) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", zIndex: 1000,
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      padding: "60px 20px", overflowY: "auto",
    }} onClick={onClose}>
      <div style={{
        background: BRAND.bg, border: `1px solid ${BRAND.surfaceBorder}`,
        borderRadius: 12, padding: 24, width: "100%", maxWidth: 700,
        maxHeight: "80vh", overflowY: "auto",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.text, fontFamily: "'Outfit', sans-serif" }}>{title}</div>
            <div style={{ fontSize: 11, color: BRAND.textDim, fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>{issues.length} issue{issues.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={onClose} style={{
            background: BRAND.surface, border: `1px solid ${BRAND.surfaceBorder}`,
            borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 600,
            color: BRAND.textMuted, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
          }}>Close</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {issues.map((issue, i) => <IssueRow key={i} issue={issue} />)}
          {issues.length === 0 && <div style={{ textAlign: "center", padding: 28, color: BRAND.textDim, fontSize: 13 }}>No matching issues</div>}
        </div>
      </div>
    </div>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [drillDown, setDrillDown] = useState(null);

  const [dataUrl, setDataUrl] = useState(DEFAULT_API_URL);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const refreshTimerRef = useRef(null);

  const [labelHistory, setLabelHistory] = useState(null);
  const [labelHistoryLoading, setLabelHistoryLoading] = useState(false);
  const [labelHistoryError, setLabelHistoryError] = useState(null);
  const [expandedQueues, setExpandedQueues] = useState({});
  const [showStatusGuide, setShowStatusGuide] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dashboardRef = useRef(null);

  const openDrillDown = (title, issues) => setDrillDown({ title, issues });
  const closeDrillDown = () => setDrillDown(null);

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

      let issueData = [];

      if (Array.isArray(data)) {
        issueData = data;
      } else if (data.issues && Array.isArray(data.issues)) {
        issueData = data.issues;
      } else if (data.data && Array.isArray(data.data)) {
        issueData = data.data;
      } else if (data.error) {
        throw new Error(data.error);
      }

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
        updatedAt: i.updatedAt || i.updated_at || null,
        url: i.url || null,
        creator: i.creator
          ? (typeof i.creator === "string"
              ? { email: i.creator, name: null, displayName: null }
              : { email: i.creator.email || null, name: i.creator.name || null, displayName: i.creator.displayName || null })
          : null,
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

  const fetchLabelHistory = useCallback(async () => {
    try {
      setLabelHistoryLoading(true);
      setLabelHistoryError(null);
      const resp = await fetch("/api/label-history");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setLabelHistory(data);
    } catch (err) {
      setLabelHistoryError(err.message);
    } finally {
      setLabelHistoryLoading(false);
    }
  }, []);

  const exportReport = useCallback(async () => {
    if (!dashboardRef.current || exporting) return;
    try {
      setExporting(true);
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      // Hide sections we don't want in the report
      const excluded = dashboardRef.current.querySelectorAll("[data-export-exclude]");
      excluded.forEach((el) => { el.style.display = "none"; });

      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: BRAND.bg,
        scale: 2,
        useCORS: true,
      });

      // Restore hidden sections
      excluded.forEach((el) => { el.style.display = ""; });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let y = 0;
      while (y < imgHeight) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -y, pdfWidth, imgHeight);
        y += pageHeight;
      }
      pdf.save(`furniture-bank-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("Export failed:", err);
      // Restore in case of error
      const excluded = dashboardRef.current?.querySelectorAll("[data-export-exclude]");
      if (excluded) excluded.forEach((el) => { el.style.display = ""; });
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  useEffect(() => {
    fetchIssues(DEFAULT_API_URL);
    fetchLabelHistory();
  }, []);

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
  const filteredByTeam = issues;
  const active = filteredByTeam.filter((i) => !CLOSED_STATUSES.includes(i.status));
  const doneOnly = filteredByTeam.filter((i) => i.status === "Done" || i.status === "Merged");
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
    const labels = (issue.labels || []);
    const depts = labels.filter((l) => deptKeys.includes(l) && l !== "Multi-Department Impact");
    if (depts.length > 0) {
      depts.forEach((d) => { deptCounts[d]++; });
    } else {
      deptCounts["none"]++;
    }
  });

  const creatorCounts = {};
  const creatorObjects = {};
  filteredByTeam.forEach((i) => {
    const key = creatorKey(i.creator);
    creatorCounts[key] = (creatorCounts[key] || 0) + 1;
    if (!creatorObjects[key]) creatorObjects[key] = i.creator;
  });

  const priCounts = {};
  active.forEach((i) => { const p = i.priority ?? 0; priCounts[p] = (priCounts[p] || 0) + 1; });

  const now = new Date();
  const thisMS = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMS = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastME = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const getClosedDate = (i) => i.completedAt || i.updatedAt;

  const openedThis = filteredByTeam.filter((i) => new Date(i.createdAt) >= thisMS).length;
  const closedThis = closed.filter((i) => { const dt = getClosedDate(i); return dt && new Date(dt) >= thisMS; }).length;
  const completedThis = doneOnly.filter((i) => i.completedAt && new Date(i.completedAt) >= thisMS).length;
  const openedLast = filteredByTeam.filter((i) => { const d = new Date(i.createdAt); return d >= lastMS && d <= lastME; }).length;
  const closedLast = closed.filter((i) => { const dt = getClosedDate(i); if (!dt) return false; const d = new Date(dt); return d >= lastMS && d <= lastME; }).length;
  const completedLast = doneOnly.filter((i) => { if (!i.completedAt) return false; const d = new Date(i.completedAt); return d >= lastMS && d <= lastME; }).length;

  // ─── 12-month trend data ───
  const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trend = [];
  for (let m = 11; m >= 0; m--) {
    const s = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const e = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59);
    trend.push({
      label: MN[s.getMonth()] + (s.getFullYear() !== now.getFullYear() ? " '" + String(s.getFullYear()).slice(2) : ""),
      opened: filteredByTeam.filter((i) => { const d = new Date(i.createdAt); return d >= s && d <= e; }).length,
      doneOnly: doneOnly.filter((i) => { if (!i.completedAt) return false; const d = new Date(i.completedAt); return d >= s && d <= e; }).length,
      allClosed: closed.filter((i) => { const dt = getClosedDate(i); if (!dt) return false; const d = new Date(dt); return d >= s && d <= e; }).length,
    });
  }

  // ─── Recently closed by queue (last 30 days) ───
  const recentlyClosed = closed.filter((i) => {
    const dt = getClosedDate(i);
    return dt && new Date(dt) >= thirtyDaysAgo;
  });
  const closedByQueue = {};
  recentlyClosed.forEach((i) => {
    const q = (i.labels || []).find((l) => queueKeys.includes(l));
    const key = q || "triage";
    closedByQueue[key] = (closedByQueue[key] || 0) + 1;
  });
  const closedBar = Object.entries(closedByQueue).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({
    label: QUEUE_CONFIG[k]?.short || k, value: v, color: QUEUE_CONFIG[k]?.color || "#64748b", filterKey: k,
  }));

  // ─── Chart data ───
  const deptDonut = Object.entries(deptCounts).filter(([, v]) => v > 0).map(([k, v]) => ({
    label: DEPT_CONFIG[k].short, value: v, color: DEPT_CONFIG[k].color, filterKey: k,
  }));
  const creatorDonut = Object.entries(creatorCounts).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({
    label: creatorLabel(creatorObjects[k]),
    value: v,
    color: PROJECT_COLORS[i % PROJECT_COLORS.length],
    filterKey: k,
  }));

  const queueBar = Object.entries(queueCounts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({
    label: QUEUE_CONFIG[k].short, value: v, color: QUEUE_CONFIG[k].color, filterKey: k,
  }));
  const priBar = [1, 2, 3, 4, 0].filter((p) => priCounts[p]).map((p) => ({
    label: PRIORITY_CONFIG[p].label, value: priCounts[p], color: PRIORITY_CONFIG[p].color, filterKey: p,
  }));

  // ─── Drill-down handlers ───
  const drillQueue = (label, key) => {
    const items = key === "triage"
      ? active.filter((i) => !(i.labels || []).some((l) => queueKeys.includes(l)))
      : active.filter((i) => (i.labels || []).includes(key));
    openDrillDown(`Active: ${label}`, items);
  };

  const drillDept = (label, key) => {
    const items = key === "none"
      ? active.filter((i) => !(i.labels || []).some((l) => deptKeys.includes(l)))
      : active.filter((i) => (i.labels || []).includes(key));
    openDrillDown(`Active: ${label}`, items);
  };

  const drillCreator = (label, key) => {
    const items = filteredByTeam.filter((i) => creatorKey(i.creator) === key);
    openDrillDown(`Requests by ${label}`, items);
  };

  const drillPriority = (label, key) => {
    const items = active.filter((i) => (i.priority ?? 0) === key);
    openDrillDown(`Active ${label} Priority`, items);
  };

  const drillClosedQueue = (label, key) => {
    const items = recentlyClosed.filter((i) => {
      if (key === "triage") return !(i.labels || []).some((l) => queueKeys.includes(l));
      return (i.labels || []).includes(key);
    });
    openDrillDown(`Recently Closed: ${label}`, items);
  };

  // ─── Display issues for active list ───
  let displayIssues = active;
  if (activeTab !== "all") {
    displayIssues = activeTab === "triage"
      ? active.filter((i) => !(i.labels || []).some((l) => queueKeys.includes(l)))
      : active.filter((i) => (i.labels || []).includes(activeTab));
  }
  displayIssues = displayIssues.sort((a, b) => (a.priority || 99) - (b.priority || 99));


  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg, padding: "20px 24px", fontFamily: "'Outfit', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* Drill-down overlay */}
      {drillDown && <DrillDownPanel title={drillDown.title} issues={drillDown.issues} onClose={closeDrillDown} />}

      <div ref={dashboardRef} style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, color: BRAND.accent, textTransform: "uppercase", letterSpacing: 3, fontWeight: 700, marginBottom: 3 }}>Furniture Bank · Digital Guidance</div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: BRAND.text, letterSpacing: "-0.5px" }}>Requests Dashboard</h1>
            <div style={{ fontSize: 11, color: BRAND.textDim, marginTop: 3 }}>Managed Success · Ascendably</div>
          </div>
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <button
              onClick={exportReport}
              disabled={exporting || loading}
              style={{
                background: exporting ? BRAND.surfaceBorder : BRAND.accent,
                border: "none", borderRadius: 6, padding: "6px 14px",
                color: exporting ? BRAND.textDim : "#fff", fontSize: 11, fontWeight: 600,
                fontFamily: "'Outfit', sans-serif", cursor: exporting ? "wait" : "pointer",
                transition: "background 0.2s, opacity 0.2s",
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!exporting) e.currentTarget.style.background = "#2ca8e0"; }}
              onMouseLeave={(e) => { if (!exporting) e.currentTarget.style.background = BRAND.accent; }}
            >
              {exporting ? "Exporting..." : "Export Report"}
            </button>
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
                  onClick={() => drillQueue(QUEUE_CONFIG[key]?.short || key, key)}
                />
              ))}
            </div>

            {/* Distribution — dept + creator only (queue covered by bar chart below) */}
            <SH icon="📊">Distribution</SH>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Card title="Active by Department" info="Open issues grouped by department label. Issues tagged with multiple departments are counted in each. Excludes all closed statuses.">
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <DonutChart data={deptDonut} total={Object.values(deptCounts).reduce((a, b) => a + b, 0)} label="Active" onSegmentClick={drillDept} />
                </div>
              </Card>
              <Card title="Requests by Creator" info="All issues (open and closed) grouped by who created them in Linear.">
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <DonutChart data={creatorDonut} total={filteredByTeam.length} label="Total" onSegmentClick={drillCreator} />
                </div>
                {DEBUG_MODE && (() => {
                  const nullCount = filteredByTeam.filter((i) => i.creator === null).length;
                  const noEmailCount = filteredByTeam.filter((i) => i.creator !== null && !i.creator.email).length;
                  const distinctKeys = Object.keys(creatorCounts).filter((k) => k !== "unknown");
                  const rows = Object.entries(creatorCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
                    const c = creatorObjects[k];
                    return {
                      label: creatorLabel(c),
                      email: c?.email || "—",
                      name: c?.name || "—",
                      count: v,
                    };
                  });
                  return (
                    <div data-export-exclude="true" style={{
                      marginTop: 16,
                      padding: "12px 14px",
                      borderRadius: 8,
                      background: `${BRAND.warning}0a`,
                      border: `1px solid ${BRAND.warning}33`,
                      borderLeft: `3px solid ${BRAND.warning}`,
                      position: "relative",
                      fontFamily: "'Outfit', sans-serif",
                    }}>
                      <div style={{
                        position: "absolute", top: 8, right: 12,
                        fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                        color: BRAND.warning, textTransform: "uppercase",
                      }}>Debug</div>
                      <div style={{ fontSize: 11, color: BRAND.text, fontWeight: 600, marginBottom: 8 }}>Creator data quality</div>
                      <div style={{ fontSize: 11, color: BRAND.textMuted, marginBottom: 4 }}>
                        Null creators: <span style={{ color: BRAND.text, fontWeight: 600 }}>{nullCount}</span> (likely integrations, deleted users, or imports)
                      </div>
                      <div style={{ fontSize: 11, color: BRAND.textMuted, marginBottom: 4 }}>
                        No-email creators: <span style={{ color: BRAND.text, fontWeight: 600 }}>{noEmailCount}</span> (creator exists but has no email)
                      </div>
                      <div style={{ fontSize: 11, color: BRAND.textMuted, marginBottom: 10 }}>
                        Distinct creators: <span style={{ color: BRAND.text, fontWeight: 600 }}>{distinctKeys.length}</span>
                      </div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1.6fr 1.2fr auto",
                        gap: "4px 12px",
                        fontSize: 10,
                      }}>
                        <div style={{ color: BRAND.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Label</div>
                        <div style={{ color: BRAND.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Email</div>
                        <div style={{ color: BRAND.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Linear name</div>
                        <div style={{ color: BRAND.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Count</div>
                        {rows.map((r, i) => (
                          <React.Fragment key={i}>
                            <div style={{ color: BRAND.text }}>{r.label}</div>
                            <div style={{ color: BRAND.textMuted }}>{r.email}</div>
                            <div style={{ color: BRAND.textMuted }}>{r.name}</div>
                            <div style={{ color: BRAND.text, fontWeight: 600, textAlign: "right" }}>{r.count}</div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Card>
            </div>

            {/* This Month */}
            <SH icon="📅">This Month</SH>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <StatCard label="Opened" value={openedThis} color={BRAND.accent}
                onClick={() => openDrillDown("Opened This Month", filteredByTeam.filter((i) => new Date(i.createdAt) >= thisMS))} />
              <StatCard label="Closed" value={closedThis} sub="All closed statuses" color={BRAND.orange}
                onClick={() => openDrillDown("Closed This Month", closed.filter((i) => { const dt = getClosedDate(i); return dt && new Date(dt) >= thisMS; }))} />
              <StatCard label="Completed" value={completedThis} sub="Done" color={BRAND.success}
                onClick={() => openDrillDown("Completed This Month (Done)", doneOnly.filter((i) => i.completedAt && new Date(i.completedAt) >= thisMS))} />
            </div>

            {/* Breakdown */}
            <SH icon="📋">Breakdown</SH>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
              <Card title="Active by Queue" info="Open issues grouped by queue label. Unqueued issues appear as Triage. Click a bar to see the issues."><BarChart data={queueBar} onBarClick={drillQueue} /></Card>
              <Card title="Active by Priority" info="Open issues grouped by Linear priority level (Urgent, High, Normal, Low, None). Click a bar to see the issues."><BarChart data={priBar} onBarClick={drillPriority} /></Card>
              <Card title={`Recently Closed by Queue (last 30 days) · ${recentlyClosed.length} total`} info="Issues moved to any closed status (Done, Merged, Cancelled, Parking Lot, Roadmap) in the last 30 days, grouped by queue.">
                {closedBar.length > 0
                  ? <BarChart data={closedBar} onBarClick={drillClosedQueue} />
                  : <div style={{ color: BRAND.textDim, fontSize: 12, textAlign: "center", padding: 20 }}>No items closed in the last 30 days</div>}
              </Card>
            </div>

            <div data-export-exclude="true">
            {/* Label History — issues that ever had each queue label */}
            <SH icon="🏷️">All-Time Queue History</SH>
            <Card title="Issues that ever had each queue label (including removed)" info="Scans Linear issue history to find every issue that was ever assigned each queue label, even if the label was later removed. Expand a row to see the monthly breakdown.">
              {labelHistoryLoading ? (
                <div style={{ textAlign: "center", padding: 20, color: BRAND.textMuted, fontSize: 12 }}>Loading label history...</div>
              ) : labelHistoryError ? (
                <div style={{ textAlign: "center", padding: 20, color: BRAND.danger, fontSize: 12 }}>Error: {labelHistoryError}</div>
              ) : labelHistory ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(labelHistory.labelHistory || {}).map(([labelName, data]) => {
                    const qc = QUEUE_CONFIG[labelName];
                    if (!qc) return null;
                    const isExpanded = expandedQueues[labelName];

                    // Build monthly breakdown
                    const monthlyMap = {};
                    (data.issues || []).forEach((issue) => {
                      const d = issue.labelAddedAt ? new Date(issue.labelAddedAt) : null;
                      const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "unknown";
                      if (!monthlyMap[key]) monthlyMap[key] = { touched: 0, completed: 0, issues: [] };
                      monthlyMap[key].touched++;
                      if (issue.completedAt) {
                        const cd = new Date(issue.completedAt);
                        const ck = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, "0")}`;
                        if (ck === key) monthlyMap[key].completed++;
                      }
                      monthlyMap[key].issues.push(issue);
                    });
                    const months = Object.entries(monthlyMap)
                      .filter(([k]) => k !== "unknown")
                      .sort((a, b) => b[0].localeCompare(a[0]));
                    const unknownCount = monthlyMap["unknown"]?.touched || 0;

                    const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const fmtMonth = (key) => {
                      const [y, m] = key.split("-");
                      return `${MN[parseInt(m, 10) - 1]} ${y}`;
                    };

                    return (
                      <div key={labelName} style={{ borderRadius: 8, border: `1px solid ${BRAND.surfaceBorder}`, overflow: "hidden" }}>
                        {/* Header row — click to toggle accordion */}
                        <div
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 14px", background: BRAND.bg, cursor: "pointer",
                            transition: "background 0.15s",
                          }}
                          onClick={() => setExpandedQueues((prev) => ({ ...prev, [labelName]: !prev[labelName] }))}
                          onMouseEnter={(e) => { e.currentTarget.style.background = BRAND.surfaceHover; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = BRAND.bg; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 10, color: BRAND.textDim, transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>&#9654;</span>
                            <span style={{ fontSize: 14 }}>{qc.icon}</span>
                            <span style={{ fontSize: 13, color: qc.color, fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>{qc.short}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.text, fontFamily: "'Outfit', sans-serif" }}>{data.totalEverHad}</div>
                              <div style={{ fontSize: 9, color: BRAND.textDim, fontFamily: "'Outfit', sans-serif" }}>all-time</div>
                            </div>
                          </div>
                        </div>

                        {/* Accordion — monthly breakdown */}
                        {isExpanded && (
                          <div style={{ borderTop: `1px solid ${BRAND.surfaceBorder}`, padding: "8px 14px", background: BRAND.surface }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "0", fontSize: 10, fontFamily: "'Outfit', sans-serif" }}>
                              {/* Header */}
                              <div style={{ padding: "6px 0", color: BRAND.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${BRAND.surfaceBorder}` }}>Month</div>
                              <div style={{ padding: "6px 12px", color: BRAND.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, textAlign: "right", borderBottom: `1px solid ${BRAND.surfaceBorder}` }}>Touched</div>
                              <div style={{ padding: "6px 12px", color: BRAND.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, textAlign: "right", borderBottom: `1px solid ${BRAND.surfaceBorder}` }}>Completed</div>
                              <div style={{ padding: "6px 0", color: BRAND.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, textAlign: "right", borderBottom: `1px solid ${BRAND.surfaceBorder}` }}></div>
                              {/* Rows */}
                              {months.map(([key, m]) => (
                                <React.Fragment key={key}>
                                  <div style={{ padding: "7px 0", color: BRAND.text, fontWeight: 500, borderBottom: `1px solid ${BRAND.surfaceBorder}22` }}>{fmtMonth(key)}</div>
                                  <div style={{ padding: "7px 12px", color: qc.color, fontWeight: 700, textAlign: "right", fontSize: 13, borderBottom: `1px solid ${BRAND.surfaceBorder}22` }}>{m.touched}</div>
                                  <div style={{ padding: "7px 12px", color: BRAND.success, fontWeight: 700, textAlign: "right", fontSize: 13, borderBottom: `1px solid ${BRAND.surfaceBorder}22` }}>{m.completed}</div>
                                  <div
                                    style={{ padding: "7px 0", color: BRAND.textDim, textAlign: "right", cursor: "pointer", borderBottom: `1px solid ${BRAND.surfaceBorder}22` }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDrillDown(`${qc.short} — ${fmtMonth(key)}`, m.issues.map((i) => ({
                                        identifier: i.identifier, title: i.title, url: i.url,
                                        status: i.status, labels: i.stillHasLabel ? [labelName] : [],
                                        priority: 0, team: null, creator: null, assignee: null,
                                        createdAt: i.labelAddedAt || new Date().toISOString(),
                                      })));
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = qc.color; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = BRAND.textDim; }}
                                  >view</div>
                                </React.Fragment>
                              ))}
                            </div>
                            {unknownCount > 0 && (
                              <div style={{ fontSize: 10, color: BRAND.textDim, marginTop: 8, fontFamily: "'Outfit', sans-serif" }}>
                                + {unknownCount} issue{unknownCount > 1 ? "s" : ""} with no recorded label-add date
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </Card>

            </div>

            {/* Last Month */}
            <SH icon="🗓️">Last Month</SH>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <StatCard label="Opened" value={openedLast} color={BRAND.accent} small
                onClick={() => openDrillDown("Opened Last Month", filteredByTeam.filter((i) => { const d = new Date(i.createdAt); return d >= lastMS && d <= lastME; }))} />
              <StatCard label="Closed" value={closedLast} color={BRAND.orange} small
                onClick={() => openDrillDown("Closed Last Month", closed.filter((i) => { const dt = getClosedDate(i); if (!dt) return false; const d = new Date(dt); return d >= lastMS && d <= lastME; }))} />
              <StatCard label="Completed" value={completedLast} color={BRAND.success} small
                onClick={() => openDrillDown("Completed Last Month (Done)", doneOnly.filter((i) => { if (!i.completedAt) return false; const d = new Date(i.completedAt); return d >= lastMS && d <= lastME; }))} />
            </div>

            {/* Trends — 12 months */}
            <SH icon="📈">Trends (12 Months)</SH>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Card title="Opened by Month" info="Number of issues created each month over the last 12 months.">
                <MonthlyBars data={trend.map((t) => ({ label: t.label, value: t.opened, color: BRAND.accent }))} />
              </Card>
              <Card title="Completed by Month — Done vs All Closed" info="Green = issues marked Done/Merged. Orange = other closed statuses (Cancelled, Parking Lot, Roadmap). Stacked to show total closures per month.">
                <MonthlyBars
                  stacked
                  data={trend.map((t) => ({
                    label: t.label,
                    value1: t.doneOnly,
                    color1: BRAND.success,
                    label1: "Done",
                    value2: t.allClosed - t.doneOnly,
                    color2: BRAND.orange,
                    label2: "Other closed",
                  }))}
                />
                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: BRAND.textMuted, fontFamily: "'Outfit', sans-serif" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: BRAND.success }} /> Done
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: BRAND.textMuted, fontFamily: "'Outfit', sans-serif" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: BRAND.orange }} /> Other closed (Canceled, Duplicate, etc.)
                  </div>
                </div>
              </Card>
            </div>

            <div data-export-exclude="true">
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
            </div>
          </>
        )}

        {/* Status Guide */}
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <button
            onClick={() => setShowStatusGuide((v) => !v)}
            style={{
              background: "none", border: `1px solid ${BRAND.surfaceBorder}`, borderRadius: 6,
              padding: "6px 16px", color: BRAND.textMuted, fontSize: 11, fontFamily: "'Outfit', sans-serif",
              cursor: "pointer", transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = BRAND.accent; e.currentTarget.style.color = BRAND.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BRAND.surfaceBorder; e.currentTarget.style.color = BRAND.textMuted; }}
          >
            {showStatusGuide ? "Hide" : "Show"} Status Guide & Documentation
          </button>
        </div>

        {showStatusGuide && (
          <Card title="Workflow Status Guide — Digital Guidance Team" info="These are the actual workflow states configured in Linear for the Digital Guidance team. Statuses are grouped by phase." style={{ marginTop: 14 }}>
            {[
              {
                type: "Triage",
                desc: "Newly submitted requests that have not been reviewed yet. These need initial assessment to determine queue, priority, and assignment.",
                states: [{ name: "Triage", color: "#FC7840" }],
              },
              {
                type: "Unstarted",
                desc: "Reviewed and accepted requests where work has not yet begun. They have been triaged and are waiting to be picked up.",
                states: [{ name: "New", color: "#60a5fa" }],
              },
              {
                type: "In Progress",
                desc: "Requests that are actively being worked on. These are in various stages of execution.",
                states: [
                  { name: "In Progress", color: "#4cb782", desc: "Actively being worked on" },
                  { name: "Evaluating", color: "#f2c94c", desc: "Under assessment or research" },
                  { name: "Reviewing", color: "#26b5ce", desc: "Work done, pending review or approval" },
                  { name: "Blocked", color: "#eb5757", desc: "Cannot proceed — waiting on external dependency" },
                ],
              },
              {
                type: "Closed",
                desc: "Requests that have reached a terminal state. These are no longer active.",
                states: [
                  { name: "Done", color: "#5e6ad2", desc: "Successfully completed" },
                  { name: "Merged", color: "#5e6ad2", desc: "Completed and merged (technical work)" },
                  { name: "Cancelled", color: "#5e6ad2", desc: "No longer needed or withdrawn" },
                  { name: "Parking Lot", color: "#5e6ad2", desc: "Deferred indefinitely — may revisit later" },
                  { name: "Roadmap", color: "#818cf8", desc: "Accepted for future planning, not active work" },
                ],
              },
            ].map((group) => (
              <div key={group.type} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.text, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>{group.type}</div>
                <div style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: "'Outfit', sans-serif", marginBottom: 8, lineHeight: 1.5 }}>{group.desc}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {group.states.map((st) => (
                    <div key={st.name} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
                      background: `${st.color}18`, borderRadius: 5, border: `1px solid ${st.color}33`,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.color }} />
                      <span style={{ fontSize: 11, color: st.color, fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>{st.name}</span>
                      {st.desc && <span style={{ fontSize: 10, color: BRAND.textDim, fontFamily: "'Outfit', sans-serif" }}>— {st.desc}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${BRAND.surfaceBorder}`, paddingTop: 14, marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.text, fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>Dashboard Notes</div>
              <ul style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: "'Outfit', sans-serif", lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                <li><strong>Active</strong> = any issue NOT in a closed status (Done, Merged, Cancelled, Parking Lot, Roadmap)</li>
                <li><strong>Queue labels</strong> (Guidance, Support, COE, Admin, Sorting Hat) determine which queue an issue belongs to. Unqueued = Triage.</li>
                <li><strong>Department labels</strong> categorize by team area. Issues with multiple departments are counted in each.</li>
                <li><strong>All-Time Queue History</strong> uses Linear's issue history API to find every issue that ever had a queue label, even if later removed.</li>
                <li>Data refreshes automatically from the Linear API. Only the <strong>Digital Guidance</strong> team is included.</li>
              </ul>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "28px 0 12px", fontSize: 10, color: BRAND.textDim }}>
          Furniture Bank · Managed Success · Powered by Linear + Claude
        </div>
      </div>
    </div>
  );
}
