type ShowcaseSessionUser = {
  email_confirmed_at?: string | null;
  id: string;
  is_anonymous?: boolean;
};

export function isEligibleShowcaseSessionUser(user: ShowcaseSessionUser | null | undefined) {
  return Boolean(user && !user.is_anonymous);
}
