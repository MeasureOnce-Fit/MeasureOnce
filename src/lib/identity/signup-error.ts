type SignupError = {
  code?: string;
  message?: string;
  status?: number;
};

export function describeSignupError(error: SignupError) {
  if (error.code === "weak_password") return "Choose a stronger password with at least 8 characters.";
  if (error.code === "email_not_confirmed") return "Immediate prototype signup is not enabled yet. Turn off Confirm email in Supabase Authentication settings.";
  if (error.status === 429) return "Too many attempts. Please wait a minute before trying again.";
  return "We could not create your account. Please try again. If you already have an account, sign in instead.";
}
