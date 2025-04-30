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
    console.log(`🚀 Sending chat request for user ${userId} with message length: ${userMessage.length} chars`);
    
    const response = await apiRequest("POST", "/api/ai-chat", {
      userId,
      userMessage
    });
    
    if (!response.ok) {
      // Try to extract the error message from the response
      try {
        const errorData = await response.json();
        console.error("AI service error:", errorData);
        throw new Error(errorData.message || `Server responded with status: ${response.status}`);
      } catch (parseError) {
        console.error("Error parsing error response:", parseError);
        throw new Error(`Server responded with status: ${response.status}`);
      }
    }
    
    const data = await response.json();
    console.log(`✅ Received AI response with length: ${data.message.length} chars`);
    return data;
  } catch (error) {
    console.error("Error sending message to AI:", error);
    // More descriptive error message that includes the original error
    throw new Error(`Failed to get AI response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Get chat history for a user
export async function getChatHistory(userId: number, limit?: number): Promise<any[]> {
  try {
    // Try to get chat history from main API first
    const url = `/api/ai-chat/${userId}${limit ? `?limit=${limit}` : ''}`;
    console.log(`📊 Fetching chat history from: ${url}`);
    
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      console.warn(`Main API chat history fetch failed with status: ${response.status}`);
      
      // Try Supabase endpoint as fallback if primary endpoint fails
      console.log('🔄 Attempting fallback to Supabase chat history endpoint');
      const supabaseUrl = `/api/ai/chat/${userId}/supabase${limit ? `?limit=${limit}` : ''}`;
      const supabaseResponse = await fetch(supabaseUrl, {
        credentials: "include",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!supabaseResponse.ok) {
        throw new Error(`All chat history endpoints failed. Primary: ${response.status}, Fallback: ${supabaseResponse.status}`);
      }
      
      console.log('✅ Successfully retrieved chat history from Supabase fallback');
      return await supabaseResponse.json();
    }
    
    // Primary endpoint successful
    console.log('✅ Successfully retrieved chat history from primary endpoint');
    return await response.json();
  } catch (error) {
    console.error("Error fetching chat history:", error);
    // Return empty array instead of throwing to improve UX
    return [];
  }
}
