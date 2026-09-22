import type { ReplayIdentifier, ReplayProtection } from "./assertion";
import type { RetailerPrincipalResolver } from "./exchange-service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RpcResult {
  data: unknown;
  error: unknown;
}

export interface RetailerServiceRoleRpcClient {
  schema(name: string): {
    rpc(functionName: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
  };
}

function byteaHex(bytes: Uint8Array): string {
  return `\\x${Buffer.from(bytes).toString("hex")}`;
}

function requireSuccessfulRpc(result: RpcResult): unknown {
  if (result.error) throw new Error("Retailer identity persistence failed.");
  return result.data;
}

export class SupabaseRetailerIdentityAdapter
  implements RetailerPrincipalResolver, ReplayProtection
{
  constructor(private readonly serviceRoleClient: RetailerServiceRoleRpcClient) {}

  async resolveOrCreate(input: {
    retailerId: string;
    issuer: string;
    subjectDigest: Uint8Array;
  }): Promise<string> {
    const result = await this.serviceRoleClient.schema("private").rpc(
      "resolve_or_create_retailer_principal",
      {
        p_retailer_id: input.retailerId,
        p_issuer: input.issuer,
        p_subject_digest: byteaHex(input.subjectDigest),
      },
    );
    const principalId = requireSuccessfulRpc(result);
    if (typeof principalId !== "string" || !UUID.test(principalId)) {
      throw new Error("Retailer identity persistence failed.");
    }
    return principalId;
  }

  async consume(identifier: ReplayIdentifier): Promise<boolean> {
    const result = await this.serviceRoleClient.schema("private").rpc(
      "consume_retailer_assertion_replay",
      {
        p_retailer_id: identifier.retailerId,
        p_issuer: identifier.issuer,
        p_assertion_id: identifier.assertionId,
        p_expires_at: new Date(identifier.expiresAt * 1000).toISOString(),
      },
    );
    const consumed = requireSuccessfulRpc(result);
    if (typeof consumed !== "boolean") {
      throw new Error("Retailer identity persistence failed.");
    }
    return consumed;
  }
}
