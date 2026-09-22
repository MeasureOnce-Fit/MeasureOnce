import { createAccountExportHttpHandlers } from "@/lib/identity/protected-http";
import { createIdentityRouteDependencies } from "@/lib/identity/route-dependencies";

const handlers = createAccountExportHttpHandlers(createIdentityRouteDependencies());

export const GET = handlers.GET;
