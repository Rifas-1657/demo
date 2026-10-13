"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SurveyForm } from "@/components/survey/SurveyForm";
import { motion } from "framer-motion";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const USER_ID = "user_1"; // TODO: auth later

interface PageProps {
  params: { courseId: string };
}

export default function SurveyPage({ params }: PageProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState<string | null>(null);

  // Check if survey already completed
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(
          `${BACKEND}/api/survey/${USER_ID}/${params.courseId}`
        );
        const data = await res.json();
        if (data.completed) {
          setAlreadyDone(true);
          setWelcomeBack("Welcome back! Thirumba vandeenga — continue pannalam!");
        }
      } catch {
        // Offline/no backend — just show survey
      }
      setChecked(true);
    };
    check();
  }, [params.courseId]);

  const handleSurveyComplete = async (surveyData: any) => {
    try {
      // Start/resume session
                const sessionRes = await fetch(`${BACKEND}/api/sessions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: USER_ID, course_id: parseInt(params.courseId) }),
      });
      const sessionData = await sessionRes.json();

      // Submit survey
      await fetch(`${BACKEND}/api/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          course_id: parseInt(params.courseId),
          ...surveyData,
        }),
      });

      // Navigate to course page
      router.push(`/course/${params.courseId}?session=${sessionData.id}`);
    } catch {
      // Even if backend fails, go to course page
      router.push(`/course/${params.courseId}?session=local`);
    }
  };

  if (!checked) {
    return (
      <div className="min-h-screen bg-iq-darker flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-iq-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Already done — show welcome back
  if (alreadyDone) {
    return (
      <div className="min-h-screen bg-iq-darker flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-10 max-w-md text-center"
        >
          <div className="text-5xl mb-4">👋</div>
          <h2 className="text-2xl font-bold text-iq-white mb-2">
            Welcome Back!
          </h2>
          <p className="text-white/60 mb-8">{welcomeBack}</p>
          <button
            onClick={async () => {
              try {
                const sessionRes = await fetch(`${BACKEND}/api/sessions/`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    user_id: USER_ID,
                    course_id: parseInt(params.courseId),
                  }),
                });
                const sessionData = await sessionRes.json();
                router.push(
                  `/course/${params.courseId}?session=${sessionData.id || "resume"}`
                );
              } catch {
                router.push(`/course/${params.courseId}?session=resume`);
              }
            }}
            className="w-full py-3.5 rounded-xl font-semibold text-iq-white bg-gradient-to-r from-iq-red to-iq-pink hover:opacity-90 transition-opacity"
          >
            📖 Continue Learning →
          </button>
          <button
            onClick={() => setAlreadyDone(false)}
            className="mt-3 w-full py-2 text-sm text-white/40 hover:text-white/60"
          >
            Redo survey (preferences change pannanum)
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <SurveyForm
      courseId={params.courseId}
      onComplete={handleSurveyComplete}
    />
  );
}
