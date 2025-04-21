import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/contexts/UserContext";
import { useEmotionalCheckIn } from "@/hooks/useEmotionalCheckIn";
import { format } from "date-fns";

export function EmotionalCheckInCard() {
  const { user } = useUser();
  const { emotionOptions, emotionTags, logEmotionalCheckIn, todayCheckIn } = 
    user ? useEmotionalCheckIn({ userId: user.id }) : 
    { emotionOptions: [], emotionTags: [], logEmotionalCheckIn: () => {}, todayCheckIn: null };
  
  const [selectedEmotion, setSelectedEmotion] = useState<string>(todayCheckIn?.emotion || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(todayCheckIn?.tags || []);
  const [notes, setNotes] = useState<string>(todayCheckIn?.notes || "");
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

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      await logEmotionalCheckIn({
        userId: user.id,
        date: new Date(),
        emotion: selectedEmotion,
        tags: selectedTags,
        notes: notes
      });
      
      // Clear form if needed
      // or leave as is to show the user their current check-in
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
