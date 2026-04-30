function navClass(active) {
  return [
    'focus-ring inline-flex h-10 items-center border-b-2 px-2 text-sm font-semibold',
    active ? 'border-accent text-accent' : 'border-transparent text-slate-600 hover:text-ink'
  ].join(' ');
}

export default function Layout({ activePage, children }) {
  return (
    <div className="min-h-screen bg-[#eef3f8]">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <a href="#/" className="focus-ring rounded-sm text-xl font-bold tracking-normal text-ink">
            MSME Underwriting
          </a>
          <nav className="flex items-center gap-5">
            <a className={navClass(activePage === 'dashboard')} href="#/">
              Dashboard
            </a>
            <a className={navClass(activePage === 'new')} href="#/new">
              New Assessment
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
