import { createConsentHttpHandlers } from "@/lib/identity/protected-http";
import { createIdentityRouteDependencies } from "@/lib/identity/route-dependencies";

const handlers = createConsentHttpHandlers(createIdentityRouteDependencies());

export const PUT = handlers.PUT;
