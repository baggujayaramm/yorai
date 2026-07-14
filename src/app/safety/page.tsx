import { PolicyPage } from '@/components/PolicyPage';

export default function SafetyPage() {
  return <PolicyPage title="Safety" intro="Safety on Yorai means protecting student identities, reducing harmful content, and keeping conversations useful for aspirants, current students, and alumni." sections={[
    { title: 'Reports', body: 'Users can report privacy issues, harassment, spam, misleading context, unsupported allegations, and unsafe attachments without exposing their identity publicly.' },
    { title: 'Moderation', body: 'Moderators can review reports, attachments, restrictions, appeals, and privacy risks. Final moderation decisions remain human-reviewed in this foundation.' },
    { title: 'Emergency controls', body: 'Admins can pause registration, pause contributions, enable read-only mode, or use maintenance mode during safety or reliability incidents.' },
  ]} />;
}
