#!/usr/bin/env node
/**
 * UI 文言の日本語ハードコード検出ガード。
 *
 * src 配下の .ts / .tsx の「コメント以外」（JSX テキスト・文字列リテラル・識別子等）に
 * 日本語（ひらがな・カタカナ・漢字）が残っていないかを検査する。i18n 化の後退防止として
 * lefthook（pre-commit）と CI で実行する。
 *
 * 検出方針:
 * - 文字を 1 つずつ走査し、行/ブロックコメント・文字列/テンプレートの状態を追跡する。
 * - コメント内の日本語は許容（内部ドキュメント）。それ以外に現れた日本語を違反として報告する。
 *
 * 除外:
 * - `*.test.ts` / `*.test.tsx`（テストは日本語アサーションを含み得る）
 * - `src/i18n/locales/**`（翻訳リソース本体）
 * - `src/components/brand/**`（ブランド名 / ワードマーク）
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");

/** ひらがな・カタカナ・漢字（CJK 統合漢字/拡張A）。単位記号（℃）・中黒（·）は対象外。 */
const JAPANESE = /[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/;

/** 走査対象外のパス（リポジトリルートからの相対、前方一致）。 */
const EXCLUDED_PREFIXES = ["src/i18n/locales/", "src/components/brand/"];

function isExcluded(relPath) {
  if (relPath.endsWith(".test.ts") || relPath.endsWith(".test.tsx")) return true;
  return EXCLUDED_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

/** src 配下の .ts / .tsx を再帰収集する。 */
function collect(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collect(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * コメント外に現れた日本語を含む行番号（1 始まり）を返す。
 * 文字列/テンプレート内の日本語も「ハードコード」として違反扱いにする。
 */
function findViolations(source) {
  const violations = [];
  let line = 1;
  // 状態: none / line-comment / block-comment / string(quote) / template
  let state = "none";
  let quote = "";

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "\n") {
      line++;
      if (state === "line-comment") state = "none";
      continue;
    }

    switch (state) {
      case "line-comment":
        break;
      case "block-comment":
        if (ch === "*" && next === "/") {
          state = "none";
          i++;
        }
        break;
      case "string":
        if (ch === "\\") {
          i++; // エスケープ文字を読み飛ばす
        } else if (ch === quote) {
          state = "none";
        } else if (JAPANESE.test(ch)) {
          violations.push(line);
        }
        break;
      case "template":
        if (ch === "\\") {
          i++;
        } else if (ch === "`") {
          state = "none";
        } else if (JAPANESE.test(ch)) {
          violations.push(line);
        }
        break;
      default:
        if (ch === "/" && next === "/") {
          state = "line-comment";
          i++;
        } else if (ch === "/" && next === "*") {
          state = "block-comment";
          i++;
        } else if (ch === '"' || ch === "'") {
          state = "string";
          quote = ch;
        } else if (ch === "`") {
          state = "template";
        } else if (JAPANESE.test(ch)) {
          // JSX テキスト等、コメント外の裸の日本語。
          violations.push(line);
        }
        break;
    }
  }
  return [...new Set(violations)];
}

const files = collect(SRC, []);
let total = 0;
for (const file of files) {
  const relPath = relative(ROOT, file).split("\\").join("/");
  if (isExcluded(relPath)) continue;
  const lines = findViolations(readFileSync(file, "utf8"));
  if (lines.length > 0) {
    total += lines.length;
    for (const l of lines) {
      console.error(`${relPath}:${l}: 日本語ハードコードの可能性があります（コメント外）`);
    }
  }
}

if (total > 0) {
  console.error(
    `\n${total} 件の日本語ハードコードを検出しました。翻訳キー化するか、意図的な例外なら除外設定を見直してください。`,
  );
  process.exit(1);
}
console.log("i18n ハードコード検査: 問題は見つかりませんでした。");
