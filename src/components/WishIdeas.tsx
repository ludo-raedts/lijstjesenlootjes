"use client";

import { useId, useMemo, useState } from "react";
import { useBolAffiliate } from "@/components/AmazonAffiliate";
import { useI18n } from "@/i18n/I18nProvider";
import { ideasForLocale, normalizeIdeaSearch, type IdeaCategory } from "@/i18n/ideas";

export const MAX_EDITOR_WISHES = 30;
const INITIAL_IDEA_COUNT = 6;

/** Suggestions modify the draft only; searching never leaves the browser. */
export function WishIdeas({ existingTitles, full, onAdd }: {
  existingTitles: string[];
  full: boolean;
  onAdd: (idea: { title: string; url: string }) => void;
}) {
  const { locale, t } = useI18n();
  const bol = useBolAffiliate();
  const groups = useMemo(() => ideasForLocale(locale), [locale]);
  const [category, setCategory] = useState<IdeaCategory | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // Open from the start while the editor is still empty (new list); stay as the visitor left it afterwards.
  const [open, setOpen] = useState(() => existingTitles.every((title) => !title.trim()));
  const searchId = useId();
  if (groups.length === 0) return null;

  const active = groups.find((group) => group.category === category) ?? groups[0];
  const normalizedQuery = normalizeIdeaSearch(query, locale);
  const ideas = normalizedQuery
    ? groups.flatMap((group) => group.ideas).filter((idea) =>
        normalizeIdeaSearch(`${idea.title} ${bol ? idea.product?.name ?? "" : ""}`, locale).includes(normalizedQuery),
      )
    : active.ideas;
  const visibleIdeas = showAll ? ideas : ideas.slice(0, INITIAL_IDEA_COUNT);
  const taken = new Set(existingTitles.map((title) => title.trim().toLocaleLowerCase(locale)));
  const add = (title: string, url = "") => {
    onAdd({ title, url });
    setAnnouncement(t("ideas.announceAdded", { title }));
  };

  return (
    <details className="wish-ideas" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{t("ideas.summary")}</summary>
      <p className="idea-intro">{t("ideas.intro")}</p>
      <div className="idea-search">
        <label htmlFor={searchId}>{t("ideas.searchLabel")}</label>
        <input id={searchId} type="search" value={query} placeholder={t("ideas.searchPlaceholder")} onChange={(event) => {
          setQuery(event.target.value);
          setShowAll(false);
        }} />
      </div>
      {!normalizedQuery && (
        <div role="group" aria-label={t("ideas.categoryLabel")} className="idea-categories">
          {groups.map((group) => (
            <button key={group.category} type="button" className="idea-category" aria-pressed={group.category === active.category} onClick={() => {
              setCategory(group.category);
              setShowAll(false);
            }}>
              {t(`ideas.category.${group.category}`)}
            </button>
          ))}
        </div>
      )}
      {ideas.length === 0 ? <p className="idea-empty" role="status">{t("ideas.noResults")}</p> : (
        <ul className="idea-list" aria-label={normalizedQuery ? t("ideas.searchResults") : t(`ideas.category.${active.category}`)}>
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
                <button type="button" className="button button-secondary button-small idea-add" disabled={full || generalAdded}
                  aria-label={generalAdded ? t("ideas.addedLabel", { title: idea.title }) : t("ideas.addLabel", { title: idea.title })}
                  onClick={() => add(idea.title)}>
                  {generalAdded ? t("ideas.added") : t("ideas.add")}
                </button>
                {product && (
                  <div className="idea-product">
                    <span className="idea-product-label">{t("ideas.productExample")}</span>
                    <span>{product.name}</span>
                    <button type="button" className="idea-product-add" disabled={full || Boolean(productAdded)}
                      aria-label={productAdded ? t("ideas.addedLabel", { title: product.name }) : t("ideas.addProductLabel", { title: product.name })}
                      onClick={() => add(product.name, product.url)}>
                      {productAdded ? t("ideas.added") : t("ideas.addProduct")}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {ideas.length > INITIAL_IDEA_COUNT && <button type="button" className="button button-secondary button-small idea-more" onClick={() => setShowAll(!showAll)}>{showAll ? t("ideas.showLess") : t("ideas.showMore")}</button>}
      {bol && visibleIdeas.some((idea) => idea.product) && <p className="hint idea-disclosure">{t("ideas.partnerNote")}</p>}
      {full && <p className="hint">{t("ideas.full")}</p>}
      <p className="sr-only" role="status" aria-live="polite">{announcement || (normalizedQuery && ideas.length > 0 ? t("ideas.resultsCount", { count: ideas.length }) : "")}</p>
    </details>
  );
}
