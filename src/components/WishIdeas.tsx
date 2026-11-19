"use client";

import { useMemo, useState } from "react";
import { useBolAffiliate } from "@/components/AmazonAffiliate";
import { useI18n } from "@/i18n/I18nProvider";
import { ideasForLocale, type IdeaCategory } from "@/i18n/ideas";

export const MAX_EDITOR_WISHES = 30;
const INITIAL_IDEA_COUNT = 6;

/** Suggestions modify the draft only; nothing leaves the browser. No category is chosen at first so the list stays in view. */
export function WishIdeas({ existingTitles, full, onAdd, onUndo, initialCategory = null }: {
  initialCategory?: IdeaCategory | null;
  existingTitles: string[];
  full: boolean;
  onAdd: (idea: { title: string; url: string }) => void;
  onUndo?: (title: string) => void;
}) {
  const { locale, t } = useI18n();
  const bol = useBolAffiliate();
  const groups = useMemo(() => ideasForLocale(locale), [locale]);
  const [category, setCategory] = useState<IdeaCategory | null>(initialCategory);
  const [showAll, setShowAll] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // Open from the start while the editor is still empty (new list); stay as the visitor left it afterwards.
  const [open, setOpen] = useState(() => existingTitles.every((title) => !title.trim()));
  if (groups.length === 0) return null;

  const active = groups.find((group) => group.category === category);
  const ideas = active?.ideas ?? [];
  const visibleIdeas = showAll ? ideas : ideas.slice(0, INITIAL_IDEA_COUNT);
  const taken = new Set(existingTitles.map((title) => title.trim().toLocaleLowerCase(locale)));
  const add = (title: string, url = "") => {
    onAdd({ title, url });
    setAnnouncement(t("ideas.announceAdded", { title }));
  };

  // Confirmation stays inside the card so it is not lost like a toast; the visitor can take the wish back.
  const addedStatus = (title: string) => (
    <p className="idea-added">
      <span aria-hidden="true">✓ </span>{t("ideas.added")}
      {onUndo && (
        <button type="button" className="idea-undo" aria-label={t("ideas.undoLabel", { title })} onClick={() => onUndo(title)}>
          {t("ideas.undo")}
        </button>
      )}
    </p>
  );

  return (
    <details className="wish-ideas" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{t("ideas.summary")}</summary>
      <p className="idea-intro">{t("ideas.intro")}</p>
      <div role="group" aria-label={t("ideas.categoryLabel")} className="idea-categories">
        {groups.map((group) => (
          <button key={group.category} type="button" className="idea-category" aria-pressed={group.category === category} onClick={() => {
            setCategory(group.category === category ? null : group.category);
            setShowAll(false);
          }}>
            {t(`ideas.category.${group.category}`)}
          </button>
        ))}
      </div>
      {!active ? <p className="idea-empty">{t("ideas.pickCategory")}</p> : (
        <ul className="idea-list" aria-label={t(`ideas.category.${active.category}`)}>
          {visibleIdeas.map((idea) => {
            const generalAdded = taken.has(idea.title.toLocaleLowerCase(locale));
            const product = bol ? idea.product : undefined;
            const productAdded = product && taken.has(product.name.toLocaleLowerCase(locale));
            return (
              <li className="idea-card" key={idea.id}>
                <div className="idea-card-heading">
                  <span className="idea-card-mark" aria-hidden="true">✳</span>
                  <strong>{idea.title}</strong>
                </div>
                {product ? (
                  <>
                    <div className="idea-product">
                      <span className="idea-product-label">{t("ideas.suggestion")}</span>
                      <strong className="idea-product-name">{product.name}</strong>
                      <span className="idea-product-merchant">{t("ideas.merchant")}</span>
                      {productAdded ? addedStatus(product.name) : (
                        <button type="button" className="button idea-product-add" disabled={full}
                          aria-label={t("ideas.addToListLabel", { title: product.name })}
                          onClick={() => add(product.name, product.url)}>
                          {t("ideas.addToList")}
                        </button>
                      )}
                    </div>
                    <p className="idea-or" aria-hidden="true">{t("ideas.or")}</p>
                    {generalAdded ? addedStatus(idea.title) : (
                      <button type="button" className="button button-secondary button-small idea-add" disabled={full}
                        aria-label={t("ideas.addWithoutProductLabel", { title: idea.title })}
                        onClick={() => add(idea.title)}>
                        {t("ideas.addWithoutProduct")}
                      </button>
                    )}
                  </>
                ) : generalAdded ? addedStatus(idea.title) : (
                  <button type="button" className="button idea-add" disabled={full}
                    aria-label={t("ideas.addToListLabel", { title: idea.title })}
                    onClick={() => add(idea.title)}>
                    {t("ideas.addToList")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {ideas.length > INITIAL_IDEA_COUNT && <button type="button" className="button button-secondary button-small idea-more" onClick={() => setShowAll(!showAll)}>{showAll ? t("ideas.showLess") : t("ideas.showMore")}</button>}
      {bol && visibleIdeas.some((idea) => idea.product) && <p className="hint idea-disclosure">{t("ideas.partnerNote")}</p>}
      {full && <p className="hint">{t("ideas.full")}</p>}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </details>
  );
}
