import { PolicyPage } from '@/components/PolicyPage';

export default function PrivacyPage() {
  return <PolicyPage title="Privacy" intro="Yorai is designed around privacy-first student context. Public sharing should avoid personal identifiers and private documents." sections={[
    { title: 'Public identity', body: 'Yorai shows contextual labels such as role, branch, year, or alumni batch when users choose to share them. Email addresses and private account details are not shown publicly.' },
    { title: 'Context attachments', body: 'Images and screenshots default to moderator-only review. Users are expected to remove names, faces, roll numbers, phone numbers, QR codes, signatures, and private chat identities before sharing.' },
    { title: 'Retention', body: 'Some moderation, security, reports, and audit records may be retained for safety and abuse prevention. Data should not be retained indefinitely without a defined operational reason.' },
  ]} />;
}
