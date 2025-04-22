import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

// Mock data for emotional check-in
const mockEmotionOptions = [
  { value: "happy", label: "Happy", emoji: "😀" },
  { value: "calm", label: "Calm", emoji: "😌" },
  { value: "stressed", label: "Stressed", emoji: "😰" },
  { value: "tired", label: "Tired", emoji: "😴" },
  { value: "worried", label: "Worried", emoji: "😟" }
];

const mockEmotionTags = [
  { value: "treatment", label: "Treatment side-effects", color: "primary" },
  { value: "medication", label: "Medication changes", color: "accent" },
  { value: "diet", label: "Diet changes", color: "primary" },
  { value: "appointment", label: "Recent appointment", color: "accent" },
  { value: "sleep", label: "Sleep issues", color: "primary" }
];

export function EmotionalCheckInCard() {
  // Using mock data since we don't have the user context yet
  const emotionOptions = mockEmotionOptions;
  const emotionTags = mockEmotionTags;
  // Mock check-in data with proper typing
  const todayCheckIn: { emotion?: string; tags?: string[]; notes?: string } = null;
  
  const logEmotionalCheckIn = (data: any) => {
    console.log("Logging emotional check-in:", data);
    // This would call the backend API in a real implementation
  };
  
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

  const handleSubmit = () => {
    setIsSubmitting(true);
    try {
      // Using default user ID (1) since we're using mock data
      logEmotionalCheckIn({
        userId: 1,
        date: new Date(),
        emotion: selectedEmotion,
        tags: selectedTags,
        notes: notes
      });
      
      // Show success message
      console.log("Emotional check-in logged successfully");
    } catch (error) {
      console.error("Error logging emotional check-in:", error);
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
    </div>
  );
}

export default EmotionalCheckInCard;
