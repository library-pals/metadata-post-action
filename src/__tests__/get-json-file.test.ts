import { getJsonFile } from "../get-json-file";

import repoContents from "./fixtures/repo-contents.json";

let mockGetContents = Promise.resolve({
  data: repoContents,
});

const mockGetBlob = Promise.resolve({
  data: { content: repoContents.content, encoding: "base64" },
});

jest.mock("@actions/core");
jest.mock("octokit", () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      rest: {
        repos: {
          getContent: jest.fn().mockImplementation(() => mockGetContents),
        },
        git: {
          getBlob: jest.fn().mockImplementation(() => mockGetBlob),
        },
      },
    })),
  };
});

describe("getJsonFile", () => {
  test("works", async () => {
    expect(await getJsonFile("books.json")).toMatchSnapshot();
  });
  test("large file (content empty, falls back to blob)", async () => {
    mockGetContents = Promise.resolve({
      data: { sha: "abc123", content: "" },
    });
    expect(await getJsonFile("books.json")).toMatchSnapshot();
  });
  test("missing content", async () => {
    mockGetContents = Promise.resolve({
      data: {},
    });
    expect(await getJsonFile("books.json")).toEqual([]);
  });
  test("content present but empty and no sha", async () => {
    mockGetContents = Promise.resolve({
      data: { content: "" },
    });
    expect(await getJsonFile("books.json")).toEqual([]);
  });
  test("missing file", async () => {
    expect(await getJsonFile()).toEqual([]);
  });
  test("fails", async () => {
    mockGetContents = Promise.reject("Error");
    try {
      await getJsonFile("books.json");
    } catch (err) {
      expect(err).toMatchInlineSnapshot(`[Error: books.json: Error]`);
    }
  });
});
