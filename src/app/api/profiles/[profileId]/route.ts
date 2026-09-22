import { createProfileHttpHandlers } from "@/lib/identity/protected-http";
import { createIdentityRouteDependencies } from "@/lib/identity/route-dependencies";

const handlers = createProfileHttpHandlers(createIdentityRouteDependencies());

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
