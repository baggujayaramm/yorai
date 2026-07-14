import { PolicyPage } from '@/components/PolicyPage';

export default function GrievancePage() {
  return <PolicyPage title="Grievance" intro="Users can raise concerns about privacy, harmful content, moderation decisions, or unsafe student information." sections={[
    { title: 'What to include', body: 'Share the content link, concern type, and useful context. Do not include private data unless it is necessary for review and already redacted.' },
    { title: 'Review process', body: 'Yorai reviews reports and grievances for privacy, safety, accuracy, and fairness. Reporter identity is not shown publicly.' },
    { title: 'Contact', body: 'For launch-stage support, contact support@yorai.com. Response-time commitments require operational review before public launch.' },
  ]} />;
}
