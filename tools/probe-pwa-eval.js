(async function () {
  if (!('serviceWorker' in navigator)) return 'serviceWorker не поддерживается';
  const timeout = new Promise(function (resolve) { setTimeout(function () { resolve('timeout'); }, 8000); });
  const check = (async function () {
    await new Promise(function (r) { setTimeout(r, 1200); });
    const regs = await navigator.serviceWorker.getRegistrations();
    const keys = await caches.keys();
    let cachedCount = 0;
    let hasMain = false;
    let hasIndex = false;
    for (const key of keys) {
      const cache = await caches.open(key);
      const reqs = await cache.keys();
      cachedCount = Math.max(cachedCount, reqs.length);
      hasMain = hasMain || reqs.some(function (r) { return r.url.endsWith('/src/main.js'); });
      hasIndex = hasIndex || reqs.some(function (r) { return r.url.endsWith('/index.html'); });
    }
    return {
      regs: regs.map(function (r) { return r.active ? r.active.scriptURL : ('waiting:' + r.scope); }),
      caches: keys,
      cachedCount: cachedCount,
      hasMain: hasMain,
      hasIndex: hasIndex
    };
  })();
  return Promise.race([check, timeout]);
})()
