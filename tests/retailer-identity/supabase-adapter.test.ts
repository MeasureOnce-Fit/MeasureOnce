import assert from "node:assert/strict";
import test from "node:test";

import { SupabaseRetailerIdentityAdapter } from "../../src/lib/retailer-identity/supabase-adapter";

const RETAILER_ID = "3cbf7b5c-822f-4f8a-b957-b28198c24a22";
const ISSUER = "https://identity.northstar.example";
const PRINCIPAL_ID = "1904694d-491e-42d5-b2e6-1948ec2b1da6";

type RpcResult = { data: unknown; error: unknown };

class RecordingRpcClient {
  readonly calls: Array<{ schema: string; functionName: string; arguments: Record<string, unknown> }> = [];

  constructor(private readonly results: RpcResult[]) {}

  schema(schema: string) {
    return {
      rpc: async (functionName: string, args: Record<string, unknown>) => {
        this.calls.push({ schema, functionName, arguments: args });
        return this.results.shift() ?? { data: null, error: new Error("missing fake RPC result") };
      },
    };
  }
}

test("resolves an HMAC digest through the private service-role principal RPC", async () => {
  const client = new RecordingRpcClient([{ data: PRINCIPAL_ID, error: null }]);
  const adapter = new SupabaseRetailerIdentityAdapter(client);
  const digest = Uint8Array.from({ length: 32 }, (_, index) => index);

  const principalId = await adapter.resolveOrCreate({
    retailerId: RETAILER_ID,
    issuer: ISSUER,
    subjectDigest: digest,
  });

  assert.equal(principalId, PRINCIPAL_ID);
  assert.deepEqual(client.calls, [
    {
      schema: "private",
      functionName: "resolve_or_create_retailer_principal",
      arguments: {
        p_retailer_id: RETAILER_ID,
        p_issuer: ISSUER,
        p_subject_digest: "\\x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
      },
    },
  ]);
});

test("consumes replay identifiers through the durable atomic private RPC", async () => {
  const client = new RecordingRpcClient([
    { data: true, error: null },
    { data: false, error: null },
  ]);
  const adapter = new SupabaseRetailerIdentityAdapter(client);
  const identifier = {
    retailerId: RETAILER_ID,
    issuer: ISSUER,
    assertionId: "assertion-0001",
    expiresAt: 2_000_000_120,
  };

  assert.equal(await adapter.consume(identifier), true);
  assert.equal(await adapter.consume(identifier), false);

  assert.deepEqual(client.calls[0], {
    schema: "private",
    functionName: "consume_retailer_assertion_replay",
    arguments: {
      p_retailer_id: RETAILER_ID,
      p_issuer: ISSUER,
      p_assertion_id: "assertion-0001",
      p_expires_at: "2033-05-18T03:35:20.000Z",
    },
  });
});

test("fails closed when a private RPC errors or returns a malformed value", async () => {
  const failing = new SupabaseRetailerIdentityAdapter(
    new RecordingRpcClient([{ data: null, error: new Error("database unavailable") }]),
  );
  const malformed = new SupabaseRetailerIdentityAdapter(
    new RecordingRpcClient([{ data: "true", error: null }]),
  );
  const identifier = {
    retailerId: RETAILER_ID,
    issuer: ISSUER,
    assertionId: "assertion-0001",
    expiresAt: 2_000_000_120,
  };

  await assert.rejects(failing.consume(identifier));
  await assert.rejects(malformed.consume(identifier));
});
