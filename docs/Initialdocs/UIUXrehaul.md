🧭 Core Product Vision

MessageAI → “Your Tutoring Communication Assistant.”
A lightweight, messaging-first hub for:

Lesson scheduling & confirmations

Homework and exam reminders

Progress summaries and parent updates

Group notices (for multiple parents if needed)

No child profiles. No student login.
Every message is contextualized around the student but communicated only between tutor and parent(s).

1️⃣ Roles & Onboarding
🧑‍🏫 Tutor Flow

Sign Up → Select “I’m a Tutor.”

Enter name, subjects, and (optional) business name.

Auto-generate a Tutor Code (e.g. TUT-839D4).

Arrive at Home → Parent Chats List with “Invite Parent” CTA.

“Share your Tutor Code so parents can message you directly.”

👩‍👧 Parent Flow

Sign Up → Select “I’m a Parent.”

Enter name, email, and optionally student initials (for tutor context only, not stored).

Input Tutor Code → creates private 1:1 chat.

Land on chat screen with the tutor + Assistant tab for schedule & reminders.

Firestore additions

/users/{uid}: {
  role: 'tutor' | 'parent',
  tutorCode?: string,      // tutors only
  linkedTutorIds?: string[] // parents can link to multiple tutors
}

2️⃣ Conversation Model
Type	Participants	Example Use	Notes
1-to-1 Chat	Tutor + Parent	Primary communication channel	One per tutor–parent pair
Group Chat	Tutor + multiple Parents	Shared updates for small classes	Only tutors can create
Assistant Feed (system)	Tutor or Parent + Assistant	Auto reminders, summaries	Not user-to-user

Leverages existing conversations schema.

3️⃣ Tutor Experience
Home = Parent Inbox

Header: “Your Parents” + tutor code copy button

Card List:

Parent name

Last message preview

Next session badge (e.g. “Tomorrow @ 5 PM”)

“Awaiting RSVP” or “Completed” status

FAB: “Invite Parent” → share code or create group chat.
Secondary Tab: “Schedule” → chronological list of upcoming sessions.

Empty state:

“No active parents yet — share your Tutor Code to start a chat.”

4️⃣ Parent Experience
Home = Tutor Assistant Feed

Cards generated from event/deadline data:

Next Lesson — shows date, time, location, RSVP buttons

Reminders — “Math assignment due Friday”

Progress Report — quick summary from tutor (“Sam improved in fractions this week”)

Alerts — cancellations, reschedules, urgent messages

Below the feed: list of active tutors.

5️⃣ Chat Interface (Shared)
Header

Tutor View → Parent Name

Parent View → Tutor Name + Subject

Group Chat → “Grade 8 Parents – Ms Lee”

Message Types
Type	Example	Function
Text / Image	“Please confirm tomorrow’s lesson.”	Normal chat
Lesson Card	“Lesson Proposal → Mon 5 PM” + ✅/❌	RSVP + Auto-create event
Reminder Card	“Homework due Fri Nov 10”	Auto-notifies both
Progress Card	“Progress Report – Week 5: Great improvement in writing.”	Tutor-only creation
Assistant Message	[Assistant]: Tomorrow’s lesson is confirmed.	System generated
Urgent Highlight	“⚠ Parent cancelled today’s lesson.”	Red accent, high priority
Inline AI Actions

Tap date/time → “Add to Calendar”

Long-press → “Create Reminder” or “Mark as Done”

6️⃣ Calendar View

Shared component for both roles:

Tutor: grouped by parent (Parent Name – Lesson Date/Time)

Parent: grouped by tutor

Tapping entry → opens chat context

Data source = /events collection.
Fields: dateTime, status, tutorId, parentIds[], title, rsvps.

7️⃣ Assistant Logic (in background)

Implements roadmap features without child context:

Detect dates (“next Friday”) → suggest session creation

Parse “cancel” / “urgent” → flag priority

Extract “due by …” → create reminder

Send automated nudges:

“Tomorrow’s lesson pending confirmation.”

“Lesson with Smith family in 2 hours.”

“Homework due today — consider checking in.”

All handled via Cloud Functions + Chrono parser per roadmap.

8️⃣ Navigation Structure (Expo Router)
app/
 ├── (auth)/signup.tsx           # role selection
 ├── (tabs)/_layout.tsx          # role-aware tab groups
 ├── (tabs)/index.tsx            # TutorHome or ParentHome
 ├── chat/[id].tsx               # chat UI
 ├── calendar.tsx                # shared calendar
 ├── profile.tsx
 └── assistant.tsx               # optional assistant feed


Conditional tabs:

Tutor: Home • Schedule • Messages • Profile

Parent: Home • Messages • Profile

9️⃣ Cursor Implementation Prompt

Prompt Title: Rebuild MessageAI for Direct Tutor–Parent Communication
Prompt:
Refactor the MessageAI React Native + Firebase app into a private messaging system between tutors and parents (no child accounts).

Add role-based signup (tutor or parent) and store role in Firestore.

Tutors generate a tutorCode; parents join via code to create a 1:1 chat.

Tutor Home → list of parents with upcoming sessions, RSVP status, and progress report shortcuts.

Parent Home → Assistant feed with next lesson, reminders, and progress cards.

Chats support event cards, reminder cards, and system assistant messages.

Enable optional group chats (1 tutor + multiple parents).

Maintain existing service/hook/component architecture and Firestore schema conventions.