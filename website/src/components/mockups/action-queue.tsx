"use client";

const actions = [
  { deal: "Marina Vista 3BR", action: "Send counter-offer response", priority: "urgent", type: "negotiate", due: "Now", escalate: true },
  { deal: "JBR Penthouse", action: "Confirm viewing location with buyer", priority: "high", type: "schedule", due: "2h", escalate: false },
  { deal: "Palm Duplex", action: "Follow up on MOU review", priority: "high", type: "document", due: "Today", escalate: false },
  { deal: "Downtown 1BR", action: "Re-engage with property alternatives", priority: "medium", type: "recover", due: "Today", escalate: true },
  { deal: "Creek Tower 2BR", action: "Send payment plan options", priority: "medium", type: "info", due: "Tomorrow", escalate: false },
];

const weekPlan = [
  { day: "Mon", count: 8, done: 8 },
  { day: "Tue", count: 6, done: 6 },
  { day: "Wed", count: 5, done: 3 },
  { day: "Thu", count: 7, done: 0 },
  { day: "Fri", count: 4, done: 0 },
];

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    urgent: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${styles[priority]}`}>
      {priority}
    </span>
  );
}

function ActionIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    negotiate: <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
    schedule: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    document: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
    recover: <><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></>,
    info: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
  };
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
      {icons[type]}
    </svg>
  );
}

export function ActionQueueMockup() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0C0D0F] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400/80" />
          <span className="text-[13px] font-medium text-white/70">Action Queue</span>
          <span className="text-[11px] text-white/20 ml-1">5 pending</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded">2 escalations</span>
        </div>
      </div>

      {/* Week overview */}
      <div className="flex gap-1 px-5 py-3 border-b border-white/[0.06] bg-white/[0.01]">
        {weekPlan.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <p className="text-[9px] uppercase tracking-wider text-white/20 mb-1.5">{d.day}</p>
            <div className="h-8 bg-white/[0.04] rounded relative overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 bg-emerald-400/30 transition-all"
                style={{ height: `${(d.done / d.count) * 100}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/40">
                {d.done}/{d.count}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action list */}
      {actions.map((item, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
          <ActionIcon type={item.type} />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-white/60 leading-tight truncate">{item.action}</p>
            <p className="text-[10px] text-white/20 mt-0.5">{item.deal}</p>
          </div>
          <PriorityBadge priority={item.priority} />
          <span className="text-[11px] text-white/30 w-16 text-right">{item.due}</span>
          {item.escalate && (
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
}
