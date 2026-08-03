"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AGENTS, SAMPLE_QUESTIONS } from "@/lib/agents";
import { ask, type RoutedInfo } from "@/lib/ask";

type Phase = "idle" | "routing" | "answering";

interface Exchange {
  question: string;
  routed?: RoutedInfo;
  answer: string;
  error?: string;
  done: boolean;
}

// minimal, safe markdown-ish rendering: **bold** + line breaks + lists
function renderAnswer(text: string) {
  const html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");
      const isList = lines.every(
        (l) => /^\s*([-*•]|\d+[.)])\s/.test(l.trim()) || !l.trim(),
      );
      if (isList && lines.some((l) => l.trim())) {
        const items = lines
          .filter((l) => l.trim())
          .map((l) => `<li>${l.replace(/^\s*([-*•]|\d+[.)])\s*/, "")}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${block.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
  return { __html: html };
}

export default function Home() {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeAgent =
    exchanges.length > 0 ? exchanges[exchanges.length - 1].routed?.agent : undefined;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [exchanges, phase]);

  const submit = useCallback(
    async (q?: string) => {
      const question = (q ?? input).trim();
      if (!question || phase !== "idle") return;
      setInput("");
      setPhase("routing");
      setExchanges((xs) => [...xs, { question, answer: "", done: false }]);

      const patchLast = (patch: Partial<Exchange>) =>
        setExchanges((xs) => {
          const copy = xs.slice();
          copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
          return copy;
        });

      try {
        await ask(question, {
          onRouting: () => setPhase("routing"),
          onRouted: (info) => {
            setPhase("answering");
            patchLast({ routed: info });
          },
          onToken: (text) =>
            setExchanges((xs) => {
              const copy = xs.slice();
              const last = copy[copy.length - 1];
              copy[copy.length - 1] = { ...last, answer: last.answer + text };
              return copy;
            }),
          onDone: () => {
            patchLast({ done: true });
            setPhase("idle");
          },
          onError: (message) => {
            patchLast({ error: message, done: true });
            setPhase("idle");
          },
        });
      } catch (err) {
        patchLast({
          error: err instanceof Error ? err.message : "Network error",
          done: true,
        });
        setPhase("idle");
      }
    },
    [input, phase],
  );

  return (
    <div className="flex flex-1 flex-col items-center px-4">
      <div className="flex w-full max-w-3xl flex-1 flex-col">
        {/* header */}
        <header className="flex items-center justify-between pb-4 pt-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--green)] text-2xl shadow-sm">
              🌾
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                KisanSathi{" "}
                <span className="font-normal text-[var(--muted)]">किसान साथी</span>
              </h1>
              <p className="text-xs text-[var(--muted)]">
                6 AI experts for every farmer · free & open source · runs on your
                own machine
              </p>
            </div>
          </div>
          <a
            href="https://github.com/rohitguta2432/kisansathi"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            ★ GitHub
          </a>
        </header>

        {/* agent team panel */}
        <section className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-3">
          {AGENTS.map((a) => {
            const active = a.key === activeAgent && phase !== "idle";
            return (
              <div
                key={a.key}
                className={`rounded-xl border bg-[var(--surface)] p-3 transition-all duration-300 ${
                  active
                    ? "-translate-y-0.5 border-[var(--green)] shadow-[0_0_0_3px_var(--green-soft)]"
                    : "border-[var(--line)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{a.emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-tight">
                      {a.name}
                    </p>
                    <p className="truncate text-[11px] text-[var(--muted)]">
                      {a.name_hi}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* conversation */}
        <main className="flex-1 space-y-4 pb-4">
          {exchanges.length === 0 && (
            <div className="rise rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-6 text-center">
              <p className="text-sm font-medium">
                अपना सवाल किसी भी भाषा में पूछें — Ask in any language
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                The right expert picks up your question automatically.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => submit(q)}
                    className="rounded-full border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--ink)] transition hover:border-[var(--green)] hover:bg-[var(--green-soft)]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {exchanges.map((x, i) => (
            <div key={i} className="rise space-y-3">
              {/* farmer bubble */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--green)] px-4 py-2.5 text-[15px] text-white shadow-sm">
                  {x.question}
                </div>
              </div>

              {/* routing / answer */}
              <div className="flex justify-start">
                <div className="min-w-[240px] max-w-[92%] rounded-2xl rounded-bl-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-sm">
                  {!x.routed && !x.error && (
                    <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <span className="flex gap-1">
                        <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
                        <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
                        <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
                      </span>
                      Choosing the right expert…
                    </p>
                  )}
                  {x.routed && (
                    <div className="mb-2 flex items-center gap-2 border-b border-[var(--line)] pb-2">
                      <span className="text-base">{x.routed.emoji}</span>
                      <span className="text-[13px] font-semibold">
                        {x.routed.agent_name}
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">
                        {x.routed.agent_name_hi}
                      </span>
                      <span className="ml-auto rounded-full bg-[var(--amber-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--amber)]">
                        {x.routed.language}
                      </span>
                    </div>
                  )}
                  {x.error ? (
                    <p className="text-sm text-red-700">⚠ {x.error}</p>
                  ) : (
                    <div
                      className="answer-body text-[15px] leading-relaxed"
                      dangerouslySetInnerHTML={renderAnswer(
                        x.answer || (x.routed ? "…" : ""),
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </main>

        {/* composer */}
        <footer className="sticky bottom-0 bg-[var(--bg)] pb-5 pt-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-sm focus-within:border-[var(--green)]"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="सवाल पूछें… e.g. गेहूं कब बोयें?"
              className="flex-1 bg-transparent px-2 text-[15px] outline-none placeholder:text-[var(--muted)]"
              disabled={phase !== "idle"}
            />
            <button
              type="submit"
              disabled={phase !== "idle" || !input.trim()}
              className="rounded-xl bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-40"
            >
              {phase === "idle" ? "पूछें Ask" : "…"}
            </button>
          </form>
          <p className="pt-2 text-center text-[11px] text-[var(--muted)]">
            AI advice can be wrong — confirm critical decisions with your local
            Krishi Vigyan Kendra. MIT licensed, keyless by default.
          </p>
        </footer>
      </div>
    </div>
  );
}
