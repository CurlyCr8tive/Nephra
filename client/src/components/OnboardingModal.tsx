import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Activity,
  BarChart2,
  BookOpen,
  Droplets,
  Heart,
  Map,
  Notebook,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";

const STEPS = [
  {
    icon: <Heart className="w-12 h-12 text-primary" />,
    title: "Track Your Kidney Health Daily",
    description:
      "Log your blood pressure, hydration, GFR, and symptoms every day. Nephra uses your real lab values (like serum creatinine) with the CKD-EPI 2021 equation to give you an accurate eGFR — no guesswork.",
    highlight: "Log Health",
  },
  {
    icon: <BarChart2 className="w-12 h-12 text-blue-500" />,
    title: "Visualize Your Health Over Time",
    description:
      "The Analytics tab shows charts for hydration, blood pressure, GFR, KSLS score, pain, stress, and fatigue across 7, 30, or 90 days. Spot trends before your next nephrology appointment.",
    highlight: "Analytics",
  },
  {
    icon: <Activity className="w-12 h-12 text-orange-500" />,
    title: "Kidney Symptom Load Score (KSLS)",
    description:
      "KSLS is a composite wellness score (0–100) based on your symptoms, vitals, and lab values. Log your metrics daily to track how your symptom burden changes over time.",
    highlight: "KSLS",
  },
  {
    icon: <Notebook className="w-12 h-12 text-purple-500" />,
    title: "Journal Your Journey",
    description:
      "Write daily journal entries to capture how you feel beyond the numbers — energy levels, diet, mood, and notes for your care team. Entries are private and searchable.",
    highlight: "Journal",
  },
  {
    icon: <Map className="w-12 h-12 text-green-500" />,
    title: "Transplant Roadmap & Education",
    description:
      "Follow a step-by-step transplant readiness roadmap, explore the Education Hub for kidney health resources, and upload medical documents — all in one place.",
    highlight: "Roadmap & Education",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ open, onClose }: Props) {
  const { user } = useAuth();
  // null = welcome screen, number = step index
  const [step, setStep] = useState<number | null>(null);

  const markComplete = async () => {
    if (!user?.id) return;
    try {
      await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ onboardingCompleted: true }),
      });
    } catch {
      // Non-critical — modal will still close
    }
  };

  const handleSkip = async () => {
    await markComplete();
    onClose();
  };

  const handleStartTour = () => setStep(0);

  const handleNext = async () => {
    if (step === null) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await markComplete();
      onClose();
    }
  };

  const handleBack = () => {
    if (step === null) return;
    if (step === 0) setStep(null);
    else setStep(step - 1);
  };

  const isWelcome = step === null;
  const currentStep = step !== null ? STEPS[step] : null;
  const isLastStep = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent
        className="max-w-lg w-full p-0 overflow-hidden rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Progress dots */}
        {!isWelcome && (
          <div className="flex justify-center gap-2 pt-5 px-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i <= (step ?? 0)
                    ? "bg-primary w-6"
                    : "bg-neutral-200 w-2"
                }`}
              />
            ))}
          </div>
        )}

        <div className="p-8">
          {isWelcome ? (
            /* ── Welcome screen ── */
            <div className="text-center">
              <div className="flex justify-center mb-5">
                <div className="bg-primary/10 rounded-full p-5">
                  <Heart className="w-14 h-14 text-primary" />
                </div>
              </div>
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold text-center">
                  Welcome to Nephra
                  {user?.firstName ? `, ${user.firstName}` : ""}!
                </DialogTitle>
                <DialogDescription className="text-center text-base mt-2 leading-relaxed">
                  Nephra is your personal kidney health companion — tracking GFR, blood pressure,
                  hydration, symptoms, and more to help you stay on top of your CKD care.
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-neutral-500 mb-8">
                Would you like a quick tour of the key features?
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={handleStartTour}
                >
                  Yes, show me around
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-12 text-base text-neutral-500"
                  onClick={handleSkip}
                >
                  No thanks, take me to the dashboard
                </Button>
              </div>
            </div>
          ) : currentStep ? (
            /* ── Feature steps ── */
            <div className="text-center">
              <div className="flex justify-center mb-5">
                <div className="bg-neutral-50 rounded-full p-5 border border-neutral-100">
                  {currentStep.icon}
                </div>
              </div>
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl font-bold text-center leading-snug">
                  {currentStep.title}
                </DialogTitle>
                <DialogDescription className="text-center text-sm mt-3 leading-relaxed text-neutral-600">
                  {currentStep.description}
                </DialogDescription>
              </DialogHeader>

              <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-8">
                <Activity className="w-3.5 h-3.5" />
                {currentStep.highlight}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={handleBack}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button className="flex-1 h-11 font-semibold" onClick={handleNext}>
                  {isLastStep ? "Get started" : "Next"}
                  {!isLastStep && <ChevronRight className="ml-1 h-4 w-4" />}
                </Button>
              </div>

              <button
                onClick={handleSkip}
                className="mt-4 text-xs text-neutral-400 hover:text-neutral-600 underline-offset-2 hover:underline"
              >
                Skip tour
              </button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
