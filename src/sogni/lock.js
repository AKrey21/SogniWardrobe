// src/sogni/lock.js
// Simple promise chain to serialize critical sections (1 at a time per instance)
let chain = Promise.resolve();

function withSogniLock(fn) {
  const run = () => Promise.resolve().then(fn);
  const next = chain.then(run, run);
  // Keep chain from breaking on rejection
  chain = next.catch(() => {});
  return next;
}

module.exports = { withSogniLock };
