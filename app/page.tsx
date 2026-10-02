import Converter from "./converter";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-10 font-sans sm:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">JSON → DDEX ERN</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Convert release metadata JSON into a DDEX ERN 4.3 NewReleaseMessage for music distribution. Also
          available as an API: <code className="font-mono">POST /api/convert</code>.
        </p>
      </header>
      <Converter />
    </main>
  );
}
