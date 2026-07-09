# Yorai - Codex Build Prompt

## How to Use This File

Paste the main prompt below into Codex as the first task.

Recommended flow:

1. Create a new Git repository.
2. Add this file as `docs/yorai-product-brief.md`.
3. In Codex, run `/init` if available to generate project instructions such as `AGENTS.md`.
4. Paste the main prompt below.
5. Ask Codex to implement the MVP in small milestones.

---

# Main Prompt for Codex

Build an MVP web application called **Yorai**.

## Product Vision

Yorai is a student-first network that starts by helping aspirants understand colleges through real student discussions, then grows into a cross-institution student network for collaboration, hackathons, events, projects, clubs, and opportunities.

The product should not feel like a complaint portal or a fear-based review site.

It should feel like:

- A calm student guidance platform
- A real discussion space
- A cross-college networking layer
- A future home for events, hackathons, communities, and collaboration

## Brand

Name: **Yorai**

Working tagline:

> Know through students. Connect beyond colleges. Build together.

Alternative homepage line:

> A student network for real college insight, collaboration, and opportunities.

## Core Mission

Help students make better college decisions and build meaningful connections across institutions.

The platform should help users discover:

- What a college is actually like right now
- What works in practice, not just on paper
- What current students and alumni say
- Which claims are confirmed, mixed, outdated, or branch-specific
- How students can connect across colleges for events, hackathons, clubs, and projects

## Product Principles

1. Clarity over fear
2. Discussion over ratings
3. Context over broad judgment
4. Recent student insight over old reputation
5. Proof and community confirmation over blind claims
6. Privacy-first proof sharing
7. Respectful language only
8. Helpful advice over emotional ranting
9. Student networking beyond college boundaries
10. Build a foundation that can later support events, hackathons, and collaboration

## MVP Goal

Build the first usable version of Yorai that proves this core question:

> Can aspirants ask useful questions and get recent, respectful, student-confirmed answers about colleges?

Do not build rankings or star ratings in the MVP.

## User Types

### Aspirant

A student trying to choose a college.

Can:

- Search colleges
- Ask questions
- Read student experiences
- Save/follow colleges
- View what actually works
- View claim validation summaries

### Current Student

A student currently studying in a college.

Can:

- Answer questions
- Share experience posts
- Add context: branch, year, batch, hostel/day scholar
- Confirm or challenge other posts
- Attach optional proof
- Suggest what actually works

### Alumni

Former student.

Can:

- Share experience
- Answer questions
- Discuss long-term outcomes
- Mention if information may be outdated

### Moderator

Can:

- Review reports
- Hide/remove abusive content
- Review proof uploads
- Mark posts as disputed/outdated
- Redact private data
- Manage users and colleges

### College Representative - Future Role

Not needed for MVP, but design should allow it later.

Can eventually:

- Respond officially to claims
- Share updates
- Correct outdated information

Cannot:

- Delete student posts directly
- Control student discussion

## Suggested Tech Stack

Use a clean modern stack:

- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Auth.js / NextAuth or equivalent authentication
- S3-compatible file storage or local placeholder storage for proof uploads
- Server-side validation
- Basic role-based access control

If a different stack is already configured in the repo, adapt to it instead of rebuilding everything unnecessarily.

## Core Pages

### 1. Home Page

Search-first layout.

Hero:

> Yorai  
> Know through students. Connect beyond colleges. Build together.

Subtext:

> Ask current students, read real experiences, and understand what actually works before choosing your college.

Primary CTA:

> Search Colleges

Secondary CTA:

> Ask Students

Include:

- Search bar for college name, city, state, branch
- Popular search chips
- Explanation cards:
  - Real student discussions
  - Community-confirmed experiences
  - What actually works
  - Cross-college connections, coming later

### 2. College Search Page

Users can search/filter by:

- College name
- City
- State
- Branch/course
- Affiliation/university

Show college cards with:

- Name
- Location
- Courses/branches
- Number of discussions
- Number of experiences
- Recent activity status

### 3. College Profile Page

This is the main product page.

Header:

- College name
- City/state
- Affiliation/university
- Official website
- Follow button
- Ask Students button
- Share Experience button

Tabs:

- Overview
- Discussions
- Experiences
- Claims vs Reality
- What Actually Works
- Placements
- Photos / Proof

### 4. Overview Tab

Show:

- Basic college info
- Courses/branches
- Fee range if available
- Admission mode if available
- Recent activity
- Insight cards

Insight cards should not be star ratings.

Examples:

- Student experiences
- Answered questions
- Proof-backed posts
- Recent student activity
- Mixed reports
- Needs more responses

### 5. Discussions Tab

Aspirants can ask questions.

Question categories:

- Faculty
- Placements
- Labs and resources
- Hostel
- Campus life
- Safety
- Attendance
- Exams
- Clubs
- Management
- Branch-specific
- Events and networking

Question card should show:

- Title
- Category
- Branch if any
- Number of answers
- Last activity
- Asked by aspirant/current student/alumni

### 6. Question Detail Page

Show:

- Question
- College context
- Branch context
- Answers
- Answer form

Answer should include:

- Body
- User type
- Branch/year/batch context
- Current student/alumni label
- Community confirmation summary
- Report button

### 7. Experiences Tab

Instead of normal reviews, use structured experience posts.

Each experience post should include:

- Title
- Student context
- What worked
- What did not work
- Advice
- Recent changes
- Branch/year/batch
- Proof status
- Community confirmation
- Report button

Do not use star ratings.

### 8. Claims vs Reality Tab

Show official/common claims compared with student-reported reality.

Example:

Official/common claim:

> Advanced labs available for all students.

Student reality:

> Students report that labs are available during scheduled sessions, but extra practice access may require faculty permission.

Status labels:

- Confirmed by students
- Mixed reports
- Branch-specific
- Recently changed
- Needs more responses
- Disputed
- Outdated

### 9. What Actually Works Tab

This is a key differentiator.

Students can add practical advice:

- Active clubs
- Useful labs
- Helpful seniors
- Useful faculty support
- Internship paths
- Placement preparation
- Events worth attending
- Hackathons worth joining
- First-year survival advice
- What students should not blindly depend on

This should feel positive and useful, not complaint-focused.

### 10. Placements Tab

Show placement discussion with context.

Include:

- Branch-wise placement experiences
- Training quality
- Internship support
- Student-reported outcomes
- Official claims vs student context
- Recent changes

Avoid making official claims unless data is verified.

### 11. Photos / Proof Tab

Students can upload proof/context safely.

Allowed:

- Campus photos
- Lab photos
- Public notices
- Timetables
- Placement circulars
- Event photos
- Public documents

Privacy rules:

- Blur faces
- Blur names
- Blur roll numbers
- Blur phone numbers
- Blur addresses
- Blur QR codes/barcodes
- Blur signatures
- Do not upload private chats without hiding identities
- Do not expose ID cards publicly

Proof visibility options:

- Public
- Moderator-only
- Summary-only

Example display:

> Proof checked by moderators: official lab timetable uploaded. Personal details hidden.

## Community Confirmation

Every experience post and answer should have validation buttons.

Prompt:

> Does this match your experience?

Options:

- Matches my experience
- Partially true
- Not true for my branch
- Changed recently
- Needs more context
- I disagree
- I can add proof

Show summary:

> Mostly confirmed by CSE students from 2024-2026 batches. Some disagreement from ECE students. Last confirmed 12 days ago.

## Trust / Verification System

Do not make verification mandatory.

Use trust levels:

### Level 1: Open Contributor

Anyone can post.

Label:

> Unverified experience

### Level 2: Context Added

User added branch/year/batch context.

Label:

> Context added

### Level 3: Community Confirmed

Posts are confirmed by other students.

Label:

> Community confirmed

### Level 4: Soft Verified Student

Privately verified using:

- College email
- Student ID with personal info hidden
- Fee receipt with personal info hidden
- Hall ticket with personal info hidden
- College portal screenshot
- Official student group proof
- LinkedIn profile

Public labels:

> Confirmed current student  
> Confirmed alumni

### Level 5: Trusted Contributor

Earned through useful answers, confirmations, low report rate, and consistent activity.

## Moderation Rules

The product must include basic moderation from MVP.

Not allowed:

- Foul language
- Hate speech
- Caste/religion/gender abuse
- Threats
- Doxxing
- Personal attacks
- Private documents with exposed data
- Unsupported fraud/corruption accusations
- Naming individual faculty/students for personal attacks
- Spam
- Fake promotional reviews
- Admission-agent manipulation
- College-management manipulation

Allowed:

- Respectful criticism
- Personal experience
- Branch-specific problems
- Recent changes
- Proof-backed claims
- Practical advice

Safer wording examples:

Allowed:

> In my batch, lab access was limited outside scheduled hours.

Not allowed:

> This college is a scam.

Allowed:

> Placement support seemed stronger for CSE than other branches in my year.

Not allowed:

> Placement numbers are fake.

Better alternative:

> Official placement claims and student-reported experiences appear different. More verification is needed.

## Report System

Each post, answer, question, and proof attachment should have a report button.

Report reasons:

- Foul language
- Personal attack
- Fake review
- Outdated information
- Privacy issue
- Unsupported serious allegation
- Spam/promotion
- Hate/harassment
- Incorrect college/branch
- Other

Moderator actions:

- Hide post
- Remove attachment
- Mark as disputed
- Mark as outdated
- Ask for more context
- Redact private information
- Ban repeat offenders

## Data Models

Create database models similar to the following.

### User

- id
- name
- email
- anonymousDisplayName
- role: ASPIRANT, CURRENT_STUDENT, ALUMNI, MODERATOR, COLLEGE_REP
- verificationLevel
- collegeId optional
- branch optional
- batch optional
- year optional
- trustScore
- createdAt
- updatedAt

### College

- id
- name
- slug
- city
- state
- country
- officialWebsite
- affiliation
- courses
- feeRange
- admissionModes
- createdAt
- updatedAt

### Question

- id
- collegeId
- userId
- title
- body
- category
- branch optional
- status: OPEN, ANSWERED, CLOSED, FLAGGED
- createdAt
- updatedAt

### Answer

- id
- questionId
- collegeId
- userId
- body
- branchContext
- batchContext
- studentTypeContext
- moderationStatus
- createdAt
- updatedAt

### ExperiencePost

- id
- collegeId
- userId
- title
- body
- category
- branch
- batch
- whatWorked
- whatDidNotWork
- advice
- recentChanges
- proofStatus
- moderationStatus
- createdAt
- updatedAt

### ClaimReality

- id
- collegeId
- claim
- studentReality
- category
- status: CONFIRMED, MIXED, BRANCH_SPECIFIC, RECENTLY_CHANGED, NEEDS_MORE_RESPONSES, DISPUTED, OUTDATED
- createdAt
- updatedAt

### WhatWorksPost

- id
- collegeId
- userId
- title
- body
- category
- branch optional
- createdAt
- updatedAt

### Validation

- id
- targetType: ANSWER, EXPERIENCE_POST, CLAIM_REALITY, WHAT_WORKS_POST
- targetId
- userId
- validationType:
  - MATCHES_MY_EXPERIENCE
  - PARTIALLY_TRUE
  - NOT_TRUE_FOR_MY_BRANCH
  - CHANGED_RECENTLY
  - NEEDS_CONTEXT
  - DISAGREE
  - CAN_ADD_PROOF
- optionalComment
- createdAt

### ProofAttachment

- id
- targetType
- targetId
- userId
- fileUrl
- fileType
- visibility: PUBLIC, MODERATOR_ONLY, SUMMARY_ONLY
- moderationStatus
- privacyChecked
- createdAt

### Report

- id
- targetType
- targetId
- reporterUserId
- reason
- details
- status: PENDING, REVIEWED, ACTIONED, REJECTED
- moderatorNotes
- createdAt

### FollowedCollege

- id
- userId
- collegeId
- createdAt

## Reusable Frontend Components

Create clean reusable components:

- AppHeader
- AppFooter
- SearchBar
- CollegeCard
- CollegeProfileHeader
- CollegeTabs
- InsightCards
- QuestionCard
- AnswerCard
- ExperienceCard
- ClaimRealityCard
- WhatWorksCard
- ValidationButtons
- TrustBadge
- ProofBadge
- ReportButton
- FilterSidebar
- EmptyState
- ModeratorQueueItem

## UI Style

The UI should be:

- Clean
- Calm
- Modern
- Student-first
- Trustworthy
- Lightweight
- Card-based
- Discussion-focused

Avoid aggressive/fear-based copy.

Avoid:

- Worst college
- Scam college
- Exposed
- Fake college
- Blacklist

Prefer:

- Mixed student feedback
- Needs more context
- Branch-specific concern
- Recent change reported
- Students suggest checking this before joining
- Useful for some students, not ideal for others

## Seed Data

Create a small seed dataset with:

- 3 colleges
- 5 users
- 5 questions
- 8 answers
- 6 experience posts
- 4 claims vs reality
- 5 what actually works posts
- several validations

Use realistic but fictional college names to avoid legal issues in seed data.

## Implementation Milestones

### Milestone 1: Project setup

- Initialize app
- Configure TypeScript
- Configure Tailwind
- Configure database/Prisma
- Add basic layout
- Add seed data

### Milestone 2: Public browsing

- Home page
- College search page
- College profile page
- Tabs
- College cards
- Insight cards

### Milestone 3: Discussions

- Ask question
- Question list
- Question detail
- Add answer
- Answer cards

### Milestone 4: Experiences

- Create experience post
- Show experience cards
- Add filters
- Add community validation buttons

### Milestone 5: Claims and What Works

- Claims vs Reality tab
- What Actually Works tab
- Add create flows

### Milestone 6: Reporting and moderation

- Report button
- Report model
- Moderator dashboard
- Basic action buttons

### Milestone 7: Proof upload placeholder

- Add proof upload UI
- Add privacy warnings
- Add proof status labels
- Allow local placeholder or mocked upload if storage is not configured

## Important Build Rules

1. Keep the MVP simple.
2. Avoid ratings and rankings.
3. Use fictional seed data.
4. Make moderation visible from the start.
5. Make trust/context badges clear.
6. Make branch/year/batch context visible.
7. Prioritize useful discussions over flashy UI.
8. Do not overengineer events/hackathons yet.
9. Add navigation placeholders for future networking/events.
10. Make the code readable and easy to extend.

## Future Features - Do Not Fully Build Yet

Add placeholders only:

- Inter-college events
- Hackathon discovery
- Project collaboration
- Student clubs
- Cross-college communities
- College representative responses
- Student portfolios
- Opportunity board
- Mentorship
- AI-assisted college comparison

## Acceptance Criteria

The MVP is successful if:

- A user can search colleges
- A user can open a college page
- A user can ask a question
- A student can answer
- A student can share an experience
- Other students can validate the experience
- A user can view claims vs reality
- A user can view what actually works
- Users can report bad content
- A moderator can review reports
- The UI feels calm, helpful, and student-first

## Start Now

First inspect the existing repository.

If it is empty, create the app from scratch using the recommended stack.

If it already has a stack, adapt to the existing structure.

Then implement Milestone 1 and Milestone 2 first, with clean commits or clear summaries after each major step.

Do not ask for unnecessary confirmation. Make reasonable implementation choices and document them.
