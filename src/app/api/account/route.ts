import { createAccountHttpHandlers } from "@/lib/identity/protected-http";
import { createIdentityRouteDependencies } from "@/lib/identity/route-dependencies";

const handlers = createAccountHttpHandlers(createIdentityRouteDependencies());

export const DELETE = handlers.DELETE;
