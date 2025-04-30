import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
  
  // No need for authentication checks here anymore
  // The ProtectedRoute component handles it for us
  
  // State for the journaling interface
  const [journalContent, setJournalContent] = useState("");
  const [selectedAIProvider, setSelectedAIProvider] = useState<string>("enhanced");
  const [conversationMode, setConversationMode] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [conversation, setConversation] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<string>("write");
  
  // Check for URL parameters and set the active tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    
    // Redirect chat tab to the dedicated Chat page
    if (tabParam === 'chat') {
      // If we have an initial query in localStorage, preserve it for the Chat page
      const initialQuery = localStorage.getItem('nephraInitialQuery');
      
      toast({
        title: "Opening Chat",
        description: "Redirecting to the dedicated chat page for better experience",
      });
      
      // Redirect to the Chat page
      setLocation('/chat');
      return;
    }
    
    // Set the active tab for other valid tabs
    if (tabParam && ['write', 'history'].includes(tabParam)) {
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
  }, [location, setLocation, toast]);
  
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
  const { 
    data: journalEntries = [], 
    isLoading: isLoadingJournalEntries,
    isError: isJournalError,
    refetch: refetchJournalEntries,
    error: journalError
  } = useQuery<JournalEntry[]>({
    queryKey: ['/api/journal-entries'],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) return [];
      
      console.log('📊 Fetching journal entries with new endpoint');
      
      try {
        // First try the authenticated endpoint
        let response = await fetch('/api/journal-entries', {
          headers: { 'Content-Type': 'application/json' }
        });
        
        // If that fails, fall back to the user ID-specific endpoint
        if (!response.ok) {
          console.log('📋 Falling back to user ID endpoint for journal entries');
          response = await fetch(`/api/journal-entries/${user.id}`, {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        if (!response.ok) {
          throw new Error(`Error fetching journal entries: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          console.log(`📝 Retrieved ${data.length} journal entries`);
          // Sort entries by date, newest first
          return [...data].sort((a, b) => 
            new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
          );
        } else {
          console.error("Invalid journal entries format:", data);
          return [];
        }
      } catch (error) {
        console.error("Error in journal entries query:", error);
        return []; // Return empty array on error to prevent breaking the UI
      }
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 3,
    initialData: [],
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
  
  // Attempt to fetch journal entries from various sources with fallbacks
  const fetchJournalEntriesFromAllSources = async () => {
    if (!user?.id) return;
    
    console.log('🔄 Fetching journal entries for user:', user.id);
    
    try {
      // Try the main API endpoint (authenticated endpoint)
      await refetchJournalEntries();
      
      // If no entries were found, try the fallback endpoint with explicit user ID
      if (journalEntries.length === 0) {
        console.log('📝 No journal entries found in primary API, trying fallback API...');
        try {
          // Make a direct fetch to the user ID-specific endpoint
          const response = await fetch(`/api/journal-entries/${user.id}`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              console.log(`📝 Found ${data.length} journal entries from fallback API`);
              
              // Sort entries by date before updating the cache
              const sortedData = [...data].sort((a, b) => 
                new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
              );
              
              // Manually update the query cache with the retrieved data
              queryClient.setQueryData(['/api/journal-entries'], sortedData);
            }
          }
        } catch (fallbackError) {
          console.error('Error fetching from fallback journal API:', fallbackError);
        }
      }
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    }
  };
  
  // Fetch journal entries whenever the component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      console.log('🔄 JournalPage mounted, attempting to fetch journal entries...');
      fetchJournalEntriesFromAllSources();
    }
  }, [user?.id]);
  
  // Switch to history tab to see journal entries
  useEffect(() => {
    if (activeTab === 'history' && user?.id) {
      console.log('📚 History tab selected, refreshing journal entries...');
      fetchJournalEntriesFromAllSources();
    }
  }, [activeTab]);

  // Log any journal loading errors
  useEffect(() => {
    if (isJournalError && journalError) {
      console.error('Error loading journal entries:', journalError);
      toast({
        title: "Error loading journal entries",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  }, [isJournalError, journalError, toast]);

  // Mutation to submit journal entry
  const { mutate: submitJournal, isPending: isSubmitting } = useMutation({
    mutationFn: async (data: { content: string, aiProvider: string }) => {
      if (!user || !user.id) throw new Error("No user found");
      
      // Choose endpoint based on selected AI provider
      const endpoint = aiProviders.find(p => p.id === data.aiProvider)?.apiEndpoint || "/api/ai/journal/process";
      
      const response = await apiRequest("POST", endpoint, {
        userId: user.id,
        content: data.content
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (user && user.id) {
        // Invalidate using the same query key format as our useQuery
        queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
        console.log('✅ Successfully saved journal entry, refreshing entries');
      }
      
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
      if (!user || !user.id) throw new Error("No user found");
      
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
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="write">Write</TabsTrigger>
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
                                  (user && user.firstName ? user.firstName.charAt(0) : 'U')
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
          
          {/* Chat tab has been removed - functionality redirected to dedicated Chat page */}
          
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
                      <div className="text-sm mb-3 whitespace-pre-wrap">
                        {/* Check for null or truncated content */}
                        {entry.content ? 
                          entry.content.length > 500 ? 
                            `${entry.content.substring(0, 500)}...` : 
                            entry.content
                          : 
                          "No content available"
                        }
                      </div>
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
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {/* Check for null or truncated AI response */}
                              {entry.aiResponse ? 
                                entry.aiResponse.length > 300 ? 
                                  `${entry.aiResponse.substring(0, 300)}...` : 
                                  entry.aiResponse
                                : 
                                "No AI response available"
                              }
                            </div>
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