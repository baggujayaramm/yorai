import { PolicyPage } from '@/components/PolicyPage';

export default function DataCorrectionPolicyPage() {
  return <PolicyPage title="Data Correction Policy" intro="Yorai supports factual college metadata corrections without giving institutions control over student-generated context." sections={[
    { title: 'What can be corrected', body: 'Official name, official website, address, institution type, accreditation, contact information, and established year may be submitted for review with source links.' },
    { title: 'Review before change', body: 'Correction requests create review records and audit history. They do not overwrite approved data automatically.' },
    { title: 'What cannot be corrected here', body: 'Representatives cannot edit student threads, experiences, what-works insights, reports, or moderation notes through this process.' },
  ]} />;
}
