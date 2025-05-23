import { writeFile, readFile } from "fs/promises";
import { getInput, setFailed, warning } from "@actions/core";
import { buildPost } from "./build-post.js";
import { formatPlaylist, formatBookmarks, formatBooks } from "./format.js";
import { getDataFile } from "./get-data-file.js";
import { getJsonFile } from "./get-json-file.js";
import { join } from "path";
import * as github from "@actions/github";

export function slugifyTitle(title: string) {
  if (title.includes("/")) title = title.split("/")[1];
  return title.replace(/\s+/g, "-").toLowerCase();
}

export async function action() {
  try {
    const payload = github.context.payload.inputs;

    const title = payload?.["post-title"] || getInput("post-title");
    const startDate = payload?.["start-date"] || getInput("start-date");
    const endDate = payload?.["end-date"] || getInput("end-date");

    validateInputs(title, startDate, endDate);

    const slug = slugifyTitle(title);
    const image = `${slug}.png`;

    const {
      bookKeyName,
      bookPath,
      bookmarkKeyName,
      bookmarkPath,
      playlistPath,
    } = processSources();

    const [bookData, bookmarkData, playlistData] = await Promise.all([
      getJsonFile(bookPath),
      getJsonFile(bookmarkPath),
      getDataFile(playlistPath),
    ]);

    const { bookYaml, bookMarkdown } = formatBooks({
      bookKeyName,
      bookData,
      start: startDate,
      end: endDate,
    });

    const { bookmarkYaml, bookmarkMarkdown } = formatBookmarks({
      bookmarkKeyName,
      bookmarkData,
      start: startDate,
      end: endDate,
    });

    const { playlistYaml, playlistMarkdown } = formatPlaylist({
      playlistData,
      title,
    });

    const template = await getTemplate();

    // build post
    const md = buildPost({
      title,
      bookMarkdown,
      playlistMarkdown,
      bookmarkMarkdown,
      image,
      bookYaml,
      bookmarkYaml,
      playlistYaml,
      template,
    });

    const postsDir = getInput("posts-directory");

    const blogFilePath = join(postsDir, `${endDate}-${slug}.md`);

    await writeFile(blogFilePath, md);
  } catch (error) {
    setFailed(error);
  }
}

async function getTemplate() {
  const templatePath = getInput("post-template");

  if (templatePath) {
    try {
      return await readFile(templatePath, "utf8");
    } catch {
      warning(
        `Could not find template file "${templatePath}". Using default template.`
      );
    }
  }
  return await readFile(join(__dirname, "template.md"), "utf8");
}

export function validateInputs(title: string, start: string, end: string) {
  if (!title) {
    throw new Error("`post-title` is required.");
  }

  if (!start) {
    throw new Error("`start-date` is required.");
  }

  if (!end) {
    throw new Error("`end-date` is required.");
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(start) || !datePattern.test(end)) {
    throw new Error(
      "`start-date` and `end-date` must be in YYYY-MM-DD format."
    );
  }

  if (new Date(start) > new Date(end)) {
    throw new Error("`start-date` must be before `end-date`.");
  }
}

function processSources(): {
  bookKeyName: string;
  bookPath: string;
  bookmarkKeyName: string;
  bookmarkPath: string;
  playlistPath: string;
} {
  const sourceBooks = getInput("source-books");
  const sourceBookmarks = getInput("source-bookmarks");
  const sourcePlaylist = getInput("source-playlist");

  let bookKeyName, bookPath, bookmarkKeyName, bookmarkPath, playlistPath;
  if (sourceBooks !== "false") {
    [bookKeyName, bookPath] = sourceBooks.split("|");
  }

  if (sourceBookmarks !== "false") {
    [bookmarkKeyName, bookmarkPath] = sourceBookmarks.split("|");
  }

  if (sourcePlaylist !== "false") {
    playlistPath = sourcePlaylist;
  }
  return {
    bookKeyName,
    bookPath,
    bookmarkKeyName,
    bookmarkPath,
    playlistPath,
  };
}
