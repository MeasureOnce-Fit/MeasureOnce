import { createProfilesHttpHandlers } from "@/lib/identity/protected-http";
import { createIdentityRouteDependencies } from "@/lib/identity/route-dependencies";

const handlers = createProfilesHttpHandlers(createIdentityRouteDependencies());

export const GET = handlers.GET;
export const POST = handlers.POST;
