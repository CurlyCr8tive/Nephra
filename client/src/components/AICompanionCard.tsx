import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { getChatCompletion } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function AICompanionCard() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState({
    message: "I notice your stress levels have been higher this week. This can affect your blood pressure. Would you like some simple relaxation techniques?",
    timestamp: "20m ago"
  });
  
  const handleAcceptSuggestion = async () => {
    // Don't proceed if there's no user
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to use the AI assistant.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // The chatQuery that will be used in the chat tab - this is the specific request
      // that will trigger our special relaxation techniques prompt
      const chatQuery = "Yes, I would like some simple relaxation techniques to help with my stress levels.";
      
      // Store the query in localStorage to be used in the chat tab
      // This is the key integration point that connects the card to the Journal page
      localStorage.setItem('nephraInitialQuery', chatQuery);
      
      try {
        // Only fire this request if we're sure we have a valid user
        if (user && user.id) {
          console.log("Starting pre-cache request for relaxation techniques");
          
          const response = await getChatCompletion(
            user.id,
            chatQuery
          );
          
          if (response && response.message) {
            console.log("✅ Successfully pre-cached AI response:", response.message.substring(0, 50) + "...");
            
            // Store the response directly in localStorage for instant display in the chat
            localStorage.setItem('nephraLastResponse', JSON.stringify({
              userMessage: chatQuery,
              aiResponse: response.message,
              timestamp: new Date().toISOString()
            }));
            
            // Show success toast
            toast({
              title: "Relaxation techniques ready",
              description: "Opening chat with your personalized techniques",
            });
          } else {
            // Handle unexpected response format
            console.warn("AI response format unexpected:", response);
            toast({
              title: "Opening chat assistant",
              description: "Your request will be processed in the chat.",
            });
          }
        }
      } catch (preloadErr) {
        console.error("Failed to pre-cache AI response:", preloadErr);
        toast({
          title: "Opening chat assistant",
          description: "Your request will be processed in the chat.",
        });
      }
      
      // Check if user is still logged in before redirecting
      if (user && user.id) {
        // Redirect to chat page (more direct than journal page with tab param)
        setLocation("/chat");
      } else {
        toast({
          title: "Session expired",
          description: "Please log in again to continue",
          variant: "destructive"
        });
        setLocation("/auth");
      }
    } catch (error) {
      console.error("Error preparing AI assistant:", error);
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
      
      <Button 
        variant="outline" 
        className="w-full flex items-center justify-center gap-2 text-primary border-primary"
        onClick={() => {
          // Check if user is logged in before redirecting
          if (user && user.id) {
            setLocation("/journal?tab=chat");
          } else {
            toast({
              title: "Not logged in",
              description: "Please log in to chat with your AI assistant",
              variant: "destructive"
            });
            setLocation("/auth");
          }
        }}
      >
        <span className="material-icons text-sm">chat</span>
        Start new conversation
      </Button>
    </div>
  );
}

export default AICompanionCard;
