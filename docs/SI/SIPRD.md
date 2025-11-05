1. Overview

Goal:
Enable tutors to upload recorded video/audio sessions directly within the chat or through a “Record Lecture” option. Uploaded media are automatically watermarked (“TutorAI”), transcribed, and stored in a dedicated Recordings view accessible to parents.
Summaries are generated daily and aggregated into weekly progress reels automatically delivered to parents every Sunday.

This feature operationalizes the “Session Intelligence” requirement from the Platinum Project Varsity Tutors brief, creating the foundation for agentic actions and shareable parent reports.

2. Objectives
Objective	Description	Success Metric
1. Seamless media upload	Tutors can record or attach lectures within the chat.	95% of uploads complete successfully under 15s for <50MB videos.
2. Watermark processing	All uploaded lectures auto-watermarked “TutorAI”.	100% of media files display branding overlay.
3. Transcription pipeline	Audio/video automatically transcribed by Session Intelligence agent.	90% transcription accuracy; stored within 60 seconds of upload.
4. Daily + weekly summaries	Generate daily transcript summaries; compile into weekly parent digest.	Summaries generated daily; weekly reel auto-sent every Sunday 6 PM.
5. Parent-accessible recordings	Parents can view all lecture media in a dedicated “Recordings” tab.	90% of parents view at least one recording weekly.
3. User Stories
Tutor

As a tutor, I can record or upload a lecture (video or audio) from my chat screen.

As a tutor, I see progress of uploads and can cancel/retry failed uploads.

As a tutor, I can review past lectures and edit titles/descriptions.

Parent

As a parent, I can view all recordings in a “Recordings” tab within the conversation.

As a parent, I receive a weekly summary reel (video + text digest) showing topics covered and highlights from transcripts.

As a parent, I can quickly skim daily transcribed notes to stay informed on my child’s progress.

AI / System

As the Session Intelligence agent, when a new recording is uploaded, I should:

Transcribe it automatically.

Store transcript + summary in Firestore.

Aggregate summaries into a weekly digest on Sunday.

Generate a “shareable progress reel” and push it to parent overview.

4. Feature Scope
Component	Description	Priority
Upload UI (chat)	“📹 Record Lecture” and “🎤 Record Audio” buttons in chat composer; or attach from device.	P0
Watermark Processing	Cloud Function (processRecording) applies “TutorAI” overlay via FFmpeg on upload.	P0
Cloud Storage Integration	Media stored under /recordings/{conversationId}/{date}/{fileId} in Firebase Storage.	P0
Transcription Pipeline	Cloud Function (transcribeRecording) → sends to OpenAI Whisper API → saves text to /transcripts/{conversationId}/{fileId}.	P0
Daily Summarizer	Cloud Function (afterTranscript) → summarizer agent generates daily digest per conversation.	P1
Weekly Aggregator	Scheduled Function (runs Sundays) → compiles all transcripts of the week → generates weekly “progress reel”.	P1
Parent Recordings View	“Recordings” tab in chat (filters only media messages).	P0
Progress Reel Generation	Uses transcript + lesson metadata to render a vertical summary reel with watermark, child name, and topics.	P1
Notification Delivery	Parents receive push + overview card link to new weekly reel.	P1
AI Agent Storage	All transcripts indexed into vector store for future search & summarization.	P2
5. Data Model
Firestore Schema Additions
/recordings/{conversationId}/{recordingId}
{
  id: string;
  conversationId: string;
  tutorId: string;
  studentId: string;
  fileType: 'video' | 'audio';
  storageUrl: string;
  duration: number;
  uploadedAt: Timestamp;
  processedUrl: string; // watermarked
  transcriptId: string;
}

/transcripts/{conversationId}/{recordingId}
{
  recordingId: string;
  text: string;
  summary: string;
  wordCount: number;
  processedAt: Timestamp;
}

/summaries/{conversationId}/{weekId}
{
  startDate: Timestamp;
  endDate: Timestamp;
  aggregatedSummary: string;
  highlights: string[];
  reelUrl: string;
}

6. System Architecture
Upload → Processing → Parent Delivery Flow

Tutor Uploads Media

Chat UI → messageService.sendMedia() → uploads to Firebase Storage.

Creates /recordings/ entry.

Watermark & Transcription

Cloud Function processRecording triggered on Storage upload.

FFmpeg (Node wrapper) adds “TutorAI” overlay.

File saved to /recordings/{id}/processedUrl.

Invokes transcribeRecording → OpenAI Whisper → saves transcript.

Daily Summarization

Cloud Function afterTranscript summarizer agent (e.g., GPT-4 Turbo) → stores daily digest under /summaries/daily.

Weekly Aggregation

Scheduled Function (Sunday 6 PM): aggregates daily digests for each conversation → compiles one weekly summary.

Uses text-to-video (optional) template generator to render “Weekly Progress Reel”.

Parent Delivery

Push notification → “New Weekly Progress Reel available.”

Overview page updates with new reel card.

7. User Interface Requirements
Tutor View

Chat Composer:

“Attach” → “Record Video” / “Record Audio”

Upload progress bar (retry on fail)

Lecture Confirmation Modal:

Title input (optional)

Confirmation before send

Parent View

Tabs within Chat:

“Messages” | “Recordings” | “Schedule”

Recordings Tab:

Grid/List of videos with thumbnails, duration, upload date

“View Transcript” → opens transcript viewer

“Weekly Summary” button (links to overview reel)

Overview Page:

Carousel card “This Week’s Learning Highlights” (thumbnail + topics summary)

8. AI Workflow
Step	AI Component	Model / API	Output
1	Transcription	OpenAI Whisper (Cloud Function)	Full text transcript
2	Summarization	GPT-4 Turbo / Claude	1-paragraph summary per recording
3	Aggregation	LangChain summarizer pipeline	1-page weekly digest
4	Reel Composition	LumaLabs API / FFmpeg overlay templates	Branded “Progress Reel” MP4
5	Delivery	Firebase Cloud Messaging	Push + overview update
9. Non-Functional Requirements
Category	Requirement
Performance	Process + transcript ready within 90 s for ≤100 MB file.
Scalability	Up to 100 concurrent uploads without slowdown.
Security	Storage rules restrict access to participants only.
Compliance	COPPA/FERPA-safe; student voices transcribed but never publicly shared.
Reliability	99% success on weekly summary generation.
Storage Limits	30-day retention for original recordings; summaries persist indefinitely.
10. Testing Scenarios

Upload 3 videos under 50 MB → all transcribe successfully.

App restart mid-upload → upload resumes from checkpoint.

Parent opens “Recordings” tab → sees only media messages.

Verify watermark on playback.

Weekly aggregation triggers Sunday → new reel appears in Overview.

Tutor deletes a recording → transcript and summary auto-delete.

11. Risks & Mitigations
Risk	Mitigation
Long upload times on weak connections	Chunked uploads + compression before send
Whisper API delays	Queue tasks asynchronously via Cloud Tasks
Storage cost increase	Auto-delete raw recordings after 30 days
Privacy concerns	Watermark ensures authenticity; access scoped to participants
Failure to generate reel	Fallback to text-only weekly summary card
12. Future Enhancements (Post-MVP)

Searchable transcript index (“Find all mentions of algebra”)

Automatic highlight clip extraction (AI detects key teaching moments)

Tutor voice cloning → summary voiceover for reels

Integration with “Challenge Creation” (auto-generate quiz from transcript)

13. Acceptance Criteria

✅ Tutors can record/upload media directly from chat.
✅ Recordings are auto-watermarked “TutorAI”.
✅ Transcripts + summaries appear within 2 min.
✅ Parents can view recordings under “Recordings” tab.
✅ Weekly summary reels are auto-generated and visible in Overview by Sunday evening.