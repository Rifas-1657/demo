'use client'

import { MailPlus, RotateCw, UserMinus, Users } from 'lucide-react'
import { useState } from 'react'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'
import { notify } from '@/components/ui-kit/toast'
import type { DemoMember } from '@/lib/admin/types'
import { EMAIL_PATTERN, formatDate, newId } from '@/lib/admin/utils'
import { useAdminDemo } from '@/lib/stores/admin-demo'
import { AdminPageHeader, AdminPanel, ConfirmDialog, DemoNotice, describedBy, Field, inputClass, TableScroller, tdClass, thClass } from '../admin-ui'

export function AdminMembers() {
  const members = useAdminDemo((s) => s.members)
  const courses = useAdminDemo((s) => s.courses)
  const removeMember = useAdminDemo((s) => s.removeMember)
  const [pendingRemove, setPendingRemove] = useState<DemoMember | null>(null)
  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? 'Removed course'

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Members"
        description="Fictional demo learners and the courses assigned to them. Invites are recorded locally and never emailed."
      />
      <DemoNotice>
        Every member here is a fictional sample person with a <span className="font-mono">demo.example</span> address. No
        invitations are sent and no real accounts exist.
      </DemoNotice>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {members.length === 0 ? (
            <EmptyState icon={<Users aria-hidden="true" />} title="No members" description="Invite a demo member to get started." />
          ) : (
            <TableScroller label="Demo members">
              <table className="w-full min-w-[48rem] text-sm">
                <caption className="sr-only">Demo members with assigned courses and last activity</caption>
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th scope="col" className={thClass}>Member</th>
                    <th scope="col" className={thClass}>Assigned courses</th>
                    <th scope="col" className={thClass}>Last active</th>
                    <th scope="col" className={`${thClass} text-right`}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/40">
                      <td className={tdClass}>
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
                          >
                            {member.name
                              .split(' ')
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join('')}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium">{member.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={tdClass}>
                        {member.courseIds.length === 0 ? (
                          <span className="text-muted-foreground">None</span>
                        ) : (
                          <ul className="flex max-w-xs flex-wrap gap-1">
                            {member.courseIds.map((id) => (
                              <li key={id}>
                                <BookeyBadge tone="soft">{courseTitle(id)}</BookeyBadge>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {member.status === 'invited' || !member.lastActiveAt ? (
                          <BookeyBadge tone="warning">Invite pending</BookeyBadge>
                        ) : (
                          <time dateTime={member.lastActiveAt} className="text-muted-foreground">
                            {formatDate(member.lastActiveAt)}
                          </time>
                        )}
                      </td>
                      <td className={tdClass}>
                        <div className="flex items-center justify-end gap-1">
                          {member.status === 'invited' && (
                            <BookeyButton
                              variant="ghost"
                              size="sm"
                              onClick={() => notify.demo(`Invite to ${member.name} marked as resent`, 'Simulated — no email was sent.')}
                            >
                              <RotateCw aria-hidden="true" />
                              Resend<span className="sr-only"> invite to {member.name}</span>
                            </BookeyButton>
                          )}
                          <button
                            type="button"
                            onClick={() => setPendingRemove(member)}
                            className="grid size-9 place-items-center rounded-full text-muted-foreground outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-4 focus-visible:ring-ring/30"
                          >
                            <UserMinus aria-hidden="true" className="size-4" />
                            <span className="sr-only">Remove {member.name}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroller>
          )}
        </div>
        <InviteForm />
      </div>

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemove(null)}
        title="Remove member?"
        description={`${pendingRemove?.name ?? 'This member'} will lose access to their assigned demo courses.`}
        confirmLabel="Remove member"
        onConfirm={() => {
          if (!pendingRemove) return
          removeMember(pendingRemove.id)
          notify.demo(`Removed ${pendingRemove.name}`)
        }}
      />
    </div>
  )
}

function InviteForm() {
  const members = useAdminDemo((s) => s.members)
  const courses = useAdminDemo((s) => s.courses)
  const inviteMember = useAdminDemo((s) => s.inviteMember)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [courseIds, setCourseIds] = useState<string[]>([])
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = 'Enter a name.'
    const normalized = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalized)) next.email = 'Enter a valid email address.'
    else if (members.some((m) => m.email.toLowerCase() === normalized)) next.email = 'This email is already a member.'
    setErrors(next)
    if (next.name || next.email) {
      document.getElementById(next.name ? 'invite-name' : 'invite-email')?.focus()
      return
    }
    inviteMember({ id: newId('member'), name: name.trim(), email: normalized, courseIds, lastActiveAt: null, status: 'invited' })
    notify.demo(`Invite recorded for ${name.trim()}`, 'Simulated — no email was sent.')
    setName('')
    setEmail('')
    setCourseIds([])
  }

  return (
    <AdminPanel title="Invite a demo member" description="Recorded locally. No email is sent." className="h-fit">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="invite-name" label="Name" error={errors.name}>
          <input
            id="invite-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy('invite-name', errors.name)}
            className={inputClass}
          />
        </Field>
        <Field id="invite-email" label="Email" error={errors.email} hint="Use a fictional address, e.g. name@demo.example">
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy('invite-email', errors.email, 'hint')}
            className={inputClass}
          />
        </Field>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Assign courses</legend>
          <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {courses.map((course) => {
              const checked = courseIds.includes(course.id)
              return (
                <label key={course.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setCourseIds((ids) => (checked ? ids.filter((id) => id !== course.id) : [...ids, course.id]))}
                    className="size-4 accent-primary"
                  />
                  <span className="min-w-0 flex-1 truncate">{course.title}</span>
                  {course.status === 'draft' && <span className="text-xs text-muted-foreground">Draft</span>}
                </label>
              )
            })}
          </div>
        </fieldset>
        <BookeyButton type="submit" className="w-full">
          <MailPlus aria-hidden="true" />
          Record invite
        </BookeyButton>
      </form>
    </AdminPanel>
  )
}
