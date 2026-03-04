import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getChatCompletion } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Stethoscope, ArrowRight, History } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "What does a creatinine of 2.4 mean?",
  "Foods to avoid with stage 3 CKD",
  "How does dialysis affect blood pressure?",
  "What is eGFR and why does it matter?",
];

export function AICompanionCard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (q?: string) => {
    const text = (q ?? question).trim();
    if (!text) return;

    if (!user?.id) {
      toast({ title: "Please log in", variant: "destructive" });
      setLocation("/auth");
      return;
    }

    setIsLoading(true);
    try {
      await getChatCompletion(user.id, text);
      setLocation("/chat");
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not reach AI",
        description: "Please try again or open the full chat.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-full p-2">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold leading-tight">Kidney Health Q&amp;A</h3>
            <p className="text-xs text-neutral-500">Clinical questions · evidence-based answers</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-primary flex items-center gap-1"
          onClick={() => setLocation("/chat")}
        >
          <History className="h-3.5 w-3.5" />
          History
        </Button>
      </div>

      {/* Distinction note */}
      <p className="text-xs text-neutral-400 mb-3 pl-1">
        For medications, labs, diet &amp; symptoms. Emotional support →{" "}
        <button
          className="underline text-neutral-500 hover:text-primary"
          onClick={() => setLocation("/journal")}
        >
          Journal
        </button>
      </p>

      {/* Question input */}
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Ask a kidney health question…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          className="text-sm"
          disabled={isLoading}
        />
        <Button
          type="button"
          onClick={() => handleAsk()}
          disabled={isLoading || !question.trim()}
          size="sm"
          className="shrink-0"
        >
          {isLoading ? "…" : <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* Suggested questions */}
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleAsk(q)}
            disabled={isLoading}
            className="text-xs bg-neutral-100 hover:bg-primary/10 hover:text-primary text-neutral-600 rounded-full px-3 py-1 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AICompanionCard;
