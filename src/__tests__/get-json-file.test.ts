import { getJsonFile } from "../get-json-file";

import repoContents from "./fixtures/repo-contents.json";

let mockGetContents = Promise.resolve({
  data: repoContents,
});

jest.mock("@actions/core");
jest.mock("octokit", () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      rest: {
        repos: {
          getContent: jest.fn().mockImplementation(() => mockGetContents),
        },
      },
    })),
  };
});

describe("getJsonFile", () => {
  test("works", async () => {
    expect(await getJsonFile("books.json")).toMatchSnapshot();
  });
  test("missing content", async () => {
    mockGetContents = Promise.resolve({
      data: {},
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
