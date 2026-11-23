import { describe, it, expect } from "vitest";
import { approvalContentHash, approvalBytesHash } from "./approval-snapshot";
describe("approval content identity v1", () => {
  it("ignores only editor display state and object-key ordering", () => {
    const a = {
      designData: {
        layers: [{ faceId: "front", text: "ONE" }],
        model: { height: 100, width: 1 },
        camera: { zoom: 1 },
        ui: { selectedFace: "front" },
      },
    };
    const b = {
      designData: {
        ui: { selectedFace: "back" },
        model: { width: 1, height: 100 },
        layers: [{ text: "ONE", faceId: "front" }],
        camera: { zoom: 2 },
      },
    };
    expect(approvalContentHash(a)).toBe(approvalContentHash(b));
  });
  it("binds artwork, face, geometry, custom background, economic identity and unknown fields", () => {
    const a: any = {
      designData: {
        layers: [{ faceId: "front", text: "ONE" }],
        model: { height: 100 },
        canvas: { backgroundColor: "#fff" },
      },
      productId: "p",
    };
    for (const mutate of [
      (b: any) => (b.designData.layers[0].text = "TWO"),
      (b: any) => (b.designData.layers[0].faceId = "back"),
      (b: any) => (b.designData.model.height = 120),
      (b: any) => (b.designData.canvas.backgroundColor = "#000"),
      (b: any) => (b.productId = "q"),
      (b: any) => (b.designData.unknown = "authored"),
    ]) {
      const b = structuredClone(a);
      mutate(b);
      expect(approvalContentHash(a)).not.toBe(approvalContentHash(b));
    }
  });
  it("hashes exact bytes, not filename or client metadata", () => {
    expect(approvalBytesHash(Buffer.from("red"))).not.toBe(
      approvalBytesHash(Buffer.from("blue")),
    );
  });
});
