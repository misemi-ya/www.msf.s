(() => {
  const CLOUD_BASE_URL = "https://loilo-9c765-default-rtdb.asia-southeast1.firebasedatabase.app";

  const normalizeSettings = (settings, defaults) => ({ ...(defaults || {}), ...(settings || {}) });
  const normalizeChangeHistory = (changeHistory) => {
    const source = changeHistory && typeof changeHistory === "object" ? changeHistory : {};
    const normalized = {};
    Object.entries(source).forEach(([key, value]) => {
      if (!value || typeof value !== "object") return;
      normalized[key] = {
        target: value.target || key,
        roleScope: value.roleScope || "student",
        action: value.action || "block",
        actorId: value.actorId || "-",
        actorSchoolId: value.actorSchoolId || "-",
        changedAt: value.changedAt || "",
        entries: Array.isArray(value.entries) ? value.entries.slice(0, 25) : [],
      };
    });
    return normalized;
  };

  const normalizeCore = (core, defaults) => ({
    settings: normalizeSettings(core?.settings, defaults),
    users: Array.isArray(core?.users) ? core.users : [],
    schools: Array.isArray(core?.schools) ? core.schools : [],
    changeHistory: normalizeChangeHistory(core?.changeHistory),
    blockReports: Array.isArray(core?.blockReports) ? core.blockReports.slice(0, 100) : [],
  });

  const fetchCloudJson = async (path, options = {}) => {
    const response = await fetch(`${CLOUD_BASE_URL}${path}.json`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Cloud request failed: ${response.status}`);
    return response.json();
  };

  const readCloudCore = async (defaults) => normalizeCore((await fetchCloudJson("/")) || {}, defaults);
  const writeCloudCore = async (core, defaults) => {
    const normalized = normalizeCore(core, defaults);
    await fetchCloudJson("/", { method: "PATCH", body: normalized });
    return normalized;
  };

  let lastSyncAt = 0;
  let syncPromise = null;

  const syncCoreData = async (defaults, options = {}) => {
    const force = Boolean(options.force);
    const minIntervalMs = options.minIntervalMs ?? 15000;
    if (!force && Date.now() - lastSyncAt < minIntervalMs && syncPromise === null) {
      return readCloudCore(defaults);
    }
    if (syncPromise) return syncPromise;
    syncPromise = (async () => {
      const cloudCore = await readCloudCore(defaults);
      lastSyncAt = Date.now();
      return cloudCore;
    })().finally(() => {
      syncPromise = null;
    });
    return syncPromise;
  };

  const updateCore = async (defaults, updater) => {
    const current = await readCloudCore(defaults);
    const next = normalizeCore(updater(current), defaults);
    return writeCloudCore(next, defaults);
  };

  const api = {
    syncCoreData,
    readLocalCore: readCloudCore,
    getSettings: async (defaults, options = {}) => (options.fresh ? await syncCoreData(defaults, options) : await readCloudCore(defaults)).settings,
    getUsers: async (defaults, options = {}) => (options.fresh ? await syncCoreData(defaults, options) : await readCloudCore(defaults)).users,
    getSchools: async (defaults, options = {}) => (options.fresh ? await syncCoreData(defaults, options) : await readCloudCore(defaults)).schools,
    getChangeHistory: async (defaults, options = {}) => (options.fresh ? await syncCoreData(defaults, options) : await readCloudCore(defaults)).changeHistory,
    getBlockReports: async (defaults, options = {}) => (options.fresh ? await syncCoreData(defaults, options) : await readCloudCore(defaults)).blockReports,
    saveSettings: async (settings, defaults) => (await updateCore(defaults, (core) => ({ ...core, settings }))).settings,
    saveUsers: async (users, defaults) => (await updateCore(defaults, (core) => ({ ...core, users: Array.isArray(users) ? users : [] }))).users,
    saveSchools: async (schools, defaults) => (await updateCore(defaults, (core) => ({ ...core, schools: Array.isArray(schools) ? schools : [] }))).schools,
    saveChangeHistory: async (changeHistory, defaults) => (await updateCore(defaults, (core) => ({ ...core, changeHistory }))).changeHistory,
    saveBlockReports: async (blockReports, defaults) => (await updateCore(defaults, (core) => ({ ...core, blockReports: Array.isArray(blockReports) ? blockReports.slice(0, 100) : [] }))).blockReports,
  };

  if (typeof self !== "undefined") self.MSEFILTER_CLOUD = api;
  if (typeof window !== "undefined") window.MSEFILTER_CLOUD = api;
})();