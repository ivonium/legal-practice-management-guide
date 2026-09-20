import vm from 'node:vm';
import { bundleApp } from '../../src/build/bundle.js';

let cached = null;
// Runs the browser bundle in the current realm (so objects share prototypes with
// the tests). Files that touch `document` at top level guard for its absence.
export function loadApp() {
  if (cached) return cached;
  const js = bundleApp({ allowMissing: true });
  vm.runInThisContext(js, { filename: 'app-bundle.js' });
  cached = globalThis.PMG;
  return cached;
}
