PR SI-01 — Chat: “Record/Upload Lecture” + media plumbing

Goal: Tutors can record/upload video/audio in chat; show upload progress; send as a “recording” message.

Tasks

 Add “📹 Record Lecture” / “🎤 Record Audio” actions to chat composer.

 Support attach-from-library (video/audio) and in-app capture (expo-camera / expo-av).

 Client-side compression for large videos (keep <100MB where possible).

 Save to Storage path: /recordings/{conversationId}/{recordingId}.

 Send chat message referencing recordingId + storageUrl + fileType.

 Show inline upload progress + retry on failure.

Files: add/edit

app/chat/[id].tsx (edit)

app/src/services/lecturesService.ts (add)

app/src/utils/mediaCompression.ts (add)

app/src/components/recordings/UploadProgressBar.tsx (add)

Deps (app):

 expo-camera, expo-av, expo-document-picker, expo-file-system

PR SI-02 — Firestore/Storage schema + Security Rules

Goal: Lock down access (participants only) and standardize metadata.

Tasks

 Create recordings subcollection schema & message linking.

 Add transcript & summaries collections (structure in PRD).

 Update firestore.rules to allow read/write to conversation participants.

 Update storage.rules to scope to conversation participants.

 Add composite index if needed for time-ordered queries.

Files: add/edit

firebase/firestore.rules (edit)

firebase/storage.rules (edit)

firebase/indexes.json (add if needed)

docs/SESSION_INTELLIGENCE.md (add)

PR SI-03 — CF: Watermark pipeline (processRecording)

Goal: Auto-apply “TutorAI” watermark after upload and write back processedUrl.

Tasks

 Storage trigger on recordings/** new file → download to tmp.

 FFmpeg overlay “TutorAI” (bottom-right, safe margins).

 Re-upload processed MP4/M4A, write processedUrl, duration, height/width.

 Handle idempotency (skip if already processed).

 Emit analytics logs (processing_ms, size_before/after).

Files: add/edit

functions/src/processRecording.ts (add)

functions/src/lib/ffmpeg.ts (add)

functions/src/index.ts (edit: export trigger)

Deps (functions):

 @ffmpeg-installer/ffmpeg, fluent-ffmpeg

PR SI-04 — CF: Transcription (transcribeRecording)

Goal: Transcribe processed media with Whisper; persist transcript.

Tasks

 Trigger when processedUrl set (on recordings doc update).

 Download media (or stream) → Whisper → full text.

 Save to /transcripts/{conversationId}/{recordingId} (text, wordCount).

 Backoff & retry on rate-limit; mark error on permanent failure.

 Add ENV + cost counter logs.

Files: add/edit

functions/src/transcribeRecording.ts (add)

functions/src/index.ts (edit)

functions/.env.example (edit keys)

Deps (functions):

 openai (or provider SDK you prefer)

PR SI-05 — CF: Per-file daily summary (afterTranscript)

Goal: Generate daily summary for each new transcript.

Tasks

 On create of /transcripts/**: call LLM summarizer.

 Write daily summary into /summaries/{conversationId}/daily:{YYYY-MM-DD} with append.

 Include normalized topics array [“Algebra”, “Quadratics”].

 Idempotency guard (don’t double-append same recording).

Files: add/edit

functions/src/afterTranscript.ts (add or extend existing)

functions/src/lib/summarize.ts (add)

functions/src/index.ts (edit)

PR SI-06 — UI: “Recordings” tab + transcript viewer

Goal: Parents can browse just the media for a conversation; view transcript.

Tasks

 Add “Messages | Recordings | Schedule” segment in chat header or tabs.

 Build list/grid of recordings with thumbnail, duration, date.

 Drill-in player (use expo-av Video) + “View Transcript” sheet.

 Lazy-load transcript; link to daily summary chip.

Files: add/edit

app/recordings/index.tsx (add)

app/src/hooks/useRecordings.ts (add)

app/src/hooks/useTranscript.ts (add)

app/src/components/recordings/RecordingCard.tsx (add)

app/src/components/recordings/TranscriptSheet.tsx (add)

app/chat/[id].tsx (edit: navigation into Recordings)

PR SI-07 — CF (Scheduled): Weekly aggregator (Sunday)

Goal: Aggregate last week’s daily summaries into a single weekly digest.

Tasks

 Scheduled func (CRON): Sundays 18:00 America/Chicago.

 For each conversation with activity, fetch prior Mon–Sun daily entries.

 Summarize to aggregatedSummary, highlights[].

 Persist /summaries/{conversationId}/{weekId}.

Files: add/edit

functions/src/weeklyAggregator.ts (add)

functions/src/lib/firestore.ts (add common queries)

functions/src/index.ts (edit)

PR SI-08 — CF: Progress reel generator (video) + fallback

Goal: Turn weekly digest into a short branded reel; fallback to text card if FFmpeg fails.

Tasks

 Compose 20–30s MP4 with title card, bullet highlights, end card; “TutorAI” watermark.

 Save to Storage; write reelUrl on weekly summary doc.

 Fallback: generate PNG share card with highlights if video render fails.

 Emit processing metrics.

Files: add/edit

functions/src/generateProgressReel.ts (add)

functions/src/lib/ffmpeg.ts (reuse)

functions/src/index.ts (edit)

app/src/services/reelService.ts (add for client consumption)

PR SI-09 — Overview surface + push delivery

Goal: Show new weekly reel on parent overview and notify.

Tasks

 Add/extend Overview tab to surface latest weekly reel per child.

 Deep-link reel card → playback page (in conversation context).

 Push notification to parents when new weekly summary available.

 Mark-as-seen badge on overview card.

Files: add/edit

app/(tabs)/overview.tsx (add/edit)

app/src/hooks/useWeeklySummaries.ts (add)

app/src/services/lecturesService.ts (edit: helpers to fetch latest reel)

Cloud Function (optional): use existing notifications function to push on weekly write

PR SI-10 — Analytics & observability

Goal: Measure success and diagnose failures.

Tasks

 Log events: recording_upload_started/succeeded/failed, transcription_succeeded/failed, weekly_reel_ready, reel_viewed, transcript_viewed.

 Add timing metrics (upload_ms, process_ms, transcribe_ms).

 Error categorization + alerting hook (e.g., to console + Amplitude).

Files: add/edit

app/src/services/lecturesService.ts (edit: client events)

functions/src/* (edit: structured logs)

docs/SESSION_INTELLIGENCE.md (edit: event schema)

PR SI-11 — Retention & cost controls

Goal: Keep storage/cost sane; respect privacy.

Tasks

 CF scheduled cleanup: delete raw uploads after 30 days; keep processed + transcript.

 Redact PII in error logs; ensure role-scoped reads on all collections.

 Toggle to disable transcription per conversation (privacy).

Files: add/edit

functions/src/cleanup.ts (add)

functions/src/index.ts (edit)

firebase/firestore.rules (edit)

docs/SESSION_INTELLIGENCE.md (edit: retention policy)

PR SI-12 — DX & Docs

Goal: Make it easy to run & maintain.

Tasks

 Add .env.example for app & functions (OPENAI_API_KEY, FIREBASE_*, TZ).

 Add runbook with diagrams, flowchart, and failure modes.

 Update README with “How to test uploads locally” and “How to test weekly cron”.

Files: add/edit

functions/.env.example (edit)

docs/SESSION_INTELLIGENCE.md (edit)

README.md (edit)

Quick Acceptance Criteria (per PR)

SI-01: Uploads complete with progress; chat shows a recording bubble; Storage path correct.

SI-02: Only conversation participants can read/view recordings & transcripts.

SI-03: Processed files have visible “TutorAI” watermark; metadata stored.

SI-04: Transcript appears within ~90s of processed upload; errors retried/backed off.

SI-05: Daily summary doc updates on transcript creation; topics extracted.

SI-06: Recordings tab shows thumbnails; transcript sheet opens.

SI-07: Sunday job writes weekly doc with aggregated summary/highlights.

SI-08: Reel (or fallback card) is generated and linked on weekly doc.

SI-09: Overview shows latest reel; push delivered; deep-link plays reel.

SI-10: Events visible in analytics; timings recorded; error categories present.

SI-11: Raw file older than 30 days is removed; privacy toggles respected.

SI-12: Env & docs allow new dev to run end-to-end.