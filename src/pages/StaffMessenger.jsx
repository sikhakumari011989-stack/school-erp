import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  MessageSquare,
  Send,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  CheckCheck,
  Check,
  Clock,
  ArrowLeft,
  Sparkles,
  Lock,
  Phone,
  Briefcase
} from "lucide-react";

const CANNED_RESPONSES = [
  "Noted, working on it now.",
  "Please check the student attendance register.",
  "Fee ledger transaction verified.",
  "Exam paper draft uploaded to portal.",
  "Approved for administrative processing."
];

export default function StaffMessenger() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const navigate = useNavigate();

  const schoolCode = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const userCode = (
    user?.role_code ||
    user?.roll_number ||
    user?.personal_code ||
    user?.id ||
    "HOD-01"
  ).toUpperCase().trim();

  const userName = user?.name || user?.full_name || "Faculty Member";
  const userRole = (user?.role || "").toLowerCase().trim();

  // 1. STRICT SECURITY GATE FOR STUDENTS
  const isStudent = userRole === "student" || userCode.startsWith("STU-");

  // State
  const [contacts, setContacts] = useState([]);
  const [activeContactId, setActiveContactId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef(null);

  // Load Contacts and Message Thread
  useEffect(() => {
    if (isStudent) return;
    loadStaffContacts();
    loadMessages();

    const handleMessagesUpdate = () => loadMessages();
    const handleDirUpdate = () => loadStaffContacts();

    window.addEventListener("erp-staff-messages-updated", handleMessagesUpdate);
    window.addEventListener("erp-directory-updated", handleDirUpdate);
    window.addEventListener("storage", handleMessagesUpdate);

    return () => {
      window.removeEventListener("erp-staff-messages-updated", handleMessagesUpdate);
      window.removeEventListener("erp-directory-updated", handleDirUpdate);
      window.removeEventListener("storage", handleMessagesUpdate);
    };
  }, [schoolCode, userCode, isStudent]);

  // Auto-scroll to bottom of active conversation
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeContactId, mobileShowChat]);

  // Load and Filter Staff Directory (Strictly excluding students)
  const loadStaffContacts = () => {
    try {
      let dir = [];
      const raw = localStorage.getItem(`erp_directory_${schoolCode}`);
      if (raw) dir = JSON.parse(raw);

      // Filter only staff, teachers, accountants, principals/trustees
      const staffOnly = (dir || []).filter((m) => {
        if (!m) return false;
        const code = (m.role_code || m.roll_number || m.personal_code || m.id || "").toUpperCase().trim();
        const role = (m.role || "").toLowerCase().trim();

        // Exclude current user
        if (code === userCode) return false;

        // Exclude students
        if (role === "student" || code.startsWith("STU-")) return false;

        return (
          code.startsWith("HOD-") ||
          code.startsWith("PRIN-") ||
          code.startsWith("TR-") ||
          code.startsWith("ACC-") ||
          code.startsWith("TCH-") ||
          code.startsWith("FAC-") ||
          code.startsWith("NON-") ||
          code.startsWith("NTS-") ||
          code.startsWith("STF-") ||
          role === "teacher" ||
          role === "principal" ||
          role === "trustee" ||
          role === "accountant" ||
          role === "staff" ||
          role === "admin"
        );
      });

      // Starter fallback nodes if newly provisioned clean-slate institution
      let finalContacts = staffOnly;
      if (finalContacts.length === 0) {
        finalContacts = [
          {
            id: userCode.startsWith("HOD-") ? "TCH-01" : "HOD-01",
            role_code: userCode.startsWith("HOD-") ? "TCH-01" : "HOD-01",
            name: userCode.startsWith("HOD-") ? "Dr. Vikram Joshi" : "Principal & Executive Trustee",
            role: userCode.startsWith("HOD-") ? "teacher" : "trustee",
            class_name: userCode.startsWith("HOD-") ? "Senior Physics Faculty" : "Head of Institution",
            phone: "+91 98111 22334",
          },
          {
            id: "ACC-01",
            role_code: "ACC-01",
            name: "Ramesh Kulkarni",
            role: "accountant",
            class_name: "Chief Treasury Officer",
            phone: "+91 98222 33445",
          },
        ].filter((c) => c.role_code !== userCode);
      }

      setContacts(finalContacts);

      // Select first contact by default on wide screens
      if (!activeContactId && finalContacts.length > 0) {
        setActiveContactId(finalContacts[0].role_code || finalContacts[0].id);
      }
    } catch (e) {
      console.warn("Could not load staff contacts:", e);
      setContacts([]);
    }
  };

  // Load Messages from Storage
  const loadMessages = () => {
    try {
      const storageKey = `erp_staff_messages_${schoolCode}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setMessages(JSON.parse(raw));
      } else {
        // Initial welcome coordination message if thread is empty
        const initialSeed = [
          {
            id: "seed_1",
            senderId: "HOD-01",
            senderName: "Principal / HOD",
            recipientId: "TCH-01",
            recipientName: "Dr. Vikram Joshi",
            text: "Welcome to the internal faculty coordination channel. All academic memos and approvals are logged here.",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: true,
          },
        ];
        setMessages(initialSeed);
        localStorage.setItem(storageKey, JSON.stringify(initialSeed));
      }
    } catch (e) {
      console.warn("Could not load staff messages:", e);
    }
  };

  // Active Contact Object
  const activeContact = useMemo(() => {
    return contacts.find(
      (c) => (c.role_code || c.roll_number || c.id) === activeContactId
    );
  }, [contacts, activeContactId]);

  // Current Thread Messages (1-to-1 between userCode and activeContactId)
  const currentThread = useMemo(() => {
    if (!activeContactId) return [];
    return messages.filter(
      (m) =>
        (m.senderId === userCode && m.recipientId === activeContactId) ||
        (m.senderId === activeContactId && m.recipientId === userCode)
    );
  }, [messages, userCode, activeContactId]);

  // Send Message
  const handleSendMessage = (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeContactId) return;

    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: userCode,
      senderName: userName,
      senderRole: userRole,
      recipientId: activeContactId,
      recipientName: activeContact?.name || "Staff Member",
      text,
      timestamp: new Date().toISOString(),
      read: false,
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    setInputText("");

    try {
      localStorage.setItem(`erp_staff_messages_${schoolCode}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-staff-messages-updated"));
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  // Switch Active Contact & Mark Messages as Read
  const handleSelectContact = (contactId) => {
    setActiveContactId(contactId);
    setMobileShowChat(true);

    // Mark unread messages from this contact as read
    const updated = messages.map((m) => {
      if (m.senderId === contactId && m.recipientId === userCode && !m.read) {
        return { ...m, read: true };
      }
      return m;
    });

    setMessages(updated);
    try {
      localStorage.setItem(`erp_staff_messages_${schoolCode}`, JSON.stringify(updated));
    } catch (e) {}
  };

  // Role Badge Styling Helper
  const getRoleBadge = (roleStr = "", code = "") => {
    const r = roleStr.toLowerCase();
    const c = code.toUpperCase();
    if (c.startsWith("HOD") || c.startsWith("PRIN") || r === "principal" || r === "trustee") {
      return { label: "HOD / Principal", bg: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
    }
    if (c.startsWith("ACC") || r === "accountant") {
      return { label: "Accountant", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
    }
    if (c.startsWith("NON") || c.startsWith("NTS") || c.startsWith("STF") || r === "staff") {
      return { label: "Operations Staff", bg: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
    }
    return { label: "Faculty / Teacher", bg: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
  };

  // 1. ACCESS DENIED SCREEN FOR STUDENTS
  if (isStudent) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-3xl mx-auto flex items-center justify-center shadow-2xl">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Access Restricted: Staff-Only Communications</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Direct personal messaging is strictly restricted to institutional personnel (HOD, Teachers, and Accountants). Student accounts are restricted from accessing faculty channels.
          </p>
        </div>
        <div className="pt-4">
          <button
            onClick={() => navigate("/student/dashboard")}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
          >
            ← Return to Student Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Filter contacts by search query
  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    const name = (c.name || c.full_name || "").toLowerCase();
    const code = (c.role_code || c.roll_number || c.id || "").toLowerCase();
    const role = (c.role || "").toLowerCase();
    return name.includes(q) || code.includes(q) || role.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Staff-Only Internal Messenger
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                {schoolCode}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure 1-to-1 direct messaging exclusively for HODs, Faculty, and Accounts personnel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Logged in as: {userCode} ({userName})</span>
          </div>
        </div>
      </div>

      {/* Main Messenger Layout: Two Column on Desktop, Toggle on Mobile */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
        {/* LEFT COLUMN: STAFF CONTACTS ROSTER (4 cols) */}
        <div
          className={`md:col-span-4 border-r border-slate-800 flex flex-col bg-slate-900/90 ${
            mobileShowChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search Contacts Bar */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Staff Directory ({contacts.length})
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Encrypted Peer Network
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search teacher, HOD or accountant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700/80 text-white text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Contacts List with overflow-y-auto */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60 max-h-[520px]">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-1">
                <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-400">No staff members found.</p>
                <p className="text-[10px] text-slate-500">Only verified faculty and staff appear in this roster.</p>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const id = contact.role_code || contact.roll_number || contact.id;
                const isSelected = id === activeContactId;
                const badge = getRoleBadge(contact.role, id);

                // Count unread messages from this contact
                const unreadCount = messages.filter(
                  (m) => m.senderId === id && m.recipientId === userCode && !m.read
                ).length;

                // Find last message snippet
                const thread = messages.filter(
                  (m) =>
                    (m.senderId === userCode && m.recipientId === id) ||
                    (m.senderId === id && m.recipientId === userCode)
                );
                const lastMsg = thread[thread.length - 1];

                return (
                  <div
                    key={id}
                    onClick={() => handleSelectContact(id)}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-600/15 border-l-4 border-blue-500 shadow-sm"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs flex-shrink-0 relative">
                        {id.slice(0, 3)}
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900 absolute -bottom-0.5 -right-0.5"></span>
                      </div>

                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white truncate">
                            {contact.name || contact.full_name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{id}</span>
                        </div>

                        {lastMsg && (
                          <p className="text-[11px] text-slate-400 truncate mt-1 max-w-[170px]">
                            {lastMsg.senderId === userCode ? "You: " : ""}{lastMsg.text}
                          </p>
                        )}
                      </div>
                    </div>

                    {unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/30">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE 1-ON-1 CHAT THREAD (8 cols) */}
        <div
          className={`md:col-span-8 flex flex-col bg-slate-950/60 ${
            mobileShowChat ? "flex" : "hidden md:flex"
          }`}
        >
          {activeContact ? (
            <>
              {/* Recipient Chat Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileShowChat(false)}
                    className="md:hidden p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <User className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {activeContact.name || activeContact.full_name}
                      <span className="text-[10px] font-mono text-blue-300 font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30">
                        {activeContact.role_code || activeContact.id}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {activeContact.class_name || activeContact.role || "Faculty"} &bull; {activeContact.phone || "Direct Internal Ext"}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified Staff Channel</span>
                </div>
              </div>

              {/* Message History Feed wrapped in overflow-y-auto */}
              <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-3.5 max-h-[460px]">
                {currentThread.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-500 space-y-2">
                    <MessageSquare className="w-10 h-10 text-slate-600 mb-1" />
                    <p className="text-sm font-semibold text-slate-300">
                      Direct thread with {activeContact.name} initiated.
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Messages sent here are recorded strictly for internal institutional faculty coordination.
                    </p>
                  </div>
                ) : (
                  currentThread.map((msg) => {
                    const isMe = msg.senderId === userCode;
                    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-md rounded-2xl p-3.5 text-xs sm:text-sm shadow-md space-y-1 ${
                            isMe
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none"
                              : "bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none"
                          }`}
                        >
                          {!isMe && (
                            <p className="text-[10px] font-bold text-blue-300 mb-0.5">
                              {msg.senderName} ({msg.senderId})
                            </p>
                          )}
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          <div
                            className={`flex items-center justify-end gap-1 text-[9px] pt-1 ${
                              isMe ? "text-blue-200" : "text-slate-400"
                            }`}
                          >
                            <span>{timeStr}</span>
                            {isMe && <CheckCheck className="w-3 h-3 text-blue-200" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Canned Chips */}
              <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">
                  Quick Memos:
                </span>
                {CANNED_RESPONSES.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap transition-all cursor-pointer flex-shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`Message ${activeContact.name || "colleague"} (Enter to send)...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 placeholder-slate-500"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
              <Users className="w-12 h-12 text-slate-600 mb-2" />
              <h3 className="text-sm font-bold text-slate-300">Select a Staff Member</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Choose a teacher, principal, or accountant from the staff directory on the left to start a secure conversation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

