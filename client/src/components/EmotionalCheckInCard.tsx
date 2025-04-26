import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";

// Emotion options
const emotionOptions = [
  { value: "happy", label: "Happy", emoji: "😀" },
  { value: "calm", label: "Calm", emoji: "😌" },
  { value: "stressed", label: "Stressed", emoji: "😰" },
  { value: "tired", label: "Tired", emoji: "😴" },
  { value: "worried", label: "Worried", emoji: "😟" }
];

// Emotion tags
const emotionTags = [
  { value: "treatment", label: "Treatment side-effects", color: "primary" },
  { value: "medication", label: "Medication changes", color: "accent" },
  { value: "diet", label: "Diet changes", color: "primary" },
  { value: "appointment", label: "Recent appointment", color: "accent" },
  { value: "sleep", label: "Sleep issues", color: "primary" }
];

export function EmotionalCheckInCard() {
  const { user } = useUser();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  const [selectedEmotion, setSelectedEmotion] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmotionSelect = (emotion: string) => {
    setSelectedEmotion(emotion);
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const logEmotionalCheckIn = async (data: any) => {
    try {
      const response = await apiRequest("POST", "/api/emotional-check-in", data);
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Error: ${response.status}`);
      }
    } catch (error) {
      console.error("Error logging emotional check-in:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    // Don't proceed if no user is logged in
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to log your emotional check-in",
        variant: "destructive"
      });
      return;
    }

    // Don't proceed if no emotion is selected
    if (!selectedEmotion) {
      toast({
        title: "Select an emotion",
        description: "Please select how you're feeling",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Use the current user's ID
      await logEmotionalCheckIn({
        userId: user.id,
        date: new Date(),
        emotion: selectedEmotion,
        tags: selectedTags,
        notes: notes
      });
      
      // Store the data in localStorage for journal page to use
      localStorage.setItem('nephraEmotionData', JSON.stringify({
        emotion: selectedEmotion,
        tags: selectedTags,
        notes: notes
      }));
      
      // Show success message
      toast({
        title: "Check-in logged",
        description: "Your emotional check-in has been recorded",
      });
      
      // Check if user is still logged in before redirecting
      if (user && user.id) {
        // Redirect to journal page with write tab active
        setLocation("/journal?tab=write");
      } else {
        toast({
          title: "Session expired",
          description: "Please log in again to continue",
          variant: "destructive"
        });
        setLocation("/auth");
      }
      
      // Reset form
      setSelectedEmotion("");
      setSelectedTags([]);
      setNotes("");
    } catch (error) {
      console.error("Error logging emotional check-in:", error);
      toast({
        title: "Error",
        description: "Could not log your emotional check-in. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format the current time
  const currentTime = format(new Date(), "h:mm a");

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold">Emotional Check-In</h3>
        <span className="text-xs text-neutral-500">Today at {currentTime}</span>
      </div>
      
      {user && user.id ? (
        <>
          <p className="text-sm text-neutral-600 mb-4">How are you feeling right now?</p>
          
          <div className="grid grid-cols-5 gap-2 mb-4">
            {emotionOptions.map((emotion) => (
              <button
                key={emotion.value}
                className={`flex flex-col items-center p-2 hover:bg-neutral-100 rounded-lg transition ${
                  selectedEmotion === emotion.value ? "bg-neutral-100" : ""
                }`}
                onClick={() => handleEmotionSelect(emotion.value)}
              >
                <span className="text-2xl mb-1">{emotion.emoji}</span>
                <span className="text-xs">{emotion.label}</span>
              </button>
            ))}
          </div>
          
          <div className="flex gap-2 flex-wrap mb-4">
            {emotionTags.map((tag) => (
              <button
                key={tag.value}
                className={`text-sm px-3 py-1 rounded-full transition ${
                  selectedTags.includes(tag.value)
                    ? tag.color === "primary" 
                      ? "bg-primary-light bg-opacity-20 text-primary-dark"
                      : tag.color === "accent" 
                        ? "bg-accent-light bg-opacity-20 text-accent-dark"
                        : "bg-neutral-100 text-neutral-700"
                    : "bg-neutral-100 text-neutral-700"
                }`}
                onClick={() => handleTagToggle(tag.value)}
              >
                {tag.label}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <Textarea
              className="w-full p-3 border border-neutral-300 rounded-lg text-sm"
              placeholder="Add more details about how you're feeling... (optional)"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button 
              variant="ghost" 
              size="icon"
              className="absolute bottom-3 right-3 text-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedEmotion}
            >
              <span className="material-icons">send</span>
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-neutral-600 mb-4">Track your emotions and well-being</p>
          <Button 
            variant="outline" 
            className="w-full text-primary border-primary"
            onClick={() => setLocation("/auth")}
          >
            Log in to use Emotional Check-In
          </Button>
        </>
      )}
    </div>
  );
}

export default EmotionalCheckInCard;
