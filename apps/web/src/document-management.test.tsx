// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LibraryFilterBar } from "./DocumentManagement";
import { initialFilters } from "./library";

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
it("keeps format and reading filters without the retired content type", async () => {
  await act(async () =>
    root.render(
      <LibraryFilterBar
        documents={[]}
        filters={initialFilters}
        onChange={() => {}}
        view="grid"
        onViewChange={() => {}}
        count={0}
      />,
    ),
  );
  expect(host.querySelector('[aria-label="文档类型筛选"]')).toBeNull();
  expect(host.querySelector('[aria-label="文件格式筛选"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="阅读状态筛选"]')).not.toBeNull();
});
