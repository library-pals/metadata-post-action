import { Buffer } from "buffer";
import { Octokit } from "octokit";
import { DataFile } from "./format.js";
import { getInput } from "@actions/core";

export const octokit = new Octokit({
  auth: process.env.TOKEN,
});

export async function getJsonFile(
  path?: string,
): Promise<DataFile | undefined | []> {
  if (!path) return [];
  try {
    const owner = getInput("github-username", {
      required: true,
    });
    const repo = getInput("github-repository", {
      required: true,
    });
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    // repos.getContent only returns content for files under 1 MB.
    // For larger files, fall back to the git blobs API using the file's sha.
    if (!("content" in data)) {
      return [];
    }
    let content: string;
    if (data.content) {
      content = Buffer.from(data.content, "base64").toString();
    } else if ("sha" in data) {
      const { data: blob } = await octokit.rest.git.getBlob({
        owner,
        repo,
        file_sha: data.sha as string,
      });
      content = Buffer.from(blob.content, "base64").toString();
    } else {
      return [];
    }
    return JSON.parse(content) as DataFile;
  } catch (error) {
    throw new Error(`${path}: ${error}`);
  }
}
