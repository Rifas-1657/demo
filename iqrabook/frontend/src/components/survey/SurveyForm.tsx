"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface SurveyData {
  skillLevel: 1 | 2 | 3;
  learningPace: "slow" | "moderate" | "fast";
  goals: string;
  interests: string[];
  preferredExamples: string;
}

const INTERESTS = [
  "🎬 Movies", "🏏 Cricket", "🎮 Gaming", "🍕 Food",
  "🎵 Music", "✈️ Travel", "⚽ Football", "📱 Tech",
];

const INTEREST_VALUES = [
  "movies", "cricket", "gaming", "food",
  "music", "travel", "football", "tech",
];

interface SurveyFormProps {
  courseId: string;
  onComplete: (data: SurveyData) => void;
}

export function SurveyForm({ courseId, onComplete }: SurveyFormProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<SurveyData>>({
    skillLevel: 1,
    learningPace: "moderate",
    goals: "",
    interests: [],
    preferredExamples: "",
  });

  const steps = [
    { title: "Ungaloda level ena?", subtitle: "Honest ah sollunga — adhuthaan best!" },
    { title: "Epdi padikareenga?", subtitle: "Ungaloda pace la poi padikaalam" },
    { title: "Enna achieve pannanum?", subtitle: "Ungaloda goal sollungha" },
    { title: "Enna pudikum?", subtitle: "Examples personalize pannuvom" },
  ];

  const toggleInterest = (val: string) => {
    const curr = data.interests || [];
    const updated = curr.includes(val)
      ? curr.filter((i) => i !== val)
      : [...curr, val];
    setData({ ...data, interests: updated });
  };

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else {
      onComplete(data as SurveyData);
    }
  };

  return (
    <div className="min-h-screen bg-iq-darker flex items-center justify-center p-6">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-iq-red/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? "w-8 bg-iq-red" : "w-4 bg-white/20"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-2xl p-8"
          >
            <p className="text-white/40 text-sm mb-1">{steps[step].subtitle}</p>
            <h2 className="text-2xl font-bold text-iq-white mb-8">{steps[step].title}</h2>

            {/* Step 0: Skill level */}
            {step === 0 && (
              <div className="space-y-3">
                {[
                  { val: 1, label: "Beginner", sub: "Python paathaye illa, fresh start!", emoji: "🌱" },
                  { val: 2, label: "Intermediate", sub: "Basics theriyum, deeper poga ready", emoji: "📚" },
                  { val: 3, label: "Advanced", sub: "Already use panren, advanced venum", emoji: "🚀" },
                ].map(({ val, label, sub, emoji }) => (
                  <button
                    key={val}
                    onClick={() => setData({ ...data, skillLevel: val as 1 | 2 | 3 })}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${
                      data.skillLevel === val
                        ? "border-iq-red bg-iq-red/10"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{emoji}</span>
                      <div>
                        <p className="font-semibold text-iq-white">{label}</p>
                        <p className="text-sm text-white/50">{sub}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 1: Learning pace */}
            {step === 1 && (
              <div className="space-y-3">
                {[
                  { val: "slow", label: "Slow & Deep", sub: "Every concept detail ah purinja sari", emoji: "🐢" },
                  { val: "moderate", label: "Balanced", sub: "Medium pace — practical + theory", emoji: "⚖️" },
                  { val: "fast", label: "Fast Track", sub: "Quick ah cover pannanum, already basics theriyum", emoji: "⚡" },
                ].map(({ val, label, sub, emoji }) => (
                  <button
                    key={val}
                    onClick={() => setData({ ...data, learningPace: val as "slow" | "moderate" | "fast" })}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${
                      data.learningPace === val
                        ? "border-iq-red bg-iq-red/10"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{emoji}</span>
                      <div>
                        <p className="font-semibold text-iq-white">{label}</p>
                        <p className="text-sm text-white/50">{sub}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Goals */}
            {step === 2 && (
              <div className="space-y-4">
                <textarea
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-iq-white placeholder-white/30 resize-none focus:outline-none focus:border-iq-red/50"
                  placeholder="e.g., 'Data science pananum', 'Job switch', 'Personal projects build pannanum'..."
                  value={data.goals}
                  onChange={(e) => setData({ ...data, goals: e.target.value })}
                />
                <div className="flex flex-wrap gap-2">
                  {["Data Science", "Web Development", "Automation", "Job Switch", "Personal Projects"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setData({ ...data, goals: g })}
                      className="px-3 py-1.5 rounded-lg text-sm border border-white/10 text-white/60 hover:border-iq-pink/50 hover:text-iq-pink transition-all"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Interests */}
            {step === 3 && (
              <div>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {INTERESTS.map((interest, i) => (
                    <button
                      key={i}
                      onClick={() => toggleInterest(INTEREST_VALUES[i])}
                      className={`p-3 rounded-xl text-center transition-all border ${
                        (data.interests || []).includes(INTEREST_VALUES[i])
                          ? "border-iq-red bg-iq-red/10"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div className="text-xl mb-1">{interest.split(" ")[0]}</div>
                      <div className="text-xs text-white/60">{interest.split(" ")[1]}</div>
                    </button>
                  ))}
                </div>
                <p className="text-white/40 text-xs text-center">
                  {(data.interests || []).length} selected — AI examples personalise aagum!
                </p>
              </div>
            )}

            {/* Next button */}
            <button
              onClick={handleNext}
              disabled={step === 2 && !data.goals}
              className="mt-8 w-full py-3.5 rounded-xl font-semibold text-iq-white bg-gradient-to-r from-iq-red to-iq-pink hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              {step === steps.length - 1 ? "🚀 Start Learning!" : "Next →"}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
