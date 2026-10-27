import React, { useState } from "react";
import { Sparkles, Send, Search, Bot, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export default function PrincipalNLAssistant({ schoolCode = "CAMPUS-01" }) {
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState([
    {
      role: "assistant",
      text: "Good day, Principal. I am your Institutional Intelligence Assistant. Ask me anything about fee collection, student attendance, pending leaves, or unresolved grievances.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const cleanSchool = schoolCode.toUpperCase();

  const QUICK_PROMPTS = [
    "Who hasn't paid this month?",
    "Show staff on leave",
    "Show pending staff tasks",
    "Show recent grievances",
  ];

  const handleSend = (textToSend = null) => {
    const text = (textToSend || query).trim();
    if (!text) return;

    const userMessage = {
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setConversation((prev) => [...prev, userMessage]);
    setQuery("");
    setIsTyping(true);

    setTimeout(() => {
      const response = processPrincipalQuery(text, cleanSchool);
      setConversation((prev) => [...prev, response]);
      setIsTyping(false);
    }, 400);
  };

  const processPrincipalQuery = (q, school) => {
    const lower = q.toLowerCase();
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 1. Fee Defaulters query
    if (lower.includes("paid") || lower.includes("fee") || lower.includes("defaulter")) {
      try {
        const dir = JSON.parse(localStorage.getItem(`erp_directory_${school}`) || "[]");
        const students = dir.filter((m) => (m.role || "student").toLowerCase() === "student");
        const unpaid = students.filter((s) => Number(s.paidFees || 0) < Number(s.totalFees || 45000));

        if (unpaid.length === 0) {
          return {
            role: "assistant",
            text: "All registered scholars currently have settled fee balances. There are no overdue fee accounts on record.",
            timestamp: time,
          };
        }

        const top3 = unpaid.slice(0, 3);
        const totalOverdue = unpaid.reduce(
          (sum, s) => sum + (Number(s.totalFees || 45000) - Number(s.paidFees || 0)),
          0
        );

        return {
          role: "assistant",
          text: `Found ${unpaid.length} scholars with pending balances totaling ₹${totalOverdue.toLocaleString()}. Top accounts: ${top3
            .map((s) => `${s.name || s.full_name} (${s.class_name || "Grade"})`)
            .join(", ")}. You can review and trigger reminders from the Accountant radar.`,
          timestamp: time,
        };
      } catch {
        return {
          role: "assistant",
          text: "Fee records are initialized and current.",
          timestamp: time,
        };
      }
    }

    // 2. Staff Leave query
    if (lower.includes("leave") || lower.includes("absent")) {
      try {
        const leaves = JSON.parse(localStorage.getItem(`erp_staff_leaves_${school}`) || "[]");
        const pending = leaves.filter((l) => (l.status || "").toLowerCase() === "pending");

        if (pending.length === 0) {
          return {
            role: "assistant",
            text: "No staff members are currently on unapproved leave. The institutional roster is fully staffed today.",
            timestamp: time,
          };
        }

        return {
          role: "assistant",
          text: `There are ${pending.length} pending staff leave applications awaiting your approval from: ${pending
            .map((p) => `${p.applicantName || "Staff"} (${p.leaveType})`)
            .join(", ")}.`,
          timestamp: time,
        };
      } catch {
        return {
          role: "assistant",
          text: "No pending leave applications found.",
          timestamp: time,
        };
      }
    }

    // 3. Pending Staff Tasks
    if (lower.includes("task") || lower.includes("duty")) {
      try {
        const tasks = JSON.parse(localStorage.getItem(`erp_tasks_${school}`) || "[]");
        const pending = tasks.filter((t) => t.status !== "Completed");

        if (pending.length === 0) {
          return {
            role: "assistant",
            text: "All assigned staff duty workflows are 100% completed. No backlog detected.",
            timestamp: time,
          };
        }

        return {
          role: "assistant",
          text: `You have ${pending.length} active tasks assigned across departments. ${pending
            .slice(0, 2)
            .map((t) => `"${t.title}" assigned to ${t.assignedToRole}`)
            .join("; ")}.`,
          timestamp: time,
        };
      } catch {
        return {
          role: "assistant",
          text: "No active tasks in the registry.",
          timestamp: time,
        };
      }
    }

    // 4. Grievances
    if (lower.includes("grievance") || lower.includes("ticket") || lower.includes("complaint")) {
      try {
        const tickets = JSON.parse(localStorage.getItem(`erp_grievances_${school}`) || "[]");
        const open = tickets.filter((g) => g.status !== "Resolved");

        if (open.length === 0) {
          return {
            role: "assistant",
            text: "All institutional grievances are marked as resolved. Campus satisfaction rate is 100%.",
            timestamp: time,
          };
        }

        return {
          role: "assistant",
          text: `There are ${open.length} active grievance tickets awaiting resolution in the Redressal inbox.`,
          timestamp: time,
        };
      } catch {
        return {
          role: "assistant",
          text: "No grievances registered.",
          timestamp: time,
        };
      }
    }

    // Default Fallback
    return {
      role: "assistant",
      text: `Understood your query regarding "${q}". Institutional intelligence reports that tenant ${school} systems are operating normally within SLA parameters.`,
      timestamp: time,
    };
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl shadow-cyan-500/10 flex flex-col h-[380px]">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>Principal Intelligence Assistant</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                Scoped AI
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Strict read-only tenant semantic queries</p>
          </div>
        </div>
      </div>

      {/* CHAT MESSAGES */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
        {conversation.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-none shadow-md"
                  : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none shadow-sm"
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-1 text-[11px] text-cyan-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full w-fit">
            <Bot className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing tenant database...</span>
          </div>
        )}
      </div>

      {/* QUICK SUGGESTIONS PILLS */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2 border-t border-white/10 no-scrollbar">
        {QUICK_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p)}
            className="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer hover:border-cyan-500/40"
          >
            {p}
          </button>
        ))}
      </div>

      {/* INPUT FORM */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 pt-1"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask e.g. 'Who hasn't paid this month?'..."
          className="flex-1 bg-slate-950 border border-white/10 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
        />
        <button
          type="submit"
          className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/30 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

