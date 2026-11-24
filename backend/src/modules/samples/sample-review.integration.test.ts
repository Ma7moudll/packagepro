import {
  beforeEach,
  beforeAll,
  afterAll,
  it,
  expect,
  describe,
  vi,
} from "vitest";
import { fileUploadService } from "../../services/file-upload/upload.service";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { prisma } from "../../lib/prisma";
import { jwtService } from "../auth/services/jwt.service";
import { sampleRoutes } from "./sample.routes";
import { sampleService } from "./sample.service";
describe.skipIf(process.env.PACKAGEPRO_SAMPLE_REVIEW_DB !== "yes")(
  "sample review replay integrity",
  () => {
    const app = Fastify();
    let owner: any,
      vendor: any,
      stranger: any,
      otherVendor: any,
      sample: any,
      order: any,
      po: any,
      run: any;
    let validated = false;
    beforeAll(async () => {
      const u = new URL(process.env.DATABASE_URL || "");
      if (
        !["localhost", "127.0.0.1"].includes(u.hostname) ||
        !/^\/packagepro_e2e_samplereview_[a-z0-9]+$/.test(u.pathname) ||
        process.env.NODE_ENV !== "test" ||
        process.env.EMAIL_PROVIDER !== "test"
      )
        throw Error("Disposable local sample access DB required");
      if (
        (await prisma.user.count()) ||
        (await prisma.order.count()) ||
        (await prisma.sample.count())
      )
        throw Error("Empty business DB required");
      validated = true;
      app.setErrorHandler((e: any, _r, p) =>
        p
          .status(e.statusCode || (e.name === "ZodError" ? 400 : 500))
          .send({ error: e.message }),
      );
      await app.register(sampleRoutes, { prefix: "/api" });
      await app.ready();
      owner = await prisma.user.create({
        data: {
          email: "sample-owner@test.invalid",
          passwordHash: "unusable",
          role: "CUSTOMER",
          customer: { create: {} },
        },
        include: { customer: true },
      });
      stranger = await prisma.user.create({
        data: {
          email: "sample-stranger@test.invalid",
          passwordHash: "unusable",
          role: "CUSTOMER",
          customer: { create: {} },
        },
        include: { customer: true },
      });
      for (const [key, email] of [
        ["owner", "vendor-owner@test.invalid"],
        ["stranger", "vendor-stranger@test.invalid"],
      ]) {
        const v = await prisma.user.create({
          data: {
            email,
            passwordHash: "unusable",
            role: "VENDOR",
            vendor: {
              create: {
                companyName: "Synthetic sample vendor",
                address: "Test",
                city: "Test",
                country: "EG",
              },
            },
          },
          include: { vendor: true },
        });
        if (key === "owner") vendor = v;
        else otherVendor = v;
      }
      order = await prisma.order.create({
        data: {
          orderNumber: "SYNTHETIC-SAMPLE-ACCESS",
          customerId: owner.customer.id,
          status: "in_production",
          subtotal: 20,
          tax: 0,
          total: 20,
          shippingCost: 0,
          shippingAddress: { privateSyntheticMarker: "not-for-stranger" },
          shippingName: "Synthetic buyer",
          shippingPhone: "synthetic-only",
        },
      });
      po = await prisma.purchaseOrder.create({
        data: {
          orderId: order.id,
          vendorId: vendor.vendor.id,
          poNumber: "SYNTHETIC-SAMPLE-PO",
          vendorCost: 10,
          status: "confirmed",
        },
      });
      run = await prisma.production.create({
        data: {
          poId: po.id,
          vendorId: vendor.vendor.id,
          status: "sample_production",
        },
      });
      sample = await prisma.sample.create({
        data: {
          productionId: run.id,
          photoUrls: ["https://example.invalid/synthetic-private-sample.png"],
          notes: "Synthetic private notes",
        },
      });
    });
    const auth = (user: any) => ({
      authorization:
        "Bearer " +
        jwtService.generateAccessToken(user.id, user.email, user.role),
    });
    const get = (user?: any, id?: string) =>
      app.inject({
        method: "GET",
        url: "/api/samples/" + (id || sample.id),
        headers: user ? auth(user) : {},
      });

    const review = (action: string) =>
      app.inject({
        method: "POST",
        url: `/api/samples/${sample.id}/${action}`,
        headers: auth({
          id: "synthetic-admin",
          email: "admin@test.invalid",
          role: "ADMIN",
        }),
        payload:
          action === "reject"
            ? {
                revisionNotes: "Synthetic revision",
                submissionId: sample.submissionId,
              }
            : { submissionId: sample.submissionId },
      });
    const snapshot = async () => ({
      sample: await prisma.sample.findUnique({ where: { id: sample.id } }),
      run: await prisma.production.findUnique({ where: { id: run.id } }),
      order: await prisma.order.findUnique({ where: { id: order.id } }),
    });
    beforeEach(async () => {
      vi.restoreAllMocks();
      await prisma.sample.update({
        where: { id: sample.id },
        data: {
          status: "pending",
          reviewedAt: null,
          reviewedBy: null,
          revisionNotes: null,
        },
      });
      sample = await prisma.sample.findUniqueOrThrow({
        where: { id: sample.id },
      });
      await prisma.production.update({
        where: { id: run.id },
        data: { status: "sample_production" },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "in_production" },
      });
    });
    it("valid approval resumes sample run atomically and replay preserves review metadata", async () => {
      expect((await review("approve")).statusCode).toBe(200);
      const before = await snapshot();
      expect(before.run!.status).toBe("in_progress");
      await prisma.production.update({
        where: { id: run.id },
        data: { status: "completed" },
      });
      const closed = await snapshot();
      expect((await review("approve")).statusCode).toBe(200);
      expect(await snapshot()).toEqual(closed);
    });
    it("reject replay preserves notes and review time without changing run", async () => {
      expect((await review("reject")).statusCode).toBe(200);
      const before = await snapshot();
      expect((await review("reject")).statusCode).toBe(200);
      expect(await snapshot()).toEqual(before);
      expect(before.run!.status).toBe("sample_production");
    });
    it.each([
      ["approve", "reject"],
      ["reject", "approve"],
    ])(
      "contradictory %s then %s conflicts unchanged",
      async (first, second) => {
        expect((await review(first)).statusCode).toBe(200);
        const before = await snapshot();
        expect((await review(second)).statusCode).toBe(409);
        expect(await snapshot()).toEqual(before);
      },
    );
    it.each(["quality_review", "completed"] as const)(
      "pending review cannot rewind %s run",
      async (status) => {
        await prisma.production.update({
          where: { id: run.id },
          data: { status },
        });
        const before = await snapshot();
        expect((await review("approve")).statusCode).toBe(409);
        expect((await review("reject")).statusCode).toBe(409);
        expect(await snapshot()).toEqual(before);
      },
    );
    it.each(["cancelled", "shipped", "delivered", "completed"] as const)(
      "closed parent %s blocks new decision",
      async (status) => {
        await prisma.order.update({
          where: { id: order.id },
          data: { status },
        });
        const before = await snapshot();
        expect((await review("approve")).statusCode).toBe(409);
        expect(await snapshot()).toEqual(before);
      },
    );
    it("production write failure rolls back sample decision and allows retry", async () => {
      const before = await snapshot();
      await prisma.$executeRawUnsafe(
        `CREATE FUNCTION sample_review_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic review rollback'; END $$`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER sample_review_failure BEFORE UPDATE ON productions FOR EACH ROW EXECUTE FUNCTION sample_review_failure()`,
      );
      try {
        expect((await review("approve")).statusCode).toBe(500);
        expect(await snapshot()).toEqual(before);
      } finally {
        await prisma.$executeRawUnsafe(
          "DROP TRIGGER sample_review_failure ON productions",
        );
        await prisma.$executeRawUnsafe("DROP FUNCTION sample_review_failure()");
      }
      expect((await review("approve")).statusCode).toBe(200);
    });
    it("concurrent opposing reviews commit one decision only", async () => {
      const responses = await Promise.all([
        review("approve"),
        review("reject"),
      ]);
      expect(responses.map((r) => r.statusCode).sort()).toEqual([200, 409]);
      const after = await snapshot();
      expect(after.run!.status).toBe(
        after.sample!.status === "approved"
          ? "in_progress"
          : "sample_production",
      );
    });
    it.each(["not_started", "in_progress"] as const)(
      "preserves legacy approval of pending sample on %s",
      async (status) => {
        await prisma.production.update({
          where: { id: run.id },
          data: { status },
        });
        expect((await review("approve")).statusCode).toBe(200);
        expect((await snapshot()).run!.status).toBe("in_progress");
      },
    );
    it("customer and vendor cannot review sample", async () => {
      for (const user of [owner, vendor])
        expect(
          (
            await app.inject({
              method: "POST",
              url: `/api/samples/${sample.id}/approve`,
              headers: auth(user),
              payload: {},
            })
          ).statusCode,
        ).toBe(403);
    });

    const upload = () =>
      sampleService.uploadSamples(
        run.id,
        [
          {
            buffer: Buffer.from("synthetic"),
            fileName: "synthetic.png",
            mimeType: "image/png",
          },
        ],
        undefined,
        { userId: vendor.id, role: "VENDOR" },
      );
    const staged = () => ({
      fileId: randomUUID(),
      fileName: "synthetic.png",
      fileUrl: "https://example.invalid/" + randomUUID() + ".png",
      fileSize: 9,
      mimeType: "image/png",
    });
    it("reupload rotates identity and stale approval cannot decide new photos", async () => {
      expect((await review("approve")).statusCode).toBe(200);
      const old = sample.submissionId;
      vi.spyOn(fileUploadService, "uploadFile").mockResolvedValue(staged());
      const next = await upload();
      expect(next.submissionId).not.toBe(old);
      expect(next.status).toBe("pending");
      expect(next.reviewedAt).toBeNull();
      expect(next.reviewedBy).toBeNull();
      const before = await snapshot();
      expect((await review("approve")).statusCode).toBe(409);
      expect(await snapshot()).toEqual(before);
      sample = next;
      expect((await review("approve")).statusCode).toBe(200);
    });
    it("review committed during staged upload cannot be reset by upload completion", async () => {
      vi.spyOn(fileUploadService, "uploadFile").mockImplementationOnce(
        async () => {
          expect((await review("approve")).statusCode).toBe(200);
          return staged();
        },
      );
      await expect(upload()).rejects.toMatchObject({ statusCode: 409 });
      expect((await snapshot()).sample!.status).toBe("approved");
      expect((await snapshot()).run!.status).toBe("in_progress");
    });
    it("two overlapping uploads cannot both replace same observed submission", async () => {
      let count = 0;
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      vi.spyOn(fileUploadService, "uploadFile").mockImplementation(async () => {
        if (++count === 2) release();
        await gate;
        return staged();
      });
      const results = await Promise.allSettled([upload(), upload()]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    });
    it("review missing submission identity fails400 without deciding", async () => {
      const before = await snapshot();
      const r = await app.inject({
        method: "POST",
        url: `/api/samples/${sample.id}/approve`,
        headers: auth({
          id: "admin",
          email: "admin@test.invalid",
          role: "ADMIN",
        }),
        payload: {},
      });
      expect(r.statusCode, r.body).toBe(400);
      expect(await snapshot()).toEqual(before);
    });

    it("stale rejection retry cannot decide reuploaded photos", async () => {
      expect((await review("reject")).statusCode).toBe(200);
      vi.spyOn(fileUploadService, "uploadFile").mockResolvedValue(staged());
      const next = await upload();
      const before = await snapshot();
      expect((await review("reject")).statusCode).toBe(409);
      expect(await snapshot()).toEqual(before);
      sample = next;
      expect((await review("approve")).statusCode).toBe(200);
    });
    it("locked actor recheck denies upload after PO reassignment during file work", async () => {
      const other = otherVendor.vendor.id;
      vi.spyOn(fileUploadService, "uploadFile").mockImplementationOnce(
        async () => {
          await prisma.purchaseOrder.update({
            where: { id: po.id },
            data: { vendorId: other },
          });
          return staged();
        },
      );
      const before = await prisma.sample.findUnique({
        where: { id: sample.id },
      });
      try {
        await expect(upload()).rejects.toMatchObject({ statusCode: 403 });
        expect(
          await prisma.sample.findUnique({ where: { id: sample.id } }),
        ).toEqual(before);
      } finally {
        await prisma.purchaseOrder.update({
          where: { id: po.id },
          data: { vendorId: vendor.vendor.id },
        });
      }
    });
    it("upload sample write and run pause roll back together", async () => {
      await prisma.production.update({
        where: { id: run.id },
        data: { status: "in_progress" },
      });
      vi.spyOn(fileUploadService, "uploadFile").mockResolvedValue(staged());
      const before = await snapshot();
      await prisma.$executeRawUnsafe(
        `CREATE FUNCTION sample_upload_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic upload rollback'; END $$`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER sample_upload_failure BEFORE UPDATE ON productions FOR EACH ROW EXECUTE FUNCTION sample_upload_failure()`,
      );
      try {
        await expect(upload()).rejects.toBeDefined();
        expect(await snapshot()).toEqual(before);
      } finally {
        await prisma.$executeRawUnsafe(
          "DROP TRIGGER sample_upload_failure ON productions",
        );
        await prisma.$executeRawUnsafe("DROP FUNCTION sample_upload_failure()");
      }
    });

    it("HTTP upload carries authenticated actor and creates new submission", async () => {
      vi.spyOn(fileUploadService, "uploadFile").mockResolvedValue(staged());
      const r = await app.inject({
        method: "POST",
        url: `/api/production/${run.id}/samples`,
        headers: auth(vendor),
        payload: {
          photos: [
            {
              fileName: "synthetic.png",
              mimeType: "image/png",
              dataBase64: Buffer.from("synthetic").toString("base64"),
            },
          ],
        },
      });
      expect(r.statusCode, r.body).toBe(200);
      expect(r.json().data.submissionId).not.toBe(sample.submissionId);
    });
    it("legacy migration backfills distinct nonnull submission UUIDs", async () => {
      const sql = readFileSync(
        "prisma/migrations/20261124020000_sample_submission_identity/migration.sql",
        "utf8",
      );
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("CREATE SCHEMA synthetic_sample_migration");
        await tx.$executeRawUnsafe(
          "SET LOCAL search_path TO synthetic_sample_migration",
        );
        await tx.$executeRawUnsafe(
          "CREATE TABLE samples (id TEXT PRIMARY KEY)",
        );
        await tx.$executeRawUnsafe(
          "INSERT INTO samples(id) VALUES ('legacy1'),('legacy2')",
        );
        for (const statement of sql
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean))
          await tx.$executeRawUnsafe(statement);
        const rows = await tx.$queryRawUnsafe<Array<{ submissionId: string }>>(
          'SELECT "submissionId" FROM samples',
        );
        expect(rows).toHaveLength(2);
        expect(rows.every((r) => /^[0-9a-f-]{36}$/.test(r.submissionId))).toBe(
          true,
        );
        expect(new Set(rows.map((r) => r.submissionId)).size).toBe(2);
        await tx.$executeRawUnsafe(
          "DROP SCHEMA synthetic_sample_migration CASCADE",
        );
      });
    });

    it.each(["quality_review", "completed"] as const)(
      "closed run %s upload refused before staging",
      async (status) => {
        await prisma.production.update({
          where: { id: run.id },
          data: { status },
        });
        const stage = vi
          .spyOn(fileUploadService, "uploadFile")
          .mockResolvedValue(staged());
        const before = await snapshot();
        await expect(upload()).rejects.toMatchObject({ statusCode: 409 });
        expect(stage).not.toHaveBeenCalled();
        expect(await snapshot()).toEqual(before);
      },
    );
    it.each(["cancelled", "shipped", "delivered", "completed"] as const)(
      "closed parent %s upload refused before staging",
      async (status) => {
        await prisma.order.update({
          where: { id: order.id },
          data: { status },
        });
        const stage = vi
          .spyOn(fileUploadService, "uploadFile")
          .mockResolvedValue(staged());
        const before = await snapshot();
        await expect(upload()).rejects.toMatchObject({ statusCode: 409 });
        expect(stage).not.toHaveBeenCalled();
        expect(await snapshot()).toEqual(before);
      },
    );
    it.each(["cancelled", "shipped", "delivered", "completed"] as const)(
      "parent closes to %s during staging and upload cannot commit",
      async (status) => {
        let before: any;
        vi.spyOn(fileUploadService, "uploadFile").mockImplementationOnce(
          async () => {
            await prisma.order.update({
              where: { id: order.id },
              data: { status },
            });
            before = await snapshot();
            return staged();
          },
        );
        await expect(upload()).rejects.toMatchObject({ statusCode: 409 });
        expect(await snapshot()).toEqual(before);
      },
    );
    it.each(["quality_review", "completed"] as const)(
      "run closes to %s during staging and upload cannot commit",
      async (status) => {
        let before: any;
        vi.spyOn(fileUploadService, "uploadFile").mockImplementationOnce(
          async () => {
            await prisma.production.update({
              where: { id: run.id },
              data: { status },
            });
            before = await snapshot();
            return staged();
          },
        );
        await expect(upload()).rejects.toMatchObject({ statusCode: 409 });
        expect(await snapshot()).toEqual(before);
      },
    );
    it("duplicate historical sample rows fail before staging", async () => {
      const extra = await prisma.sample.create({
        data: { productionId: run.id, photoUrls: [] },
      });
      const stage = vi
        .spyOn(fileUploadService, "uploadFile")
        .mockResolvedValue(staged());
      try {
        await expect(upload()).rejects.toMatchObject({ statusCode: 409 });
        expect(stage).not.toHaveBeenCalled();
      } finally {
        await prisma.sample.delete({ where: { id: extra.id } });
      }
    });
    it("duplicate sample inserted during staging is not silently selected", async () => {
      let extra: any;
      vi.spyOn(fileUploadService, "uploadFile").mockImplementationOnce(
        async () => {
          extra = await prisma.sample.create({
            data: { productionId: run.id, photoUrls: [] },
          });
          return staged();
        },
      );
      const before = await prisma.sample.findUnique({
        where: { id: sample.id },
      });
      try {
        await expect(upload()).rejects.toMatchObject({ statusCode: 409 });
        expect(
          await prisma.sample.findUnique({ where: { id: sample.id } }),
        ).toEqual(before);
      } finally {
        if (extra) await prisma.sample.delete({ where: { id: extra.id } });
      }
    });
    it("ADMIN upload refuses mismatched run and PO vendors", async () => {
      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { vendorId: otherVendor.vendor.id },
      });
      vi.spyOn(fileUploadService, "uploadFile").mockResolvedValue(staged());
      const before = await snapshot();
      try {
        await expect(
          sampleService.uploadSamples(
            run.id,
            [
              {
                buffer: Buffer.from("synthetic"),
                fileName: "s.png",
                mimeType: "image/png",
              },
            ],
            undefined,
            { userId: "admin", role: "ADMIN" },
          ),
        ).rejects.toMatchObject({ statusCode: 409 });
        expect(await snapshot()).toEqual(before);
      } finally {
        await prisma.purchaseOrder.update({
          where: { id: po.id },
          data: { vendorId: vendor.vendor.id },
        });
      }
    });
    afterAll(async () => {
      if (validated) {
        await prisma.sample.deleteMany();
        await prisma.production.deleteMany();
        await prisma.purchaseOrder.deleteMany();
        await prisma.order.deleteMany();
        await prisma.user.deleteMany();
      }
      await app.close();
      await prisma.$disconnect();
    });
  },
);
