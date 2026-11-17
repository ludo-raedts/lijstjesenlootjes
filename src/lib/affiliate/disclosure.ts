/** Message key for the affiliate disclosure matching the shops that are active for this visitor. */
export function disclosureKey(amazon: boolean, bol: boolean) {
  if (amazon && bol) return "affiliate.disclosureBoth" as const;
  return bol ? ("affiliate.disclosureBol" as const) : ("affiliate.disclosure" as const);
}
