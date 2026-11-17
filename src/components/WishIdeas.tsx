"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { ideasForLocale, type IdeaCategory } from "@/i18n/ideas";

/** Same ceiling as the strictest API route (draw participants). */
export const MAX_EDITOR_WISHES = 30;

/**
 * Collapsible "no idea what to ask for?" block in the wish editor. Renders nothing for a
 * locale without curated ideas. Adding an idea only changes the editor state in the browser.
 */
export function WishIdeas({
  existingTitles,
  full,
  onAdd,
}: {
  existingTitles: string[];
  full: boolean;
  onAdd: (title: string) => void;
}) {
  const { locale, t } = useI18n();
  const groups = useMemo(() => ideasForLocale(locale), [locale]);
  const [category, setCategory] = useState<IdeaCategory | null>(null);
  const [announcement, setAnnouncement] = useState("");
  if (groups.length === 0) return null;

  const active = groups.find((group) => group.category === category) ?? groups[0];
  const taken = new Set(existingTitles.map((title) => title.trim().toLowerCase()));

  return (
    <details className="wish-ideas">
      <summary>{t("ideas.summary")}</summary>
      <p className="hint">{t("ideas.intro")}</p>
      <div role="group" aria-label={t("ideas.categoryLabel")} className="idea-categories">
        {groups.map((group) => (
          <button
            key={group.category}
            type="button"
            className="idea-category"
            aria-pressed={group.category === active.category}
            onClick={() => setCategory(group.category)}
          >
            {t(`ideas.category.${group.category}`)}
          </button>
        ))}
      </div>
      <ul className="idea-list" aria-label={t(`ideas.category.${active.category}`)}>
        {active.ideas.map((idea) => {
          const added = taken.has(idea.title.trim().toLowerCase());
          return (
            <li key={idea.id}>
              <span>{idea.title}</span>
              {added ? (
                <span className="hint">{t("ideas.added")}</span>
              ) : (
                <button
                  type="button"
                  className="button button-secondary button-small"
                  disabled={full}
                  aria-label={t("ideas.addLabel", { title: idea.title })}
                  onClick={() => {
                    onAdd(idea.title);
                    setAnnouncement(t("ideas.announceAdded", { title: idea.title }));
                  }}
                >
                  {t("ideas.add")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {full ? <p className="hint">{t("ideas.full")}</p> : null}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </details>
  );
}
