import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { JournalEntry } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, RefreshCw, Bot } from "lucide-react";
import { useLocation } from "wouter";

// Interface for the AI model selector
interface AIProvider {
  id: string;
  name: string;
  description: string;
  apiEndpoint: string;
}

export default function JournalPage() {
  // Setup hooks
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for the journaling interface
  const [journalContent, setJournalContent] = useState("");
  const [selectedAIProvider, setSelectedAIProvider] = useState<string>("enhanced");
  const [conversationMode, setConversationMode] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [conversation, setConversation] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<string>("write");
  
  // Safely access user context with fallback for error cases
  let userId = 1; // Default fallback userId
  let user = {
    id: 1,
    username: "testuser",
    firstName: "User"
  };
  
  try {
    const userContext = useUser();
    if (userContext.user) {
      // Create safe user object with only needed properties
      userId = userContext.user.id;
      user = {
        id: userContext.user.id,
        username: userContext.user.username,
        firstName: userContext.user.firstName || "User" // Handle potential null value
      };
    } else {
      // If user is not logged in, we'll keep using the default user object
      // but log a message to the console
      console.log("User not authenticated in JournalPage, using default user");
    }
  } catch (error) {
    console.error("UserContext not available:", error);
    // Continue with default user
  }
  
  // Check if user is authenticated when component mounts
  useEffect(() => {
    // Add a small delay to ensure context is fully loaded
    const timer = setTimeout(() => {
      console.log("Checking authentication in JournalPage");
      // We allow default user for testing, but in production you might want to redirect
      // if (!user || user.id === 1) {
      //  toast({
      //    title: "Not logged in",
      //    description: "Please log in to access your journal",
      //    variant: "destructive"
      //  });
      //  setLocation("/auth");
      // }
    }, 200);
    return () => clearTimeout(timer);
  }, []);
  
  // Check for URL parameters and set the active tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['write', 'chat', 'history'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    
    // Check if we have emotional check-in data in localStorage
    const emotionData = localStorage.getItem('nephraEmotionData');
    if (emotionData && activeTab === 'write') {
      try {
        const parsedData = JSON.parse(emotionData);
        // Pre-fill journal with emotional check-in data
        let journalText = `Emotion: ${parsedData.emotion}\n`;
        if (parsedData.tags && parsedData.tags.length > 0) {
          journalText += `Tags: ${parsedData.tags.join(', ')}\n`;
        }
        if (parsedData.notes) {
          journalText += `\n${parsedData.notes}`;
        }
        setJournalContent(journalText);
        // Clear the localStorage data so it doesn't get used again
        localStorage.removeItem('nephraEmotionData');
      } catch (error) {
        console.error('Error parsing emotion data:', error);
      }
    }
    
    // Check if we have an initial query for the chat tab
    const initialQuery = localStorage.getItem('nephraInitialQuery');
    if (initialQuery && activeTab === 'chat') {
      setFollowUpPrompt(initialQuery);
      // Clear the localStorage data
      localStorage.removeItem('nephraInitialQuery');
    }
  }, [location]);
  
  // Auto-submit the initial query if provided via localStorage
  useEffect(() => {
    const initialQuery = localStorage.getItem('nephraInitialQuery');
    // Only submit if we have a query and we're on the chat tab
    if (initialQuery && activeTab === 'chat' && !isSubmittingFollowUp && followUpPrompt === initialQuery) {
      // Use a small timeout to ensure UI is rendered first
      const timer = setTimeout(() => {
        handleFollowUpSubmit();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeTab, followUpPrompt]);
  
  // Handle switching between conversation view in write tab and chat tab
  // Make sure conversation state is preserved across tabs
  useEffect(() => {
    // If switching to chat tab and we have a conversation from the write tab
    if (activeTab === 'chat' && conversationMode && conversation.length > 0) {
      // Conversation state is already set, nothing to do
    }
    // If in write tab with conversation mode and switching to chat tab
    else if (activeTab === 'chat' && conversationMode) {
      // Set conversation state from write tab
      if (aiResponse) {
        setConversation([
          { role: 'user', content: journalContent || "How can you help me with my kidney health?" },
          { role: 'ai', content: aiResponse }
        ]);
      }
    }
  }, [activeTab, conversationMode]);

  // AI providers
  const aiProviders: AIProvider[] = [
    {
      id: "enhanced",
      name: "Enhanced Chatbot",
      description: "Multi-AI kidney wellness assistant with fallback options",
      apiEndpoint: "/api/enhanced-journal/process"
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "General health support and emotional analysis",
      apiEndpoint: "/api/ai/journal/process"
    },
    {
      id: "perplexity",
      name: "Perplexity",
      description: "Evidence-based health information",
      apiEndpoint: "/api/ai/health-info"
    }
  ];
  
  // Default to enhanced chatbot
  useEffect(() => {
    setSelectedAIProvider("enhanced");
  }, []);

  // Query to fetch journal entries
  const { data: journalEntries = [], isLoading: isLoadingJournalEntries } = useQuery<JournalEntry[]>({
    queryKey: [user ? `/api/journal-entries/${user.id}` : null],
    enabled: !!user,
    initialData: [],
  });

  // Mutation to submit journal entry
  const { mutate: submitJournal, isPending: isSubmitting } = useMutation({
    mutationFn: async (data: { content: string, aiProvider: string }) => {
      if (!user) throw new Error("No user found");
      
      // Choose endpoint based on selected AI provider
      const endpoint = aiProviders.find(p => p.id === data.aiProvider)?.apiEndpoint || "/api/ai/journal/process";
      
      const response = await apiRequest("POST", endpoint, {
        userId: user.id,
        content: data.content
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/journal-entries/${user?.id}`] });
      
      // Save AI response for conversation
      if (data.entry && data.entry.aiResponse) {
        setAiResponse(data.entry.aiResponse);
        setConversation([
          { role: 'user', content: journalContent },
          { role: 'ai', content: data.entry.aiResponse }
        ]);
        setConversationMode(true);
      }
      
      setJournalContent("");
      toast({
        title: "Journal entry saved",
        description: "Your thoughts have been saved and analyzed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving journal",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for follow-up conversation
  const { mutate: submitFollowUp, isPending: isSubmittingFollowUp } = useMutation({
    mutationFn: async (prompt: string) => {
      if (!user) throw new Error("No user found");
      
      // Use enhanced journal API for follow-up if enhanced chatbot is selected
      const endpoint = selectedAIProvider === "enhanced" 
        ? "/api/enhanced-journal/follow-up"
        : "/api/ai/chat";
      
      const response = await apiRequest("POST", endpoint, {
        userId: user.id,
        userMessage: prompt,
        followUpPrompt: prompt, // For enhanced journal API
        previousContext: conversation, // For enhanced journal API
        context: { previousConversation: conversation } // For regular AI chat
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      // Extract response from the appropriate field depending on API used
      const aiResponseText = data.response || data.message || "I'm not sure how to respond to that.";
      
      // Add to conversation
      setConversation(prev => [
        ...prev,
        { role: 'user', content: followUpPrompt },
        { role: 'ai', content: aiResponseText }
      ]);
      
      setFollowUpPrompt("");
    },
    onError: (error) => {
      toast({
        title: "Error in conversation",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    if (!journalContent.trim()) {
      toast({
        title: "Empty journal",
        description: "Please write something in your journal before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    // Reset conversation if starting a new journal entry
    setConversation([]);
    setAiResponse(null);
    setConversationMode(false);
    
    submitJournal({
      content: journalContent,
      aiProvider: selectedAIProvider
    });
  };
  
  const handleFollowUpSubmit = () => {
    if (!followUpPrompt.trim()) return;
    
    submitFollowUp(followUpPrompt);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <main className="flex-grow pt-20 pb-20 px-4">
        <h1 className="text-2xl font-bold mb-4">Journal & Check-In</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="write" className="space-y-4">
            {!conversationMode ? (
              // Journal Entry Form
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How are you feeling today?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Textarea
                      placeholder="Write about your physical symptoms, emotions, or any experiences today..."
                      className="min-h-[200px] mb-4"
                      value={journalContent}
                      onChange={(e) => setJournalContent(e.target.value)}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">AI Analysis Provider</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {aiProviders.map((provider) => (
                        <Button
                          key={provider.id}
                          variant={selectedAIProvider === provider.id ? "default" : "outline"}
                          className="justify-start h-auto py-2 px-3"
                          onClick={() => setSelectedAIProvider(provider.id)}
                        >
                          <div className="text-left">
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-xs text-muted-foreground">{provider.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !journalContent.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : "Save & Analyze"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              // Conversation Interface
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">Your Health Assistant</CardTitle>
                      <p className="text-sm text-muted-foreground">Chat about your journal entry</p>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setConversationMode(false)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-4 mb-4">
                      {conversation.map((message, index) => (
                        <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 max-w-[80%]`}>
                            <Avatar className={`h-8 w-8 ${message.role === 'ai' ? 'bg-primary' : 'bg-muted'}`}>
                              <AvatarFallback>
                                {message.role === 'ai' ? 
                                  <Bot className="h-4 w-4" /> : 
                                  (typeof user.firstName === 'string' ? user.firstName.charAt(0) : 'U')
                                }
                              </AvatarFallback>
                            </Avatar>
                            <div className={`rounded-lg p-3 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} max-w-full overflow-x-hidden`}>
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-end gap-2">
                      <Textarea
                        placeholder="Ask a follow-up question..."
                        className="min-h-[60px] flex-1"
                        value={followUpPrompt}
                        onChange={(e) => setFollowUpPrompt(e.target.value)}
                      />
                      <Button 
                        size="icon" 
                        className="h-10 w-10" 
                        onClick={handleFollowUpSubmit}
                        disabled={isSubmittingFollowUp || !followUpPrompt.trim()}
                      >
                        {isSubmittingFollowUp ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Health Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                        <span className="text-xs mb-1">Pain</span>
                        <span className="text-xl font-bold">{journalEntries[0]?.painScore || "-"}/10</span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                        <span className="text-xs mb-1">Stress</span>
                        <span className="text-xl font-bold">{journalEntries[0]?.stressScore || "-"}/10</span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                        <span className="text-xs mb-1">Fatigue</span>
                        <span className="text-xl font-bold">{journalEntries[0]?.fatigueScore || "-"}/10</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Mood Assessment</h4>
                      <p className="text-sm">{journalEntries[0]?.sentiment || "No mood assessment available"}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="chat" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Your Kidney Health Assistant</CardTitle>
                  <p className="text-sm text-muted-foreground">Chat directly with your AI assistance</p>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4 mb-4 min-h-[300px]">
                  {conversation.length > 0 ? (
                    conversation.map((message, index) => (
                      <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 max-w-[80%]`}>
                          <Avatar className={`h-8 w-8 ${message.role === 'ai' ? 'bg-primary' : 'bg-muted'}`}>
                            <AvatarFallback>
                              {message.role === 'ai' ? 
                                <Bot className="h-4 w-4" /> : 
                                (typeof user.firstName === 'string' ? user.firstName.charAt(0) : 'U')
                              }
                            </AvatarFallback>
                          </Avatar>
                          <div className={`rounded-lg p-3 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} max-w-full overflow-x-hidden`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                      <Bot className="h-12 w-12 mb-4 opacity-50" />
                      <p className="max-w-sm">Start a conversation with your AI health assistant. Ask questions about your kidney health, symptoms, or treatment options.</p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder={conversation.length === 0 ? "Type a message to start a conversation..." : "Ask a follow-up question..."}
                    className="min-h-[60px] flex-1"
                    value={followUpPrompt}
                    onChange={(e) => setFollowUpPrompt(e.target.value)}
                  />
                  <Button 
                    size="icon" 
                    className="h-10 w-10" 
                    onClick={handleFollowUpSubmit}
                    disabled={isSubmittingFollowUp || !followUpPrompt.trim()}
                  >
                    {isSubmittingFollowUp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {aiProviders.map((provider) => (
                    <Button
                      key={provider.id}
                      variant={selectedAIProvider === provider.id ? "default" : "outline"}
                      className="justify-start h-auto py-2 px-3"
                      onClick={() => setSelectedAIProvider(provider.id)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{provider.name}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history">
            {isLoadingJournalEntries ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : journalEntries.length > 0 ? (
              <div className="space-y-4">
                {journalEntries.map((entry: JournalEntry) => (
                  <Card key={entry.id} className="overflow-hidden">
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {new Date(entry.date || new Date()).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </CardTitle>
                          <div className="flex gap-2 mt-1">
                            {entry.painScore && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                Pain: {entry.painScore}/10
                              </span>
                            )}
                            {entry.stressScore && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                Stress: {entry.stressScore}/10
                              </span>
                            )}
                            {entry.fatigueScore && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                Fatigue: {entry.fatigueScore}/10
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="text-sm mb-3 whitespace-pre-wrap">{entry.content}</div>
                      {entry.sentiment && (
                        <div className="text-xs text-muted-foreground p-2 bg-muted rounded-md">
                          <strong>Mood:</strong> {entry.sentiment}
                        </div>
                      )}
                      {entry.aiResponse && (
                        <div className="mt-3 border-t pt-3">
                          <div className="flex items-start gap-2 mt-2">
                            <Avatar className="h-7 w-7 bg-primary">
                              <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                            <div className="text-sm text-muted-foreground">{entry.aiResponse}</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="mb-4">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No journal entries yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by writing about how you're feeling today. Your entries will appear here.
                  </p>
                  <Button onClick={() => setActiveTab("write")}>
                    Write Your First Entry
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <BottomNavigation />
    </div>
  );
}