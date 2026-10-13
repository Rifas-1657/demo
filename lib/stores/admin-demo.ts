'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { defaultTutorSettings, seedCourses, seedDocuments, seedMembers } from '@/lib/admin/seed'
import type { AdminCourse, AdminDocument, DemoMember, TutorSettings } from '@/lib/admin/types'
import { newId, uniqueSlug } from '@/lib/admin/utils'
import { safeStorage } from '@/lib/storage'

interface AdminDemoState {
  hydrated: boolean
  /** Demo navigation state only — this is not authentication or authorization. */
  demoAdmin: boolean
  sidebarCompact: boolean
  courses: AdminCourse[]
  documents: AdminDocument[]
  members: DemoMember[]
  tutor: TutorSettings
  setDemoAdmin: (value: boolean) => void
  setSidebarCompact: (value: boolean) => void
  saveCourse: (course: AdminCourse) => void
  duplicateCourse: (id: string, updatedAt: string) => AdminCourse | null
  togglePublish: (id: string, updatedAt: string) => void
  addDocuments: (documents: AdminDocument[]) => void
  updateDocument: (id: string, patch: Partial<AdminDocument>) => void
  removeDocument: (id: string) => void
  startProcessing: (id: string) => void
  advanceProcessing: (step: number) => void
  inviteMember: (member: DemoMember) => void
  removeMember: (id: string) => void
  saveTutor: (settings: TutorSettings) => void
  resetDemoData: () => void
}

const seedState = () => ({
  courses: seedCourses,
  documents: seedDocuments,
  members: seedMembers,
  tutor: defaultTutorSettings,
})

export const useAdminDemo = create<AdminDemoState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      demoAdmin: false,
      sidebarCompact: false,
      ...seedState(),
      setDemoAdmin: (demoAdmin) => set({ demoAdmin }),
      setSidebarCompact: (sidebarCompact) => set({ sidebarCompact }),
      saveCourse: (course) =>
        set((state) => {
          const exists = state.courses.some((c) => c.id === course.id)
          return {
            courses: exists ? state.courses.map((c) => (c.id === course.id ? course : c)) : [course, ...state.courses],
          }
        }),
      duplicateCourse: (id, updatedAt) => {
        const source = get().courses.find((c) => c.id === id)
        if (!source) return null
        const copyId = newId('course')
        const copy: AdminCourse = {
          ...source,
          id: copyId,
          sourceId: null,
          title: `${source.title} (copy)`,
          slug: uniqueSlug(`${source.slug}-copy`, get().courses.map((c) => c.slug)),
          status: 'draft',
          updatedAt,
          chapters: source.chapters.map((chapter) => ({ ...chapter, id: newId('ch') })),
        }
        set((state) => ({ courses: [copy, ...state.courses] }))
        return copy
      },
      togglePublish: (id, updatedAt) =>
        set((state) => ({
          courses: state.courses.map((c) =>
            c.id === id ? { ...c, status: c.status === 'published' ? 'draft' : 'published', updatedAt } : c,
          ),
        })),
      addDocuments: (documents) => set((state) => ({ documents: [...documents, ...state.documents] })),
      updateDocument: (id, patch) =>
        set((state) => ({ documents: state.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      removeDocument: (id) => set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),
      startProcessing: (id) =>
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id && d.stage === 'selected' ? { ...d, stage: 'processing', progress: 0 } : d)),
        })),
      advanceProcessing: (step) =>
        set((state) => ({
          documents: state.documents.map((d) => {
            if (d.stage !== 'processing') return d
            const progress = Math.min(100, d.progress + step)
            return { ...d, progress, stage: progress >= 100 ? 'ready' : 'processing' }
          }),
        })),
      inviteMember: (member) => set((state) => ({ members: [...state.members, member] })),
      removeMember: (id) => set((state) => ({ members: state.members.filter((m) => m.id !== id) })),
      saveTutor: (tutor) => set({ tutor }),
      resetDemoData: () => set(seedState()),
    }),
    {
      name: 'admin:demo',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: ({ demoAdmin, sidebarCompact, courses, documents, members, tutor }) => ({
        demoAdmin,
        sidebarCompact,
        courses,
        documents,
        members,
        tutor,
      }),
      onRehydrateStorage: () => () => {
        useAdminDemo.setState({ hydrated: true })
      },
    },
  ),
)

export function rehydrateAdminDemo() {
  if (useAdminDemo.getState().hydrated) return
  void useAdminDemo.persist.rehydrate()
}
