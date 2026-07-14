import { PolicyPage } from '@/components/PolicyPage';

export default function ContentPolicyPage() {
  return <PolicyPage title="Content Policy" intro="Yorai allows respectful student experience and branch-specific context. It does not allow fake/spam content, private data leaks, or unsupported serious allegations." sections={[
    { title: 'Allowed context', body: 'Lived student experiences, practical advice, fresh replies, branch-specific updates, and source-backed factual corrections are welcome.' },
    { title: 'Restricted content', body: 'Do not post private data, identity documents, visible private chats, doxxing, harassment, spam, admissions manipulation, or unsupported serious allegations.' },
    { title: 'Official versus student context', body: 'Official institutional information is reviewed separately from student-generated discussion. Verification of college metadata does not verify or approve student opinions.' },
  ]} />;
}
