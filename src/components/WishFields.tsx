"use client";

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
  const update = (index: number, patch: Partial<WishDraft>) => {
    onChange(wishes.map((wish, current) => current === index ? { ...wish, ...patch } : wish));
  };
  return (
    <div className="wish-editor">
      {wishes.map((wish, index) => (
        <fieldset className="wish-row" key={wish.id ?? index}>
          <div className="wish-row-head">
            <strong>Wens {index + 1}</strong>
            {wishes.length > 1 && (
              <button className="button button-danger button-small" type="button" onClick={() => onChange(wishes.filter((_, current) => current !== index))}>
                Verwijder
              </button>
            )}
          </div>
          <div className="field">
            <label htmlFor={`wish-title-${index}`}>Wat wens je? *</label>
            <input id={`wish-title-${index}`} value={wish.title} maxLength={160} required onChange={(event) => update(index, { title: event.target.value })} placeholder="Bijvoorbeeld: een goede thermosfles" />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor={`wish-url-${index}`}>Link <span className="hint">optioneel</span></label>
              <input id={`wish-url-${index}`} value={wish.url} inputMode="url" onChange={(event) => update(index, { url: event.target.value })} placeholder="https://…" />
            </div>
            <div className="field">
              <label htmlFor={`wish-price-${index}`}>Prijs <span className="hint">optioneel</span></label>
              <input id={`wish-price-${index}`} value={wish.price} maxLength={40} onChange={(event) => update(index, { price: event.target.value })} placeholder="Bijvoorbeeld: € 25" />
            </div>
          </div>
          <div className="field">
            <label htmlFor={`wish-note-${index}`}>Toelichting <span className="hint">optioneel</span></label>
            <textarea id={`wish-note-${index}`} value={wish.note} maxLength={500} onChange={(event) => update(index, { note: event.target.value })} placeholder="Kleur, maat of iets anders dat handig is om te weten" />
          </div>
        </fieldset>
      ))}
      <button className="button button-secondary" type="button" onClick={() => onChange([...wishes, blankWish()])}>+ Nog een wens</button>
    </div>
  );
}
