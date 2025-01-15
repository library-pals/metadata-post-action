import { getDataFile } from "../get-data-file";
import repoContentsYml from "./fixtures/repo-contents-yml.json";

let mockGetContents = Promise.resolve({
  data: repoContentsYml,
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

describe("getDataFile", () => {
  test("works", async () => {
    expect(await getDataFile("playlists.yml")).toMatchSnapshot();
  });
  test("missing content", async () => {
    mockGetContents = Promise.resolve({
      data: {},
    });
    expect(await getDataFile("playlists.yml")).toEqual([]);
  });
  test("missing file", async () => {
    expect(await getDataFile()).toEqual([]);
  });
  test("fails", async () => {
    mockGetContents = Promise.reject("Error");

    try {
      await getDataFile("playlists.yml");
    } catch (err) {
      expect(err).toMatchInlineSnapshot(`[Error: playlists.yml: Error]`);
    }
  });
});
