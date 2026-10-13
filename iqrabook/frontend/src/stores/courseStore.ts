import { create } from "zustand";
import type { Course, Topic } from "@/types";

// Pre-defined courses
const COURSES: Course[] = [
  {
    id: "python",
    title: "Python Mastery",
    description:
      "Variables irundhu Advanced Python varaikkum — practical examples la kathukalam!",
    totalTopics: 25,
    roadmap: [],
    githubRepos: [],
    icon: "🐍",
    color: "#3776AB",
  },
  {
    id: "java",
    title: "Java Foundation",
    description:
      "OOP, Data Structures, vera ellam — Java la strong aagalam!",
    totalTopics: 20,
    roadmap: [],
    githubRepos: [],
    icon: "☕",
    color: "#ED8B00",
  },
  {
    id: "ml",
    title: "Machine Learning",
    description:
      "Linear Regression irundhu Neural Networks varaikkum — ML complete ah padikalam!",
    totalTopics: 18,
    roadmap: [],
    githubRepos: [],
    icon: "🧠",
    color: "#FF6F00",
  },
  {
    id: "html",
    title: "HTML & Web Dev",
    description:
      "HTML, CSS, JavaScript — Beautiful websites build pannalam!",
    totalTopics: 15,
    roadmap: [],
    githubRepos: [],
    icon: "🌐",
    color: "#E34F26",
  },
];

interface CourseState {
  // State
  courses: Course[];
  selectedCourse: Course | null;
  currentTopic: Topic | null;
  topics: Topic[];

  // Actions
  selectCourse: (courseId: string) => void;
  setTopics: (topics: Topic[]) => void;
  setCurrentTopic: (topic: Topic) => void;
  nextTopic: () => void;
  getCourse: (courseId: string) => Course | undefined;
}

export const useCourseStore = create<CourseState>((set, get) => ({
  // Initial State
  courses: COURSES,
  selectedCourse: null,
  currentTopic: null,
  topics: [],

  // Actions
  selectCourse: (courseId) => {
    const course = COURSES.find((c) => c.id === courseId);
    set({ selectedCourse: course || null });
  },

  setTopics: (topics) => {
    set({ topics, currentTopic: topics[0] || null });
  },

  setCurrentTopic: (topic) => set({ currentTopic: topic }),

  nextTopic: () => {
    const { topics, currentTopic } = get();
    if (currentTopic) {
      const currentIndex = topics.findIndex((t) => t.id === currentTopic.id);
      if (currentIndex < topics.length - 1) {
        set({ currentTopic: topics[currentIndex + 1] });
      }
    }
  },

  getCourse: (courseId) => COURSES.find((c) => c.id === courseId),
}));
