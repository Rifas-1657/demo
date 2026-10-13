"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string;
  totalTopics: number;
  icon: string;
  color: string;
  ready: boolean;
}

const COURSES: Course[] = [
  {
    id: "1",
    title: "Python",
    description: "Variables irundhu Advanced Python varaikkum — practical examples la kathukalam!",
    totalTopics: 25,
    icon: "🐍",
    color: "#3776AB",
    ready: true,
  },
  {
    id: "2",
    title: "Java",
    description: "OOP, Data Structures, vera ellam — Java la strong aagalam!",
    totalTopics: 20,
    icon: "☕",
    color: "#ED8B00",
    ready: false,
  },
  {
    id: "3",
    title: "Machine Learning",
    description: "Linear Regression irundhu Neural Networks varaikkum!",
    totalTopics: 18,
    icon: "🧠",
    color: "#FF6F00",
    ready: false,
  },
  {
    id: "4",
    title: "HTML & Web Dev",
    description: "HTML, CSS, JavaScript — Beautiful websites build pannalam!",
    totalTopics: 15,
    icon: "🌐",
    color: "#E34F26",
    ready: false,
  },
];

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 17) % 100}%`,
  delay: `${(i * 0.45) % 10}s`,
  duration: `${10 + (i % 7)}s`,
  size: 2 + (i % 3),
}));

export default function HomePage() {
  return (
    <main className="min-h-screen bg-iq-darker relative overflow-hidden">
      <div className="mesh-bg" aria-hidden />
      {PARTICLES.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
            bottom: "-8px",
          }}
        />
      ))}

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 glass border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📖</span>
          <div>
            <h1 className="text-xl font-bold text-iq-white tracking-wide">IqraBook</h1>
            <p className="text-xs text-iq-pink font-arabic">اقْرَأْ — Read!</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/60">
          <Link href="/admin" className="text-white/40 hover:text-iq-pink text-xs transition-colors">
            Admin
          </Link>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          AI Ready
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-16 px-8 text-center overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-iq-red/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 left-1/4 w-[300px] h-[200px] bg-iq-pink/8 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <p className="bismillah mb-4">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
          <h2 className="text-5xl md:text-6xl font-bold text-iq-white mb-4 leading-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)]">
            Learn with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-iq-red to-iq-pink">
              AI Voice
            </span>{" "}
            &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-book-yellow to-book-orange">
              3D Books
            </span>
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-2">
            Namma AI tutor Tanglish la solli kudukum — 3D book la padikaalam!
          </p>
          <p className="text-sm text-white/40 mb-10">
            Voice agent • Interactive book • Live code runner • Personalized learning
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {["🎙️ Tanglish Voice", "📖 3D Book", "💻 Live Code", "🧠 Adaptive AI", "⚡ Instant Responses"].map((f) => (
              <span
                key={f}
                className="px-4 py-1.5 rounded-full text-sm glass border border-white/10 text-white/80 will-change-transform"
              >
                {f}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Course Cards */}
      <section className="relative z-10 px-6 pb-20 max-w-5xl mx-auto">
        <h3 className="text-center text-white/50 text-sm uppercase tracking-widest mb-8">
          Choose Your Course
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {COURSES.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <CourseCard course={course} />
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-8 py-10 text-center">
        <p className="bismillah text-lg mb-2">اقْرَأْ</p>
        <p className="text-white/40 text-sm">
          IqraBook — Tanglish voice tutor · 3D book · live Python runner
        </p>
        <p className="text-white/25 text-xs mt-2">
          4 seats · Python course live · Java / ML / Web coming soon
        </p>
      </footer>
    </main>
  );
}

function CourseCard({ course }: { course: Course }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const rotY = (x - 0.5) * 14;
    const rotX = (0.5 - y) * 10;
    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.03,1.03,1.03)`;
  };

  const onLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`card-tilt relative rounded-2xl p-6 glass border border-white/10 group
        ${course.ready ? "python-glow cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
    >
      <div className="card-shimmer" />

      {course.ready ? (
        <span className="absolute top-4 right-4 text-[10px] font-bold tracking-widest px-3 py-1 rounded-full bg-iq-red text-white shadow-[0_0_12px_rgba(230,57,70,0.6)]">
          LIVE
        </span>
      ) : (
        <span className="absolute top-4 right-4 text-xs px-3 py-1 rounded-full bg-white/10 text-white/50">
          Coming Soon
        </span>
      )}

      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
          style={{ background: `${course.color}22`, border: `1px solid ${course.color}44` }}
        >
          {course.icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-iq-white">{course.title}</h3>
          <p className="text-xs text-white/40">{course.totalTopics} topics</p>
        </div>
      </div>

      <p className="text-white/60 text-sm leading-relaxed mb-6">
        {course.description}
      </p>

      <div className="h-1.5 rounded-full bg-white/10 mb-5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-iq-red to-iq-pink transition-all duration-700"
          style={{ width: course.ready ? "8%" : "0%" }}
        />
      </div>

      {course.ready ? (
        <Link
          href={`/course/${course.id}/survey`}
          className="block w-full py-3 rounded-xl text-center font-semibold text-sm text-iq-white
            bg-gradient-to-r from-iq-red to-iq-pink hover:opacity-90 transition-opacity will-change-transform"
        >
          📖 Enter 3D Book →
        </Link>
      ) : (
        <button
          disabled
          className="w-full py-3 rounded-xl text-center font-semibold text-sm text-white/30 bg-white/5"
        >
          Coming Soon
        </button>
      )}
    </div>
  );
}
