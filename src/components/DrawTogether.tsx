"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import type { MessageKey } from "@/i18n/messages";
import { drawAssignments, listPassDrawNames, parsePassDrawNames, PASS_DRAW_MAX_PARTICIPANTS, PASS_DRAW_MIN_PARTICIPANTS } from "@/lib/pass-draw";

/** Milliseconds a step ignores clicks, so a double click cannot skip through the privacy screens. */
const STEP_GUARD_MS = 900;

type Session =
  | { phase: "setup" }
  | { phase: "handoff" | "confirm" | "reveal"; names: string[]; recipients: (string | null)[]; index: number }
  | { phase: "done"; count: number };

/**
 * Draw names on one device by passing it around. The pairing lives only in this component's memory: each person's
 * recipient is erased the moment they have seen it, and nothing is stored, logged or sent anywhere.
 */
export function DrawTogether({ wishlistHref }: { wishlistHref: string }) {
  const { t } = useI18n();
  const [rawNames, setRawNames] = useState("");
  const [error, setError] = useState<{ key: MessageKey; params: Record<string, string | number> } | null>(null);
  const [session, setSession] = useState<Session>({ phase: "setup" });
  // People who must not draw each other (partners, housemates), stored by name as typed.
  const [pairs, setPairs] = useState<Array<[string, string]>>([]);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    return listPassDrawNames(rawNames).filter((name) => {
      const key = name.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawNames]);
  const key = (name: string) => name.toLocaleLowerCase();
  // A pair only counts while both names are still in the list; the choices reset when a name disappears.
  const activePairs = pairs.filter(([a, b]) => candidates.some((n) => key(n) === key(a)) && candidates.some((n) => key(n) === key(b)));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  const stepKey = session.phase === "setup" || session.phase === "done" ? session.phase : `${session.phase}-${session.index}`;
  const [readyKey, setReadyKey] = useState("");
  const ready = readyKey === stepKey;

  useEffect(() => {
    const timer = window.setTimeout(() => setReadyKey(stepKey), STEP_GUARD_MS);
    return () => window.clearTimeout(timer);
  }, [stepKey]);

  // Every step opens on its own heading, so keyboard and screen-reader users land on the new screen.
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    headingRef.current?.focus();
  }, [stepKey]);

  const start = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parsePassDrawNames(rawNames);
    if (!parsed.ok) {
      setError({ key: `together.error.${parsed.error}` as MessageKey, params: parsed.params });
      return;
    }
    const indexOf = (name: string) => parsed.names.findIndex((candidate) => key(candidate) === key(name));
    const assignment = drawAssignments(parsed.names.length, {
      exclusions: activePairs.map(([a, b]) => [indexOf(a), indexOf(b)] as const),
    });
    if (!assignment) { setError({ key: "together.error.impossible", params: {} }); return; }
    setError(null);
    setSession({
      phase: "handoff",
      names: parsed.names,
      recipients: assignment.map((recipientIndex) => parsed.names[recipientIndex]),
      index: 0,
    });
  };

  const addPair = () => {
    const a = candidates.find((name) => key(name) === key(first));
    const b = candidates.find((name) => key(name) === key(second));
    if (!a || !b || key(a) === key(b)) { setError({ key: "together.error.pairIncomplete", params: {} }); return; }
    setError(null);
    if (!activePairs.some(([x, y]) => (key(x) === key(a) && key(y) === key(b)) || (key(x) === key(b) && key(y) === key(a)))) {
      setPairs([...activePairs, [a, b]]);
    }
    setFirst(""); setSecond("");
  };
  const removePair = (position: number) => setPairs(activePairs.filter((_, index) => index !== position));

  const restart = () => { setSession({ phase: "setup" }); setError(null); };

  if (session.phase === "setup") {
    return (
      <form className="tool-card together-card" onSubmit={start} noValidate>
        <h2 ref={headingRef} tabIndex={-1} className="together-heading">{t("together.setup.title")}</h2>
        <div className="field">
          <label className="field-label" htmlFor="together-names">{t("together.setup.namesLabel")}</label>
          <textarea
            id="together-names"
            rows={7}
            value={rawNames}
            onChange={(event) => setRawNames(event.target.value)}
            placeholder={t("together.setup.namesPlaceholder")}
            aria-describedby={error ? "together-names-hint together-names-error" : "together-names-hint"}
            aria-invalid={error ? true : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <small id="together-names-hint" className="muted">{t("together.setup.namesHint", { min: PASS_DRAW_MIN_PARTICIPANTS, max: PASS_DRAW_MAX_PARTICIPANTS })}</small>
        </div>
        {candidates.length >= PASS_DRAW_MIN_PARTICIPANTS ? (
          <fieldset className="together-exclusions">
            <legend>{t("together.exclusions.title")}</legend>
            <p className="muted">{t("together.exclusions.hint")}</p>
            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="together-first">{t("together.exclusions.first")}</label>
                <select id="together-first" value={first} onChange={(event) => setFirst(event.target.value)}>
                  <option value="">{t("together.exclusions.choose")}</option>
                  {candidates.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="together-second">{t("together.exclusions.second")}</label>
                <select id="together-second" value={second} onChange={(event) => setSecond(event.target.value)}>
                  <option value="">{t("together.exclusions.choose")}</option>
                  {candidates.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>
            <button className="button button-secondary button-small" type="button" onClick={addPair}>{t("together.exclusions.add")}</button>
            {activePairs.length > 0 ? (
              <ul className="together-pairs">
                {activePairs.map(([a, b], position) => (
                  <li key={`${a}|${b}`}>
                    <span>{t("together.exclusions.pair", { a, b })}</span>
                    <button className="button button-secondary button-small" type="button" onClick={() => removePair(position)} aria-label={t("together.exclusions.removeLabel", { a, b })}>
                      {t("together.exclusions.remove")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </fieldset>
        ) : null}
        <div id="together-names-error" role="alert">
          {error ? <p className="notice error"><strong>{t(error.key, error.params)}</strong></p> : null}
        </div>
        <div className="notice"><p>{t("together.setup.privacy")}</p></div>
        <div className="button-row"><button className="button button-brick" type="submit">{t("together.setup.start")}</button></div>
      </form>
    );
  }

  if (session.phase === "done") {
    return (
      <section className="tool-card together-card together-done" aria-labelledby="together-done-title">
        <div className="seal" aria-hidden="true">✓</div>
        <h2 id="together-done-title" ref={headingRef} tabIndex={-1} className="together-heading">{t("together.done.title")}</h2>
        <p>{t("together.done.body", { count: session.count })}</p>
        <div className="button-row together-actions">
          <Link className="button button-brick" href={wishlistHref}>{t("together.done.wishlist")}</Link>
          <button className="button button-secondary" type="button" onClick={restart}>{t("together.done.again")}</button>
        </div>
      </section>
    );
  }

  const { names, recipients, index } = session;
  const name = names[index];
  const progress = <p className="eyebrow together-progress">{t("together.progress", { current: index + 1, total: names.length })}</p>;

  if (session.phase === "handoff") {
    return (
      <section className="tool-card together-card" aria-labelledby="together-step-title">
        {progress}
        <h2 id="together-step-title" ref={headingRef} tabIndex={-1} className="together-heading">{t("together.handoff.title", { name })}</h2>
        <p>{t("together.handoff.body", { name })}</p>
        <div className="button-row together-actions">
          <button className="button button-brick" type="button" disabled={!ready} onClick={() => setSession({ ...session, phase: "confirm" })}>
            {t("together.handoff.ready", { name })}
          </button>
          {index === 0 ? <button className="button button-secondary" type="button" onClick={restart}>{t("together.handoff.stop")}</button> : null}
        </div>
      </section>
    );
  }

  if (session.phase === "confirm") {
    return (
      <section className="tool-card together-card" aria-labelledby="together-step-title">
        {progress}
        <h2 id="together-step-title" ref={headingRef} tabIndex={-1} className="together-heading">{t("together.confirm.title", { name })}</h2>
        <p>{t("together.confirm.body", { name })}</p>
        <div className="button-row together-actions">
          <button className="button button-brick" type="button" disabled={!ready} onClick={() => setSession({ ...session, phase: "reveal" })}>
            {t("together.confirm.yes", { name })}
          </button>
          <button className="button button-secondary" type="button" onClick={() => setSession({ ...session, phase: "handoff" })}>
            {t("together.confirm.no")}
          </button>
        </div>
      </section>
    );
  }

  // Reveal: the recipient is shown once and removed from memory the moment it is hidden.
  const recipient = recipients[index];
  const hide = () => {
    const erased = recipients.map((value, position) => (position === index ? null : value));
    if (index + 1 < names.length) setSession({ phase: "handoff", names, recipients: erased, index: index + 1 });
    else setSession({ phase: "done", count: names.length });
  };
  return (
    <section className="tool-card together-card reveal-card" aria-labelledby="together-step-title">
      {progress}
      <h2 id="together-step-title" ref={headingRef} tabIndex={-1} className="together-heading">{t("together.reveal.title", { name })}</h2>
      <p>{t("together.reveal.lead")}</p>
      <p className="recipient-name together-recipient">{recipient}</p>
      <div className="notice warning"><p><strong>{t("together.reveal.warning")}</strong></p></div>
      <div className="button-row together-actions">
        <button className="button button-brick" type="button" disabled={!ready} onClick={hide}>{t("together.reveal.hide")}</button>
      </div>
    </section>
  );
}
