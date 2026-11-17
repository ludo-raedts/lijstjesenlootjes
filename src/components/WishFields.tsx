"use client";

import { AmazonEditorHelper } from "@/components/AmazonAffiliate";
import { WishIdeas, MAX_EDITOR_WISHES } from "@/components/WishIdeas";
import { useI18n } from "@/i18n/I18nProvider";

export type WishDraft = {
  id?: string;
  title: string;
  url: string;
  price: string;
  note: string;
};

export const blankWish = (): WishDraft => ({ title: "", url: "", price: "", note: "" });

export function WishFields({
  wishes,
  onChange,
}: {
  wishes: WishDraft[];
  onChange: (wishes: WishDraft[]) => void;
}) {
  const { t } = useI18n();
  const update = (index: number, patch: Partial<WishDraft>) => {
    onChange(wishes.map((wish, current) => current === index ? { ...wish, ...patch } : wish));
  };
  // An idea fills the last empty wish row if there is one, otherwise it opens a new row.
  const lastIsBlank = wishes.length > 0 && !wishes[wishes.length - 1].title.trim() && !wishes[wishes.length - 1].url.trim();
  const addIdea = (title: string) => {
    if (lastIsBlank) {
      update(wishes.length - 1, { title });
    } else if (wishes.length < MAX_EDITOR_WISHES) {
      onChange([...wishes, { ...blankWish(), title }]);
    }
  };
  return (
    <div className="wish-editor">
      <WishIdeas existingTitles={wishes.map((wish) => wish.title)} full={wishes.length >= MAX_EDITOR_WISHES && !lastIsBlank} onAdd={addIdea} />
      {wishes.map((wish, index) => (
        <fieldset className="wish-row" key={wish.id ?? index}>
          <div className="wish-row-head">
            <strong>{t("wishes.item", { number: index + 1 })}</strong>
            {wishes.length > 1 && (
              <button className="button button-danger button-small" type="button" onClick={() => onChange(wishes.filter((_, current) => current !== index))}>
                {t("common.remove")}
              </button>
            )}
          </div>
          <div className="field">
            <label htmlFor={`wish-title-${index}`}>{t("wishes.titleLabel")}</label>
            <input id={`wish-title-${index}`} value={wish.title} maxLength={160} required onChange={(event) => update(index, { title: event.target.value })} placeholder={t("wishes.titlePlaceholder")} />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor={`wish-url-${index}`}>{t("wishes.urlLabel")} <span className="hint">{t("common.optional")}</span></label>
              <input id={`wish-url-${index}`} value={wish.url} inputMode="url" onChange={(event) => update(index, { url: event.target.value })} placeholder={t("wishes.urlPlaceholder")} />
            </div>
            <div className="field">
              <label htmlFor={`wish-price-${index}`}>{t("wishes.priceLabel")} <span className="hint">{t("common.optional")}</span></label>
              <input id={`wish-price-${index}`} value={wish.price} maxLength={40} onChange={(event) => update(index, { price: event.target.value })} placeholder={t("wishes.pricePlaceholder")} />
            </div>
          </div>
          <AmazonEditorHelper title={wish.title} />
          <div className="field">
            <label htmlFor={`wish-note-${index}`}>{t("wishes.noteLabel")} <span className="hint">{t("common.optional")}</span></label>
            <textarea id={`wish-note-${index}`} value={wish.note} maxLength={500} onChange={(event) => update(index, { note: event.target.value })} placeholder={t("wishes.notePlaceholder")} />
          </div>
        </fieldset>
      ))}
      <button className="button button-secondary" type="button" onClick={() => onChange([...wishes, blankWish()])}>{t("wishes.add")}</button>
    </div>
  );
}
