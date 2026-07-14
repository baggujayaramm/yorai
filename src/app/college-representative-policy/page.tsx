import { PolicyPage } from '@/components/PolicyPage';

export default function CollegeRepresentativePolicyPage() {
  return <PolicyPage title="College Representative Policy" intro="College representative access exists to improve factual metadata while preserving student discussion independence." sections={[
    { title: 'Approval required', body: 'Representative access requires admin review. Yorai does not grant authority automatically based on email domain.' },
    { title: 'Allowed actions', body: 'Approved representatives may request factual metadata corrections, submit official source references, and view request status.' },
    { title: 'Protected student independence', body: 'Representatives may not remove student experiences, edit discussions, suppress criticism, access reporter identities, access moderator notes, or influence ordering.' },
  ]} />;
}
