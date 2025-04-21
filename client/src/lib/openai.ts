import { apiRequest } from "./queryClient";

// API wrapper for the OpenAI chat completion
export async function getChatCompletion(userId: number, userMessage: string): Promise<{
  message: string;
  chat: {
    id: number;
    userId: number;
    userMessage: string;
    aiResponse: string;
    timestamp: Date;
  };
}> {
  try {
    const response = await apiRequest("POST", "/api/ai-chat", {
      userId,
      userMessage
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error sending message to AI:", error);
    throw new Error("Failed to get AI response");
  }
}

// Get chat history for a user
export async function getChatHistory(userId: number, limit?: number): Promise<any[]> {
  try {
    const url = `/api/ai-chat/${userId}${limit ? `?limit=${limit}` : ''}`;
    const response = await fetch(url, {
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chat history: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching chat history:", error);
    throw new Error("Failed to fetch chat history");
  }
}
