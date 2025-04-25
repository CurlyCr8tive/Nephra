import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { getChatCompletion, getChatHistory } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";

export default function AIChatView() {
  const { user } = useUser();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load chat history on component mount
  useEffect(() => {
    if (user) {
      getChatHistory(user.id, 10)
        .then(history => {
          setChatHistory(history.reverse());
        })
        .catch(error => {
          console.error("Error fetching chat history:", error);
          toast({
            title: "Error loading chat history",
            description: "Could not load your previous conversations.",
            variant: "destructive"
          });
        });
    }
  }, [user]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !message.trim()) return;
    
    // Update UI immediately with user message
    const userMessage = { id: Date.now(), userMessage: message, timestamp: new Date() };
    setChatHistory([...chatHistory, userMessage]);
    setMessage("");
    setIsTyping(true);
    
    try {
      // Send message to AI
      const response = await getChatCompletion(user.id, message);
      
      // Update chat history with AI response
      setChatHistory(prevHistory => [...prevHistory, response.chat]);
      setIsTyping(false);
    } catch (error) {
      console.error("Error getting AI response:", error);
      toast({
        title: "Communication Error",
        description: "Could not connect to AI assistant. Please try again.",
        variant: "destructive"
      });
      setIsTyping(false);
    }
  };

  // Helper function to format chat history
  const formatChatHistory = () => {
    const formattedHistory: JSX.Element[] = [];
    
    chatHistory.forEach((chat, index) => {
      // If the entry has userMessage, add user message
      if (chat.userMessage) {
        formattedHistory.push(
          <div key={`user-${index}`} className="flex justify-end mb-4">
            <div className="bg-primary text-white rounded-lg p-3 max-w-[80%]">
              <p className="text-sm">{chat.userMessage}</p>
            </div>
          </div>
        );
      }
      
      // If the entry has aiResponse, add AI response
      if (chat.aiResponse) {
        formattedHistory.push(
          <div key={`ai-${index}`} className="flex mb-4">
            <div className="bg-primary bg-opacity-10 rounded-full p-2 self-start mr-2">
              <span className="material-icons text-primary text-sm">smart_toy</span>
            </div>
            <div className="bg-neutral-100 rounded-lg p-3 max-w-[80%]">
              <p className="text-sm whitespace-pre-line">{chat.aiResponse}</p>
            </div>
          </div>
        );
      }
    });
    
    return formattedHistory;
  };

  // Quick suggestions for the user
  const suggestions = [
    "Side effects of medication",
    "Hydration tips",
    "Blood pressure advice",
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white rounded-t-xl shadow-sm p-4 fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="text-neutral-500"
          >
            <span className="material-icons">arrow_back</span>
          </Button>
          <div>
            <h2 className="font-display font-semibold">AI Health Companion</h2>
            <p className="text-xs text-neutral-500">Here to support your journey</p>
          </div>
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto px-4 pb-4 pt-20 mb-32">
        {/* Welcome message if there's no chat history */}
        {chatHistory.length === 0 && (
          <div className="flex mb-4">
            <div className="bg-primary bg-opacity-10 rounded-full p-2 self-start mr-2">
              <span className="material-icons text-primary text-sm">smart_toy</span>
            </div>
            <div className="bg-neutral-100 rounded-lg p-3 max-w-[80%]">
              <p className="text-sm">
                Hi {user?.firstName || "there"}! I'm your AI health companion. I'm here to help you manage your kidney health and answer any questions you might have. How can I assist you today?
              </p>
            </div>
          </div>
        )}
        
        {/* Chat history */}
        {formatChatHistory()}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex mb-4">
            <div className="bg-primary bg-opacity-10 rounded-full p-2 self-start mr-2">
              <span className="material-icons text-primary text-sm">smart_toy</span>
            </div>
            <div className="bg-neutral-100 rounded-lg p-3 inline-block">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Empty div for auto-scrolling */}
        <div ref={messagesEndRef}></div>
      </div>
      
      <div className="bg-white rounded-t-xl shadow-lg p-4 fixed bottom-0 left-0 right-0 border-t border-neutral-200">
        <form onSubmit={handleSendMessage}>
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Type your message here..." 
              className="w-full p-3 pr-12 border border-neutral-300 rounded-lg text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isTyping}
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary"
              disabled={!message.trim() || isTyping}
            >
              <span className="material-icons">send</span>
            </Button>
          </div>
        </form>
        
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="secondary"
              size="sm"
              className="text-sm text-neutral-600 bg-neutral-100 whitespace-nowrap"
              onClick={() => setMessage(suggestion)}
              disabled={isTyping}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
}

// Include BottomNavigation component
function BottomNavigation() {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  const navItems = [
    { path: "/", icon: "home", label: "Home" },
    { path: "/trends", icon: "monitoring", label: "Track" },
    { path: "/chat", icon: "chat", label: "Chat" },
    { path: "/transplant", icon: "map", label: "Roadmap" },
  ];

  return (
    <nav className="bg-white shadow-lg fixed bottom-0 left-0 right-0 z-10 border-t border-neutral-200">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center py-3 px-5 ${
              isActive(item.path) ? "text-primary" : "text-neutral-500"
            }`}
          >
            <span className="material-icons">{item.icon}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
