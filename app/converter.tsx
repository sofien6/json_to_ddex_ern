"use client";

import { useRef, useState } from "react";
import { convertToDdex, ERN_VERSION, SAMPLE_INPUT, type Issue } from "@/lib/ddex";

const SAMPLE_JSON = JSON.stringify(SAMPLE_INPUT, null, 2);

const buttonClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800";

export default function Converter() {
  const [json, setJson] = useState(SAMPLE_JSON);
  const [xml, setXml] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function convert() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      setXml(null);
      setIssues([{ path: "$", message: `Invalid JSON: ${(e as Error).message}`, severity: "error" }]);
      return;
    }
    const result = convertToDdex(parsed);
    setXml(result.xml);
    setIssues(result.issues);
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;
    setJson(await file.text());
    setXml(null);
    setIssues([]);
  }

  async function copy() {
    if (!xml) return;
    await navigator.clipboard.writeText(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    if (!xml) return;
    let name = "release";
    try {
      name = JSON.parse(json).release.upc ?? name;
    } catch {}
    const url = URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${name}.xml` });
    a.click();
    URL.revokeObjectURL(url);
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-sm font-semibold uppercase tracking-wide text-zinc-500">JSON input</h2>
            <button className={buttonClass} onClick={() => setJson(SAMPLE_JSON)}>
              Load sample
            </button>
            <button className={buttonClass} onClick={() => fileInput.current?.click()}>
              Upload .json
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                loadFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            spellCheck={false}
            className="h-[60vh] w-full resize-y rounded-lg border border-zinc-300 bg-white p-3 font-mono text-xs leading-5 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </section>

        <section className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-sm font-semibold uppercase tracking-wide text-zinc-500">
              DDEX ERN {ERN_VERSION} output
            </h2>
            <button className={buttonClass} onClick={copy} disabled={!xml}>
              {copied ? "Copied" : "Copy"}
            </button>
            <button className={buttonClass} onClick={download} disabled={!xml}>
              Download .xml
            </button>
          </div>
          <pre className="h-[60vh] overflow-auto rounded-lg border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs leading-5 dark:border-zinc-700 dark:bg-zinc-900">
            {xml ?? (
              <span className="text-zinc-400">
                {errors.length ? "Fix the errors below to generate XML." : "Click Convert to generate the XML."}
              </span>
            )}
          </pre>
        </section>
      </div>

      <div>
        <button
          onClick={convert}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Convert to DDEX
        </button>
      </div>

      {issues.length > 0 && (
        <section className="flex flex-col gap-3">
          <IssueList title={`Errors (${errors.length})`} issues={errors} tone="error" />
          <IssueList title={`Warnings (${warnings.length})`} issues={warnings} tone="warning" />
        </section>
      )}
    </div>
  );
}

function IssueList({ title, issues, tone }: { title: string; issues: Issue[]; tone: "error" | "warning" }) {
  if (issues.length === 0) return null;
  const color =
    tone === "error"
      ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
  return (
    <div className={`rounded-lg border p-3 text-sm ${color}`}>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <ul className="flex flex-col gap-0.5">
        {issues.map((i, n) => (
          <li key={n}>
            <code className="font-mono text-xs">{i.path}</code> {i.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
