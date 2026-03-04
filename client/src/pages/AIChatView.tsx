import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { getChatCompletion, getChatHistory } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Stethoscope, Send, Clock, MessageSquare, ExternalLink } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: number | string;
  userMessage?: string;
  aiResponse?: string;
  timestamp: Date | string;
}

// Split a stored aiResponse into body text + citations array
function parseResponse(raw: string): { body: string; citations: string[] } {
  const marker = "\n\n📚 Sources:\n";
  const idx = raw.indexOf(marker);
  if (idx === -1) return { body: raw, citations: [] };
  const body = raw.slice(0, idx);
  const citations = raw
    .slice(idx + marker.length)
    .split("\n")
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
  return { body, citations };
}

// ── Suggested questions ───────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What does eGFR below 30 mean?",
  "Potassium limits for CKD stage 4",
  "Side effects of tacrolimus",
  "How often should I check creatinine?",
  "Signs of kidney transplant rejection",
  "Blood pressure targets for CKD",
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function AIChatView() {
  const { user } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"chat" | "history">("chat");
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load history
  useEffect(() => {
    if (!user?.id) return;
    getChatHistory(user.id, 50)
      .then((h) => setChatHistory([...h].reverse()))
      .catch(() =>
        toast({ title: "Could not load history", variant: "destructive" })
      );
  }, [user, toast]);

  // Auto-scroll
  useEffect(() => {
    if (view === "chat") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isTyping, view]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? message).trim();
    if (!msg || !user?.id) return;
    setMessage("");
    const tempId = `temp-${Date.now()}`;
    setChatHistory((prev) => [...prev, { id: tempId, userMessage: msg, timestamp: new Date() }]);
    setIsTyping(true);
    try {
      const res = await getChatCompletion(user.id, msg);
      setChatHistory((prev) =>
        prev.map((c) => (c.id === tempId ? { ...c, ...res.chat } : c))
      );
    } catch {
      toast({ title: "Could not reach AI. Try again.", variant: "destructive" });
      setChatHistory((prev) => prev.filter((c) => c.id !== tempId));
    } finally {
      setIsTyping(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  function CitationList({ citations }: { citations: string[] }) {
    if (!citations.length) return null;
    return (
      <div className="mt-2 pt-2 border-t border-neutral-200">
        <p className="text-xs font-medium text-neutral-500 mb-1 flex items-center gap-1">
          <ExternalLink className="h-3 w-3" /> Sources
        </p>
        <ul className="space-y-0.5">
          {citations.map((c, i) => {
            const isUrl = c.startsWith("http");
            return (
              <li key={i} className="text-xs text-blue-600">
                {isUrl ? (
                  <a href={c} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                    {i + 1}. {c}
                  </a>
                ) : (
                  <span className="text-neutral-500">{i + 1}. {c}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  function cleanMarkdown(text: string): string {
    return text
      .replace(/^#{1,6}\s+/gm, "")       // Remove ## headers
      .replace(/\*\*(.+?)\*\*/g, "$1")   // Remove **bold**
      .replace(/\*(.+?)\*/g, "$1")       // Remove *italic*
      .replace(/`(.+?)`/g, "$1")         // Remove `code`
      .trim();
  }

  function AIBubble({ raw }: { raw: string }) {
    const { body, citations } = parseResponse(raw);
    return (
      <div className="bg-neutral-100 rounded-lg p-3 max-w-[92%] sm:max-w-[80%]">
        <p className="text-sm whitespace-pre-wrap break-words">{cleanMarkdown(body)}</p>
        <CitationList citations={citations} />
      </div>
    );
  }

  // ── Chat view ──────────────────────────────────────────────────────────────
  const chatMessages = chatHistory.filter((c) => c.userMessage || c.aiResponse);

  // ── History view ───────────────────────────────────────────────────────────
  function HistoryView() {
    const pairs = chatHistory.filter((c) => c.userMessage && c.aiResponse);
    if (!pairs.length)
      return <p className="text-sm text-neutral-400 text-center py-12">No past conversations yet.</p>;

    return (
      <div className="space-y-4 px-4 pt-4 pb-24">
        {[...pairs].reverse().map((c) => {
          const { body, citations } = parseResponse(c.aiResponse!);
          const date = new Date(c.timestamp);
          return (
            <div key={c.id} className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-neutral-400 mb-2">
                {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-sm font-medium text-primary mb-2">Q: {c.userMessage}</p>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">{cleanMarkdown(body)}</p>
              <CitationList citations={citations} />
            </div>
          );
        })}
      </div>
    );
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-3 fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={() => setLocation("/")} className="text-neutral-500">
              <span className="material-icons">arrow_back</span>
            </Button>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display font-semibold leading-tight">Kidney Health Q&amp;A</h2>
                <p className="text-xs text-neutral-400">Evidence-based · cited sources</p>
              </div>
            </div>
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setView("chat")}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${view === "chat" ? "bg-white shadow-sm text-primary font-medium" : "text-neutral-500"}`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Chat
            </button>
            <button
              type="button"
              onClick={() => setView("history")}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${view === "history" ? "bg-white shadow-sm text-primary font-medium" : "text-neutral-500"}`}
            >
              <Clock className="h-3.5 w-3.5" /> History
            </button>
          </div>
        </div>

        {/* Disclaimer banner */}
        <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 flex items-start gap-2">
          <span className="material-icons text-blue-400 text-sm mt-0.5">info</span>
          <p className="text-xs text-blue-600">
            For clinical kidney health questions only. For emotional support &amp; journaling, use the{" "}
            <button type="button" className="underline font-medium" onClick={() => setLocation("/journal")}>Journal tab</button>.
          </p>
        </div>
      </div>

      {/* Body */}
      {view === "history" ? (
        <div className="pt-32 pb-20">
          <HistoryView />
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto px-4 pb-4 pt-32 mb-36">
          {/* Welcome */}
          {chatMessages.length === 0 && (
            <div className="flex mb-4">
              <div className="bg-primary/10 rounded-full p-2 self-start mr-2 shrink-0">
                <Stethoscope className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-neutral-100 rounded-lg p-3 max-w-[92%] sm:max-w-[80%]">
                <p className="text-sm font-medium mb-1">Hi {user?.firstName || "there"} — ask me anything about kidney health.</p>
                <p className="text-xs text-neutral-500">I pull from current medical literature and include source links in my answers. I'm not a substitute for your care team.</p>
              </div>
            </div>
          )}

          {/* Messages */}
          {chatMessages.map((c, i) => (
            <div key={c.id ?? i}>
              {c.userMessage && (
                <div className="flex justify-end mb-3">
                  <div className="bg-primary text-white rounded-lg p-3 max-w-[92%] sm:max-w-[80%]">
                    <p className="text-sm">{c.userMessage}</p>
                  </div>
                </div>
              )}
              {c.aiResponse && (
                <div className="flex mb-3">
                  <div className="bg-primary/10 rounded-full p-2 self-start mr-2 shrink-0">
                    <Stethoscope className="h-4 w-4 text-primary" />
                  </div>
                  <AIBubble raw={c.aiResponse} />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex mb-3">
              <div className="bg-primary/10 rounded-full p-2 self-start mr-2 shrink-0">
                <Stethoscope className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-neutral-100 rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input bar — only in chat view */}
      {view === "chat" && (
        <div className="bg-white border-t border-neutral-200 p-3 fixed bottom-16 left-0 right-0 z-10">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2 mb-2"
          >
            <Input
              placeholder="Ask a kidney health question…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isTyping}
              className="text-sm"
            />
            <Button type="submit" size="icon" disabled={!message.trim() || isTyping}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSend(s)}
                disabled={isTyping}
                className="text-xs bg-neutral-100 hover:bg-primary/10 hover:text-primary text-neutral-600 rounded-full px-3 py-1 whitespace-nowrap transition-colors shrink-0"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}
