import { PolicyPage } from '@/components/PolicyPage';

export default function TermsPage() {
  return <PolicyPage title="Terms" intro="Use Yorai to ask, share, and add context respectfully. Do not use the platform to attack people, manipulate students, or spread unsafe information." sections={[
    { title: 'Student-generated context', body: 'Threads, experiences, replies, and what-works insights are student-generated and may be self-declared, community confirmed, or outdated. They are not official college endorsements.' },
    { title: 'Moderation rights', body: 'Yorai may hide, restrict, review, or remove content that exposes private data, harasses people, manipulates students, or creates safety risks.' },
    { title: 'Account restrictions', body: 'Accounts may receive warnings, temporary restrictions, or suspension when behavior harms students, privacy, or platform integrity.' },
  ]} />;
}
