import { PolicyPage } from '@/components/PolicyPage';

export default function AccountSuspensionPolicyPage() {
  return <PolicyPage title="Account Suspension Policy" intro="Yorai uses warnings and restrictions to protect students, privacy, and useful discussion." sections={[
    { title: 'Reasons', body: 'Harassment, private data leaks, spam, fake promotion, repeated unsafe uploads, unsupported serious allegations, and evasion of moderation may lead to restrictions.' },
    { title: 'Scope', body: 'Restrictions can pause posting, replying, or reporting. Public browsing can remain available unless safety requires a broader action.' },
    { title: 'Appeals', body: 'Appeals should explain context calmly. Moderators preserve respectful lived experience where possible while removing private information and attacks.' },
  ]} />;
}
