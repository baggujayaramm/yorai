const tabs = [
  { label: 'Overview', href: '#overview' },
  { label: 'Ask Students', href: '#ask-students' },
  { label: 'Live Threads', href: '#live-threads' },
  { label: 'Student Experiences', href: '#student-experiences' },
  { label: 'What Actually Works', href: '#what-actually-works' },
  { label: 'Student Paths', href: '#student-paths' },
  { label: 'Opportunities', href: '#opportunities' },
];

export function CollegeTabs() {
  return (
    <div className="border-b border-white/45 bg-surface/58 backdrop-blur-2xl dark:border-white/10">
      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 sm:px-6">
        {tabs.map((tab, index) => (
          <a
            className={`whitespace-nowrap border-b-2 px-3 py-4 text-sm font-semibold transition ${
              index === 0 ? 'border-sun text-iris' : 'border-transparent text-ink/55 hover:border-sun/40 hover:text-iris'
            }`}
            href={tab.href}
            key={tab.label}
          >
            {tab.label}
          </a>
        ))}
      </div>
    </div>
  );
}
