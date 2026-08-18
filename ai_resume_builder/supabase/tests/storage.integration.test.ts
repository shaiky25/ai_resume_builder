import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createLinkedinPdfSignedUrl } from "@/lib/supabase/linkedinPdfStorage";
import {
  createTestUser,
  deleteTestUser,
  getServiceClient,
  hasLiveSupabaseEnv,
  type TestUser,
} from "./testHelpers";

const BUCKET = "linkedin-pdfs";
const PDF_BYTES = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])]); // "%PDF"

// Covers tasks 4.3, 4.4, 6.3 against a live Supabase project.
describe.skipIf(!hasLiveSupabaseEnv)("linkedin-pdf-storage boundaries", () => {
  let service: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    service = getServiceClient();
    userA = await createTestUser(service);
    userB = await createTestUser(service);
  });

  afterAll(async () => {
    if (userA) await deleteTestUser(service, userA.id);
    if (userB) await deleteTestUser(service, userB.id);
  });

  it("owner can upload to their own path; cannot upload to another user's path", async () => {
    const { error: ownUploadError } = await userA.client.storage
      .from(BUCKET)
      .upload(`${userA.id}/resume.pdf`, PDF_BYTES);
    expect(ownUploadError).toBeNull();

    const { error: crossUploadError } = await userA.client.storage
      .from(BUCKET)
      .upload(`${userB.id}/resume.pdf`, PDF_BYTES);
    expect(crossUploadError).not.toBeNull();
  });

  it("direct client read without a signed URL fails; a server-generated signed URL succeeds", async () => {
    const path = `${userA.id}/direct-read-check.pdf`;
    await service.storage.from(BUCKET).upload(path, PDF_BYTES);

    const { error: directError } = await userA.client.storage.from(BUCKET).download(path);
    expect(directError).not.toBeNull();

    const signedUrl = await createLinkedinPdfSignedUrl(path, 60, service);
    const response = await fetch(signedUrl);
    expect(response.status).toBe(200);
  });

  it("bucket rejects anonymous public read via a guessed public URL", async () => {
    const path = `${userA.id}/resume.pdf`;
    const { data } = service.storage.from(BUCKET).getPublicUrl(path);

    const response = await fetch(data.publicUrl);
    expect(response.status).not.toBe(200);
  });
});
