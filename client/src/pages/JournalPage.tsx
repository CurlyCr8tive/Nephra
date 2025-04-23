import { useState } from "react";
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

// Interface for the AI model selector
interface AIProvider {
  id: string;
  name: string;
  description: string;
  apiEndpoint: string;
}

export default function JournalPage() {
  // Use a default test user since we don't have auth implemented yet
  // In a real application, this would come from authentication
  const user = { 
    id: 1,
    username: "testuser",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User"
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [journalContent, setJournalContent] = useState("");
  const [selectedAIProvider, setSelectedAIProvider] = useState<string>("openai");
  const [conversationMode, setConversationMode] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [conversation, setConversation] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [followUpPrompt, setFollowUpPrompt] = useState("");

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
  useState(() => {
    setSelectedAIProvider("enhanced");
  });

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
        
        <Tabs defaultValue="write" className="w-full">
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
                                {message.role === 'ai' ? <Bot className="h-4 w-4" /> : user.firstName?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`rounded-lg p-3 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
          
          <TabsContent value="history">
            {isLoadingJournalEntries ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : journalEntries.length > 0 ? (
              <div className="space-y-4">
                {journalEntries.map((entry: JournalEntry) => (
                  <Card key={entry.id} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2 bg-muted/30">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md">
                          {new Date(entry.date || new Date()).toLocaleDateString()}
                        </CardTitle>
                        <div className="flex space-x-1">
                          {entry.tags && entry.tags.map((tag) => (
                            <span 
                              key={tag} 
                              className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {entry.content}
                        </p>
                      </div>
                      
                      {entry.aiResponse && (
                        <div className="border-t pt-3 mt-3">
                          <h4 className="text-sm font-medium mb-1">AI Insights:</h4>
                          <p className="text-sm text-muted-foreground italic">
                            {entry.aiResponse}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex space-x-3">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Pain: </span>
                            <span className="font-semibold">{entry.painScore}/10</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Stress: </span>
                            <span className="font-semibold">{entry.stressScore}/10</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Fatigue: </span>
                            <span className="font-semibold">{entry.fatigueScore}/10</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Mood: {entry.sentiment}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No journal entries yet. Start writing to track your health journey.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <BottomNavigation />
    </div>
  );
}