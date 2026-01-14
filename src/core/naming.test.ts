import { describe, it, expect } from "vitest";
import { getPreviewName, getContainerName, parsePrNumber } from "./naming";

describe("getPreviewName", () => {
  it("generates correct format for simple names", () => {
    expect(getPreviewName("frontend", 123)).toBe("frontend-pr-123");
    expect(getPreviewName("api", 1)).toBe("api-pr-1");
    expect(getPreviewName("my-service", 42)).toBe("my-service-pr-42");
  });

  it("converts to lowercase", () => {
    expect(getPreviewName("Frontend", 1)).toBe("frontend-pr-1");
    expect(getPreviewName("MY-API", 1)).toBe("my-api-pr-1");
  });

  it("replaces invalid characters with hyphens", () => {
    expect(getPreviewName("my_service", 1)).toBe("my-service-pr-1");
    expect(getPreviewName("my.service", 1)).toBe("my-service-pr-1");
    expect(getPreviewName("my service", 1)).toBe("my-service-pr-1");
  });

  it("collapses multiple hyphens", () => {
    expect(getPreviewName("my--service", 1)).toBe("my-service-pr-1");
    expect(getPreviewName("my___service", 1)).toBe("my-service-pr-1");
  });

  it("removes leading and trailing hyphens", () => {
    expect(getPreviewName("-frontend-", 1)).toBe("frontend-pr-1");
    expect(getPreviewName("---api---", 1)).toBe("api-pr-1");
  });

  it("prefixes names starting with numbers", () => {
    expect(getPreviewName("123service", 1)).toBe("svc-123service-pr-1");
    expect(getPreviewName("42", 1)).toBe("svc-42-pr-1");
  });

  it("truncates long names to fit DNS limit", () => {
    const longName = "a".repeat(100);
    const result = getPreviewName(longName, 1);
    expect(result.length).toBeLessThanOrEqual(63);
    expect(result).toMatch(/-pr-1$/);
  });

  it("throws on empty service name", () => {
    expect(() => getPreviewName("", 1)).toThrow("Service name cannot be empty");
    expect(() => getPreviewName("   ", 1)).toThrow("Service name cannot be empty");
  });

  it("throws on service name with no alphanumeric chars", () => {
    expect(() => getPreviewName("---", 1)).toThrow("must contain at least one alphanumeric");
  });

  it("throws on invalid PR number", () => {
    expect(() => getPreviewName("api", 0)).toThrow("positive integer");
    expect(() => getPreviewName("api", -1)).toThrow("positive integer");
    expect(() => getPreviewName("api", 1.5)).toThrow("positive integer");
  });
});

describe("getContainerName", () => {
  it("normalizes container names", () => {
    expect(getContainerName("frontend")).toBe("frontend");
    expect(getContainerName("My_Service")).toBe("my-service");
  });

  it("prefixes names starting with numbers", () => {
    expect(getContainerName("123app")).toBe("svc-123app");
  });

  it("truncates to 63 chars", () => {
    const longName = "a".repeat(100);
    expect(getContainerName(longName).length).toBeLessThanOrEqual(63);
  });
});

describe("parsePrNumber", () => {
  it("extracts PR number from valid names", () => {
    expect(parsePrNumber("frontend-pr-123")).toBe(123);
    expect(parsePrNumber("my-service-pr-1")).toBe(1);
    expect(parsePrNumber("api-pr-99999")).toBe(99999);
    expect(parsePrNumber("svc-123-pr-42")).toBe(42);
  });

  it("returns null for invalid formats", () => {
    expect(parsePrNumber("frontend")).toBeNull();
    expect(parsePrNumber("frontend-123")).toBeNull();
    expect(parsePrNumber("pr-123")).toBeNull();
  });
});
