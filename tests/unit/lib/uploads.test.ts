import { describe, expect, it } from "vitest"
import { compressImageFile, MAX_UPLOAD_BYTES, validateUploadImage } from "@/lib/uploads"
describe("private bucket upload bounds", () => {
  it("rejects executable formats disguised as an image", async () => {
    await expect(compressImageFile(new File(["<svg/>"] , "fake.svg", { type: "image/svg+xml" }))).rejects.toThrow("JPG, PNG o WebP")
  })
  it("accepts supported types inside the bucket limit", () => {
    expect(() => validateUploadImage(new File(["image"], "photo.webp", { type: "image/webp" }))).not.toThrow()
  })
  it("rejects a result larger than the server bucket limit", () => {
    expect(() => validateUploadImage(new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "photo.jpg", { type: "image/jpeg" }))).toThrow("5 MB")
  })
})
