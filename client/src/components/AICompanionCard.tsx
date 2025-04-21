import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { getChatCompletion } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";

export function AICompanionCard() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState({
    message: "I notice your stress levels have been higher this week. This can affect your blood pressure. Would you like some simple relaxation techniques?",
    timestamp: "20m ago"
  });
  
  const handleAcceptSuggestion = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await getChatCompletion(
        user.id,
        "Yes, I would like some simple relaxation techniques to help with my stress levels."
      );
      
      // Redirect to chat view with the response
      window.location.href = "/chat";
    } catch (error) {
      console.error("Error getting AI response:", error);
      toast({
        title: "Communication Error",
        description: "Could not connect to AI assistant. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-primary bg-opacity-10 rounded-full p-2">
          <span className="material-icons text-primary">smart_toy</span>
        </div>
        <div>
          <h3 className="font-display font-semibold">AI Companion</h3>
          <p className="text-xs text-neutral-500">Your personal health advocate</p>
        </div>
      </div>
      
      <div className="bg-neutral-100 rounded-lg p-3 mb-3">
        <p className="text-sm">{suggestion.message}</p>
        <div className="flex justify-end mt-2 text-xs text-neutral-500">
          <span>AI Companion • {suggestion.timestamp}</span>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <Button 
          className="flex-1" 
          onClick={handleAcceptSuggestion}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Yes, please"}
        </Button>
        <Button 
          variant="secondary" 
          className="flex-1"
        >
          Not now
        </Button>
      </div>
      
      <Link href="/chat">
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 text-primary border-primary"
        >
          <span className="material-icons text-sm">chat</span>
          Start new conversation
        </Button>
      </Link>
    </div>
  );
}

export default AICompanionCard;
