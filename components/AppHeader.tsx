export default function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/dwerk-logo.jpg" alt="dWERK" className="h-7 w-auto" />
      </div>
    </header>
  );
}
