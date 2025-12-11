/**
 * KSLS Information Dialog
 * 
 * Educational modal explaining what KSLS is, how it works,
 * and how to interpret the scores.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Info, Activity, Droplets, Heart, Brain, Scale, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface KSLSInfoDialogProps {
  children: React.ReactNode;
}

export function KSLSInfoDialog({ children }: KSLSInfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            Understanding Your KSLS
          </DialogTitle>
          <DialogDescription>
            Kidney Symptom Load Score - Your Daily Wellness Metric
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* What is KSLS */}
          <section>
            <h3 className="text-lg font-semibold mb-3">What is KSLS?</h3>
            <p className="text-sm text-muted-foreground mb-3">
              The <strong>Kidney Symptom Load Score (KSLS)</strong> is a comprehensive wellness index 
              that measures your daily kidney-related stress factors. It combines multiple health 
              metrics into a single, easy-to-understand score from 0-100.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Key Point:</strong> KSLS is a wellness tracker, not a diagnostic tool. 
                It helps you understand your daily symptom burden and track improvements over time.
              </p>
            </div>
          </section>

          {/* How it's calculated */}
          <section>
            <h3 className="text-lg font-semibold mb-3">How is it Calculated?</h3>
            <p className="text-sm text-muted-foreground mb-3">
              KSLS analyzes six key health factors:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FactorCard
                icon={<Heart className="h-5 w-5 text-red-500" />}
                title="Blood Pressure"
                description="Systolic and diastolic readings affect kidney workload"
              />
              <FactorCard
                icon={<Droplets className="h-5 w-5 text-blue-500" />}
                title="Hydration"
                description="Fluid intake vs. target helps kidneys filter efficiently"
              />
              <FactorCard
                icon={<Activity className="h-5 w-5 text-orange-500" />}
                title="Fatigue Level"
                description="Energy levels indicate overall kidney function"
              />
              <FactorCard
                icon={<Brain className="h-5 w-5 text-purple-500" />}
                title="Pain & Stress"
                description="Symptoms affect quality of life and recovery"
              />
              <FactorCard
                icon={<Scale className="h-5 w-5 text-green-500" />}
                title="Weight/BMI"
                description="Body weight impacts kidney filtration load"
              />
              <FactorCard
                icon={<TrendingUp className="h-5 w-5 text-indigo-500" />}
                title="Combined Score"
                description="Weighted algorithm produces 0-100 KSLS score"
              />
            </div>
          </section>

          {/* Score Bands */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Understanding Your Score</h3>
            <div className="space-y-3">
              <ScoreBand
                range="0-30"
                label="Stable"
                color="bg-green-500"
                description="Minimal kidney stress. Symptoms are well-managed. Continue current routine."
              />
              <ScoreBand
                range="31-60"
                label="Elevated"
                color="bg-yellow-500"
                description="Moderate stress detected. Review lifestyle factors and consider adjustments."
              />
              <ScoreBand
                range="61-100"
                label="High"
                color="bg-red-500"
                description="Significant symptom load. Consult healthcare provider about your symptoms."
              />
            </div>
          </section>

          {/* KSLS vs GFR */}
          <section>
            <h3 className="text-lg font-semibold mb-3">KSLS vs. GFR</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-blue-600 mb-2">KSLS</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Daily symptom tracker</li>
                  <li>• No lab tests needed</li>
                  <li>• Tracks wellness trends</li>
                  <li>• Updates in real-time</li>
                  <li>• Focus on quality of life</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-purple-600 mb-2">GFR</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Medical diagnostic tool</li>
                  <li>• Requires blood test</li>
                  <li>• Measures kidney function</li>
                  <li>• Updated periodically</li>
                  <li>• Clinical assessment</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How to improve */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Improving Your KSLS</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <ul className="text-sm space-y-2 text-green-900">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Stay hydrated:</strong> Meet your daily fluid target</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Manage blood pressure:</strong> Follow medication schedule</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Rest well:</strong> Adequate sleep reduces fatigue</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Reduce stress:</strong> Mindfulness, exercise, support groups</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Track consistently:</strong> Log daily to spot trends early</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600">
              <strong>Medical Disclaimer:</strong> KSLS is not a substitute for medical advice, 
              diagnosis, or treatment. Always consult your healthcare provider about your kidney 
              health. If your score is consistently elevated or high, schedule an appointment 
              to discuss your symptoms.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FactorCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg bg-white">
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

function ScoreBand({ range, label, color, description }: {
  range: string;
  label: string;
  color: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <div className="flex items-center gap-2 min-w-[120px]">
        <Badge className={`${color} text-white`}>
          {label}
        </Badge>
        <span className="text-sm font-medium">{range}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
