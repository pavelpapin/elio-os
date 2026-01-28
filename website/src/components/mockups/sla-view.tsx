"use client";

const agents = [
  { name: "Omar H.", firstResponse: "12m", followUp: "2.1h", missed: 0, compliance: 96, status: "green" },
  { name: "Lina K.", firstResponse: "8m", followUp: "1.4h", missed: 1, compliance: 91, status: "green" },
  { name: "Rashid A.", firstResponse: "45m", followUp: "6.2h", missed: 4, compliance: 62, status: "red" },
  { name: "Diana S.", firstResponse: "18m", followUp: "3.0h", missed: 2, compliance: 78, status: "yellow" },
];

function ComplianceBar({ value }: { value: number }) {
  const color = value >= 85 ? "bg-emerald-400" : value >= 70 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] font-mono text-white/40 w-8 text-right">{value}%</span>
    </div>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const color = status === "green" ? "bg-emerald-400" : status === "yellow" ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function SLABadge({ value, unit, warning }: { value: string; unit: string; warning?: boolean }) {
  return (
    <span className={`text-[12px] font-mono ${warning ? "text-red-400" : "text-white/50"}`}>
      {value}<span className="text-white/20 text-[10px] ml-0.5">{unit}</span>
    </span>
  );
}

export function SLAViewMockup() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0C0D0F] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400/80" />
          <span className="text-[13px] font-medium text-white/70">Quality & SLA</span>
          <span className="text-[11px] text-white/20 ml-1">This week</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-px bg-white/[0.04] border-b border-white/[0.06]">
        {[
          { label: "Avg first response", value: "21m", target: "< 30m", ok: true },
          { label: "Avg follow-up", value: "3.2h", target: "< 4h", ok: true },
          { label: "Missed follow-ups", value: "7", target: "0", ok: false },
          { label: "Script compliance", value: "82%", target: "> 90%", ok: false },
        ].map((m, i) => (
          <div key={i} className="bg-[#0C0D0F] p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/20 mb-2">{m.label}</p>
            <p className={`text-[20px] font-medium tracking-tight ${m.ok ? "text-white/70" : "text-red-400"}`}>{m.value}</p>
            <p className="text-[10px] text-white/15 mt-1">Target: {m.target}</p>
          </div>
        ))}
      </div>

      {/* Agent table */}
      <div className="grid grid-cols-[30px_1fr_70px_70px_50px_1fr] gap-2 px-5 py-2 text-[10px] uppercase tracking-wider text-white/20 border-b border-white/[0.04]">
        <span></span>
        <span>Agent</span>
        <span>1st resp</span>
        <span>Follow-up</span>
        <span>Missed</span>
        <span>Compliance</span>
      </div>

      {agents.map((agent, i) => (
        <div key={i} className="grid grid-cols-[30px_1fr_70px_70px_50px_1fr] gap-2 px-5 py-3 border-b border-white/[0.03] items-center">
          <StatusIndicator status={agent.status} />
          <span className="text-[13px] text-white/70 font-medium">{agent.name}</span>
          <SLABadge value={agent.firstResponse} unit="" warning={parseInt(agent.firstResponse) > 30} />
          <SLABadge value={agent.followUp} unit="" warning={parseFloat(agent.followUp) > 4} />
          <span className={`text-[12px] font-mono ${agent.missed > 2 ? "text-red-400" : "text-white/40"}`}>{agent.missed}</span>
          <ComplianceBar value={agent.compliance} />
        </div>
      ))}
    </div>
  );
}
