import { create } from "zustand";

interface BookPage {
  pageNumber: number;
  content: string;
  code?: string;
  diagram?: string;
  language?: string;
  type: string;
}

interface BookState {
  currentPage: number;   // Spread index (0 = pages 1+2, 1 = pages 3+4, ...)
  totalPages: number;    // Total individual pages
  totalSpreads: number;  // Math.ceil(totalPages / 2)
  isFlipping: boolean;
  flipDirection: "next" | "prev" | null;
  pages: BookPage[];

  nextSpread: () => void;
  prevSpread: () => void;
  goToSpread: (spread: number) => void;
  setFlipping: (status: boolean) => void;
  addPage: (page: Omit<BookPage, "pageNumber">) => void;
  setPages: (pages: Omit<BookPage, "pageNumber">[]) => void;
  clearPages: () => void;
}

export const useBookStore = create<BookState>((set, get) => ({
  currentPage: 0,
  totalPages: 0,
  totalSpreads: 0,
  isFlipping: false,
  flipDirection: null,
  pages: [],

  nextSpread: () => {
    const { currentPage, totalSpreads, isFlipping } = get();
    if (currentPage < totalSpreads - 1 && !isFlipping) {
      set({ isFlipping: true, flipDirection: "next" });
      setTimeout(
        () =>
          set((s) => ({
            currentPage: s.currentPage + 1,
            isFlipping: false,
            flipDirection: null,
          })),
        600
      );
    }
  },

  prevSpread: () => {
    const { currentPage, isFlipping } = get();
    if (currentPage > 0 && !isFlipping) {
      set({ isFlipping: true, flipDirection: "prev" });
      setTimeout(
        () =>
          set((s) => ({
            currentPage: s.currentPage - 1,
            isFlipping: false,
            flipDirection: null,
          })),
        600
      );
    }
  },

  goToSpread: (spread) => {
    const { totalSpreads } = get();
    if (totalSpreads <= 0) return;
    const clamped = Math.max(0, Math.min(spread, totalSpreads - 1));
    set({ currentPage: clamped });
  },

  setFlipping: (status) =>
    set({ isFlipping: status, flipDirection: status ? "next" : null }),

  addPage: (page) => {
    const { pages } = get();
    const newPage: BookPage = { ...page, pageNumber: pages.length + 1 };
    const newPages = [...pages, newPage];
    set({
      pages: newPages,
      totalPages: newPages.length,
      totalSpreads: Math.ceil(newPages.length / 2),
    });
  },

  setPages: (incoming) => {
    const newPages: BookPage[] = incoming.map((p, i) => ({
      ...p,
      pageNumber: i + 1,
      type: p.type || "lesson",
    }));
    set({
      pages: newPages,
      totalPages: newPages.length,
      totalSpreads: Math.ceil(newPages.length / 2),
    });
  },

  clearPages: () =>
    set({ pages: [], totalPages: 0, totalSpreads: 0, currentPage: 0 }),
}));
