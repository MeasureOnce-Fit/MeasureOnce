type Principal = { id: string; actorKind: string };

export interface ShowcaseRegistrationStore {
  findPrincipal(): Promise<Principal | null>;
  publicShowcaseSignupAllowed(): Promise<boolean>;
  insertShopperIfAbsent(): Promise<void>;
}

// Caller supplies only a server-verified auth identity and configured retailer.
// Existing operators are never converted to shoppers; retries preserve identity.
export async function resolveShowcaseShopper(store: ShowcaseRegistrationStore): Promise<string | null> {
  const existing = await store.findPrincipal();
  if (existing) return existing.actorKind === "shopper" ? existing.id : null;
  if (!await store.publicShowcaseSignupAllowed()) return null;
  await store.insertShopperIfAbsent();
  const created = await store.findPrincipal();
  return created?.actorKind === "shopper" ? created.id : null;
}
