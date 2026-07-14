import { PolicyPage } from '@/components/PolicyPage';

export default function CommunityGuidelinesPage() {
  return <PolicyPage title="Community Guidelines" intro="Yorai works best when students share lived experience, practical guidance, and calm disagreement without turning conversations into personal attacks." sections={[
    { title: 'Context over dumping', body: 'Share what happened, when it happened, your branch or role context if helpful, and what future students should understand.' },
    { title: 'Disagreement is useful', body: 'Use community context to say something changed, is branch-specific, or needs a current student update. Do not turn disagreement into personal attacks.' },
    { title: 'No institutional pressure', body: 'College representatives can request factual metadata corrections, but they cannot suppress student experiences or influence discussion ordering.' },
  ]} />;
}
