# Contribution Workflows

Yorai v1.5.0 keeps contributions discussion-first and privacy-aware. Authenticated users can create live threads, replies, student experiences, what-actually-works insights, and community context confirmations.

## Content Quality

All contribution APIs reject empty or extremely short content, unsafe markup, excessive repeated characters, excessive links, likely duplicate recent submissions, and accidental private-information patterns such as phone numbers, emails, roll numbers, registration numbers, and addresses.

Validation is gentle and explicit: Yorai returns a clear message instead of silently dropping content.

## Threads and Replies

Threads start as `OPEN`. Authors can mark threads answered or close them; moderators can close or archive threads. Closed and archived threads remain readable, but new replies are rejected server-side.

Replies support authenticated posting, editing by the author, and soft removal by the author or a moderator. Removed replies preserve thread structure.

## Experiences and What Works

Student experiences and what-works insights are database-backed. Experiences must be framed as personal lived context, not general accusations. What-works insights use practical categories such as academics, placements, internships, clubs, projects, hostel, commuting, and administration.

## Drafts

Thread, experience, and insight forms preserve local drafts during typing and clear drafts after successful submission. Drafts stay in the browser and should not include sensitive information.

## Permissions

Server-side authorization enforces ownership:

- authors can edit or remove their own content
- moderators can remove unsafe replies and content
- closed threads reject new replies
- anonymous users cannot write

No ratings, rankings, likes, follower counts, reputation scores, DMs, or popularity mechanics are part of this workflow.
