# Meridian

**Your day, at its high point.**

Meridian is a local-first productivity workspace that brings the four surfaces you live in
every day — **habits, tasks, calendar, and notes** — into one fast, private app that owns
your data.

## Why Meridian

A single day is scattered across four apps: Habitify for habits, TickTick for tasks, Google
Calendar for time, Notion or Obsidian for notes. Every switch fragments your attention, and
every app parks your data on a server you don't control. Meridian's bet: the daily-driver
surfaces belong together, on your own machine.

## Principles

1. **Local-first and yours.** Your data lives on your machine in a single SQLite file. No
   account, no cloud dependency, works offline, exportable any time.
2. **Unified, not bolted-on.** Habits, tasks, calendar, and notes share primitives — dates,
   sections, priorities, links — so they compose instead of sitting in silos.
3. **Fast and calm.** Optimistic UI that responds instantly. Strong, opinionated defaults
   over a wall of settings.
4. **Time is the backbone.** Everything resolves onto a day. The calendar is where the four
   pillars meet.
5. **Broad, but focused.** Meridian covers the surfaces you touch daily — not a generic
   database builder or a team wiki.

## The four pillars

- **Habits** — _the mature core today._ Binary and counter habits, limits, per-day targets,
  priorities, streaks, skip/fail states, an auto-fail rolling window, sections, and
  time-travel across any date.
- **Tasks** — one-off to-dos with sections and due dates today; growing toward recurring
  tasks, sub-tasks, and scheduling onto the calendar.
- **Calendar** — _the missing pillar._ A day/week/month timeline where habits and task
  due-dates surface together, and where you block time for what matters.
- **Notes** — fast, autosaving notes today; growing into a knowledge layer with links between
  notes, daily notes, and notes attached to any habit, task, or day.

## What makes it Meridian

- vs. **Habitify / TickTick** — your data is yours, and notes/knowledge live in the same place.
- vs. **Google Calendar** — the calendar isn't just events; it's the meeting point of your
  habits, tasks, and notes.
- vs. **Notion / Obsidian** — structured productivity (habits, tasks, time) is first-class,
  not something you rebuild from blocks — and it's fast.

## Roadmap

- **Phase 0 — Become Meridian.** Rebrand from "Habit Tracker"; migrate data and preferences
  safely. _(this change)_
- **Phase 1 — Calendar.** The missing leg: month/week/day views surfacing habits and task
  due-dates on a timeline.
- **Phase 2 — Deeper tasks.** Recurring tasks, sub-tasks, and scheduling tasks onto calendar
  days (reusing the habit schedule engine in `src/lib/schedule.ts`).
- **Phase 3 — Notes as knowledge.** `[[wiki-links]]`, daily notes, full-text search, and
  attaching notes to habits/tasks/days.
- **Phase 4 — One surface.** A "Today" view pulling all four pillars together, plus
  quick-capture and cross-linking.
- **Later, maybe.** Optional sync, a mobile-friendly build, light extensibility.

## Non-goals

- Not a team/collaboration tool — Meridian is single-user and personal.
- Not a generic no-code database — it's opinionated around daily productivity.
- Not cloud-account-gated — local-first stays the default, always.
