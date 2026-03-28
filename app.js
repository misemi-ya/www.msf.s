
(() => {
  const USERS_KEY = "msefilter-users";
  const LOG_KEY = "msefilter-logs";
  const SESSION_KEY = "msefilter-session";
  const SCHOOLS_KEY = "msefilter-schools";
  const CHANGE_HISTORY_KEY = "msefilter-site-change-history";
  const BLOCK_REPORT_KEY = "msefilter-block-report";
  const ACCESS_REPORT_KEY = "msefilter-access-report";
  const cloud = globalThis.MSEFILTER_CLOUD;

  const DEFAULTS = {
    displayName: "店大教育部作成 - ミセフィルタ",
    enabled: true,
    strictMode: false,
    allowKeywords: "education, study",
    blockKeywords: "adult, gambling",
    allowedUrls: "",
    blockedUrls: "",
    blockedCategoriesTeacher: [],
    blockedCategoriesStudent: [],
    studentAllowedUrls: "",
    studentBlockedUrls: "",
    temporaryAllowRules: [],
    customCategoryRules: "",
    globalBlockAllStudent: false,
    nightBlockEnabled: false,
    nightBlockStart: "22:00",
    nightBlockEnd: "06:00",
    quickAction: "allow",
  };

  const DEFAULT_SCHOOL_NAME = "本部管理学校";
  const CATEGORY_LIST = window.MSEFILTER_CATEGORIES?.list || [];
  const CATEGORY_KEYWORDS = window.MSEFILTER_CATEGORIES?.keywords || {};

  const els = {
    navItems: Array.from(document.querySelectorAll(".nav-item")),
    tabs: Array.from(document.querySelectorAll(".tab")),
    enabledToggle: document.getElementById("enabledToggle"),
    statusText: document.getElementById("statusText"),
    currentUserId: document.getElementById("currentUserId"),
    summaryStatus: document.getElementById("summaryStatus"),
    summaryStudentCategories: document.getElementById("summaryStudentCategories"),
    summaryHistoryCount: document.getElementById("summaryHistoryCount"),
    summaryTodayBlocks: document.getElementById("summaryTodayBlocks"),
    summaryTodayChanges: document.getElementById("summaryTodayChanges"),
    summarySuspendedUsers: document.getElementById("summarySuspendedUsers"),
    summaryTopBlockedUrl: document.getElementById("summaryTopBlockedUrl"),
    syncStatus: document.getElementById("syncStatus"),
    globalBlockToggle: document.getElementById("globalBlockToggle"),
    allowKeywords: document.getElementById("allowKeywords"),
    blockKeywords: document.getElementById("blockKeywords"),
    allowedUrls: document.getElementById("allowedUrls"),
    blockedUrls: document.getElementById("blockedUrls"),
    studentAllowedUrls: document.getElementById("studentAllowedUrls"),
    studentBlockedUrls: document.getElementById("studentBlockedUrls"),
    nightToggle: document.getElementById("nightToggle"),
    nightStart: document.getElementById("nightStart"),
    nightEnd: document.getElementById("nightEnd"),
    displayName: document.getElementById("displayName"),
    brandTitle: document.getElementById("brandTitle"),
    lastSaved: document.getElementById("lastSaved"),
    saveBtn: document.getElementById("saveBtn"),
    resetBtn: document.getElementById("resetBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    lockScreen: document.getElementById("lockScreen"),
    lockTitle: document.getElementById("lockTitle"),
    lockMessage: document.getElementById("lockMessage"),
    loginForm: document.getElementById("loginForm"),
    loginSchoolId: document.getElementById("loginSchoolId"),
    loginId: document.getElementById("loginId"),
    loginPassword: document.getElementById("loginPassword"),
    setupForm: document.getElementById("setupForm"),
    setupSchoolId: document.getElementById("setupSchoolId"),
    setupId: document.getElementById("setupId"),
    setupPassword: document.getElementById("setupPassword"),
    setupConfirm: document.getElementById("setupConfirm"),
    schoolAdminCard: document.getElementById("schoolAdminCard"),
    schoolId: document.getElementById("schoolId"),
    schoolName: document.getElementById("schoolName"),
    addSchoolBtn: document.getElementById("addSchoolBtn"),
    schoolList: document.getElementById("schoolList"),
    userSchoolId: document.getElementById("userSchoolId"),
    bulkSchoolId: document.getElementById("bulkSchoolId"),
    bulkStudents: document.getElementById("bulkStudents"),
    bulkAddBtn: document.getElementById("bulkAddBtn"),
    bulkDeleteBtn: document.getElementById("bulkDeleteBtn"),
    testUrl: document.getElementById("testUrl"),
    runTest: document.getElementById("runTest"),
    testCategory: document.getElementById("testCategory"),
    testDecisionStudent: document.getElementById("testDecisionStudent"),
    logList: document.getElementById("logList"),
    siteHistoryList: document.getElementById("siteHistoryList"),
    blockReportList: document.getElementById("blockReportList"),
    accessReportList: document.getElementById("accessReportList"),
    reportSearch: document.getElementById("reportSearch"),
    blockReportSearch: document.getElementById("blockReportSearch"),
    accessReportSearch: document.getElementById("accessReportSearch"),
    exportUrlReportBtn: document.getElementById("exportUrlReportBtn"),
    exportBlockReportBtn: document.getElementById("exportBlockReportBtn"),
    exportAccessReportBtn: document.getElementById("exportAccessReportBtn"),
    deviceSummary: document.getElementById("deviceSummary"),
    deviceTimeline: document.getElementById("deviceTimeline"),
    studentCategoryContainer: document.getElementById("studentCategoryContainer"),
    studentCategorySearch: document.getElementById("studentCategorySearch"),
    studentCategoryCount: document.getElementById("studentCategoryCount"),
    customCategoryRules: document.getElementById("customCategoryRules"),
    userId: document.getElementById("userId"),
    userRole: document.getElementById("userRole"),
    userSearch: document.getElementById("userSearch"),
    userPassword: document.getElementById("userPassword"),
    userPasswordConfirm: document.getElementById("userPasswordConfirm"),
    addUserBtn: document.getElementById("addUserBtn"),
    userList: document.getElementById("userList"),
  };

  let studentBlockedSet = new Set();
  let openStudentCategoryGroups = new Set();
  let openUserDetails = new Set();
  let currentSettings = { ...DEFAULTS };
  let currentSession = null;
  let saveTimer = null;
  let hasUnsavedSettings = false;
  let isTypingForm = false;
  let typingTimer = null;
  let activeTabId = "dashboard";

  const normalizeRole = (role) => (role === "teacher" ? "admin" : role || "student");
  const isSuper = (session) => normalizeRole(session?.role) === "super";
  const isAdmin = (session) => ["admin", "super"].includes(normalizeRole(session?.role));
  const roleLabel = (role) => normalizeRole(role) === "super" ? "本部管理者" : normalizeRole(role) === "admin" ? "学校管理者" : "生徒";
  const sanitizeCommaList = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean).join(", ");
  const sanitizeLineList = (value) => String(value || "").split("\n").map((line) => line.trim()).filter(Boolean).join("\n");
  const parseCsv = (value) => String(value || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const parseLines = (value) => String(value || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const nowMs = () => Date.now();
  const isFuture = (value) => {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) && time > nowMs();
  };
  const isSuspendedUser = (user) => Boolean(user?.suspendedPermanent || isFuture(user?.suspendedUntil));
  const getSuspendedLabel = (user) => user?.suspendedPermanent ? "一時停止中（解除するまで継続）" : isFuture(user?.suspendedUntil) ? `一時停止中（${formatDateTime(user.suspendedUntil)}まで）` : "利用可能";
  const toIsoAfterMinutes = (minutes) => new Date(nowMs() + minutes * 60 * 1000).toISOString();
  const safeUrl = (value) => { try { return new URL(value); } catch { return null; } };
  const parseRuleUrl = (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return null;
    return safeUrl(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  };
  const normalizeVideoTarget = (value) => {
    const parsed = safeUrl(value);
    if (!parsed) return "";
    const host = parsed.hostname.toLowerCase();
    if ((host.includes("youtube.com") || host === "youtu.be") && (parsed.searchParams.get("v") || parsed.pathname.startsWith("/embed/"))) {
      const videoId = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop() || "";
      if (videoId) return parsed.pathname.startsWith("/embed/") ? `https://www.youtube.com/embed/${videoId}` : `https://www.youtube.com/watch?v=${videoId}`;
    }
    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  };
  const normalizeTemporaryRules = (rules) => (Array.isArray(rules) ? rules : []).filter((rule) => rule?.target && isFuture(rule.expiresAt));
  const parseCustomCategoryRules = (value) => String(value || "").split("\n").map((line) => line.trim()).filter(Boolean).reduce((map, line) => {
    const [left, ...rest] = line.split(":");
    const categoryId = left?.trim();
    if (!categoryId || rest.length === 0) return map;
    const keywords = rest.join(":").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (keywords.length > 0) map[categoryId] = keywords;
    return map;
  }, {});
  const buildCategoryKeywords = (settings) => {
    const merged = {};
    Object.entries(CATEGORY_KEYWORDS).forEach(([categoryId, keywords]) => {
      const baseKeywords = Array.isArray(keywords) ? keywords.map((item) => String(item).toLowerCase()) : [];
      merged[categoryId] = categoryId.startsWith("youtube_") ? baseKeywords.filter((item) => item !== "youtube") : baseKeywords;
    });
    Object.entries(parseCustomCategoryRules(settings?.customCategoryRules || "")).forEach(([categoryId, keywords]) => {
      merged[categoryId] = Array.from(new Set([...(merged[categoryId] || []), ...keywords]));
    });
    return merged;
  };
  const formatDateTime = (value) => value ? new Date(value).toLocaleString("ja-JP") : "-";
  const getUrlRuleMode = (url, settings = currentSettings) => {
    const blockedRules = [...parseLines(settings.blockedUrls || ""), ...parseLines(settings.studentBlockedUrls || "")];
    const allowedRules = [...parseLines(settings.allowedUrls || ""), ...parseLines(settings.studentAllowedUrls || "")];
    if (blockedRules.some((rule) => matchesUrlRule(url, rule))) return "block";
    if (allowedRules.some((rule) => matchesUrlRule(url, rule))) return "allow";
    return "allow";
  };

  const updateUrlRuleState = async (targetUrl, mode) => {
    const normalizedTarget = normalizeVideoTarget(targetUrl);
    const nextBlocked = parseLines(currentSettings.studentBlockedUrls || "").filter((rule) => !matchesUrlRule(normalizedTarget, rule));
    const nextAllowed = parseLines(currentSettings.studentAllowedUrls || "").filter((rule) => !matchesUrlRule(normalizedTarget, rule));
    if (mode === "block") nextBlocked.unshift(normalizedTarget);
    else nextAllowed.unshift(normalizedTarget);
    const nextSettings = {
      ...currentSettings,
      studentBlockedUrls: nextBlocked.join("\n"),
      studentAllowedUrls: nextAllowed.join("\n"),
    };
    await saveSettingsToStorage(nextSettings);
    await applySettingsToForm(nextSettings);
    clearSettingsDirty(`閲覧ルールを${mode === "block" ? "ブロック" : "許可"}に更新しました。`);
    await renderSiteHistory();
    await renderBlockReports();
    await renderAccessReports();
  };

  const buildReportSwitch = (url) => {
    const switchEl = document.createElement("div");
    switchEl.className = "category-mode-switch";
    const syncMode = () => {
      switchEl.dataset.mode = getUrlRuleMode(url, currentSettings);
      allowButton.classList.toggle("active", switchEl.dataset.mode === "allow");
      blockButton.classList.toggle("active", switchEl.dataset.mode === "block");
    };
    const allowButton = document.createElement("button");
    allowButton.type = "button";
    allowButton.className = "category-mode-btn";
    allowButton.textContent = "許可";
    allowButton.addEventListener("click", async () => {
      await updateUrlRuleState(url, "allow");
      syncMode();
    });
    const blockButton = document.createElement("button");
    blockButton.type = "button";
    blockButton.className = "category-mode-btn";
    blockButton.textContent = "ブロック";
    blockButton.addEventListener("click", async () => {
      await updateUrlRuleState(url, "block");
      syncMode();
    });
    switchEl.appendChild(allowButton);
    switchEl.appendChild(blockButton);
    syncMode();
    return switchEl;
  };

  const toCsv = (rows) => rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, "\"\"")}"`).join(",")).join("\r\n");
  const downloadCsv = (filename, rows) => {
    const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const matchesSearch = (text, search) => !search || String(text || "").toLowerCase().includes(search);
  const isEditingUserPanel = () => {
    if (activeTabId !== "settings") return false;
    const active = document.activeElement;
    return Boolean(active && (active.closest("#userList") || active.closest(".bulk-box")));
  };
  const matchesUrlRule = (url, rule) => {
    const normalizedUrl = normalizeVideoTarget(url);
    if (!normalizedUrl) return false;
    const urlObject = safeUrl(normalizedUrl);
    const ruleObject = parseRuleUrl(rule);
    if (!urlObject || !ruleObject) return false;
    const isRuleSpecificUrl = Boolean((ruleObject.pathname && ruleObject.pathname !== "/") || ruleObject.search);
    if (isRuleSpecificUrl) return normalizedUrl.toLowerCase() === normalizeVideoTarget(ruleObject.href).toLowerCase();
    return urlObject.hostname.toLowerCase() === ruleObject.hostname.toLowerCase();
  };
  const bufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const base64ToBuffer = (base64) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const hashPassword = async (password, saltBuffer) => {
    const encoder = new TextEncoder();
    const passBytes = encoder.encode(password);
    const combined = new Uint8Array(saltBuffer.length + passBytes.length);
    combined.set(saltBuffer);
    combined.set(passBytes, saltBuffer.length);
    return bufferToBase64(await crypto.subtle.digest("SHA-256", combined));
  };

  const createUser = async (id, role, schoolId, password) => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return { id, role: normalizeRole(role), schoolId, salt: bufferToBase64(salt), hash: await hashPassword(password, salt), createdAt: new Date().toISOString() };
  };

  const migrateSettings = (settings) => {
    const merged = { ...DEFAULTS, ...(settings || {}) };
    if ((merged.blockedCategoriesTeacher || []).length === 0 && (merged.blockedCategoriesStudent || []).length === 0 && Array.isArray(merged.blockedCategories)) {
      merged.blockedCategoriesStudent = [...merged.blockedCategories];
    }
    merged.temporaryAllowRules = normalizeTemporaryRules(merged.temporaryAllowRules);
    return merged;
  };

  const loadSettings = async () => {
    const settings = await cloud.getSettings(DEFAULTS, { fresh: true, minIntervalMs: 1500 });
    currentSettings = migrateSettings(settings);
    return currentSettings;
  };

  const saveSettingsToStorage = async (settings) => {
    currentSettings = migrateSettings(settings);
    await cloud.saveSettings(currentSettings, DEFAULTS);
  };

  const loadUsers = async () => {
    const users = await cloud.getUsers(DEFAULTS, { fresh: true, minIntervalMs: 1500 });
    return users.map((user) => ({ ...user, role: normalizeRole(user.role) }));
  };
  const saveUsers = async (users) => cloud.saveUsers(users, DEFAULTS);
  const loadSchools = async () => cloud.getSchools(DEFAULTS, { fresh: true, minIntervalMs: 1500 });
  const saveSchools = async (schools) => cloud.saveSchools(schools, DEFAULTS);
  const loadChangeHistory = async () => cloud.getChangeHistory(DEFAULTS, { fresh: true, minIntervalMs: 1500 });
  const loadBlockReports = async () => cloud.getBlockReports(DEFAULTS, { fresh: true, minIntervalMs: 1500 });
  const loadAccessReports = async () => cloud.getAccessReports(DEFAULTS, { fresh: true, minIntervalMs: 1500 });
  const readLocalJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const writeLocalJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const loadSession = async () => readLocalJson(SESSION_KEY, null);
  const saveSession = async (session) => { currentSession = session; writeLocalJson(SESSION_KEY, session); };
  const clearSession = async () => { currentSession = null; localStorage.removeItem(SESSION_KEY); };

  const addLog = async (message) => {
    const logs = readLocalJson(LOG_KEY, []);
    logs.unshift({ message, time: new Date().toLocaleString("ja-JP") });
    writeLocalJson(LOG_KEY, logs.slice(0, 50));
    await renderLogs();
  };

  const renderLogs = async () => {
    const logs = readLocalJson(LOG_KEY, []);
    els.logList.innerHTML = "";
    if (logs.length === 0) {
      const li = document.createElement("li");
      li.textContent = "ログはまだありません。";
      els.logList.appendChild(li);
      return;
    }
    logs.forEach((log) => {
      const li = document.createElement("li");
      li.textContent = `${log.time} - ${log.message}`;
      els.logList.appendChild(li);
    });
  };

  const classifyUrl = (url, settings = currentSettings) => {
    const lower = String(url || "").toLowerCase();
    const isYoutubeUrl = lower.includes("youtube.com") || lower.includes("youtu.be");
    const keywordEntries = Object.entries(buildCategoryKeywords(settings));
    const scopedEntries = isYoutubeUrl ? keywordEntries.filter(([categoryId]) => categoryId.startsWith("youtube_")) : keywordEntries.filter(([categoryId]) => !categoryId.startsWith("youtube_"));
    for (const [category, keywords] of scopedEntries) {
      if (keywords.some((word) => lower.includes(String(word).toLowerCase()))) return category;
    }
    if (isYoutubeUrl) return "youtube_other";
    return "unclassified";
  };

  const getCategoryLabel = (categoryId) => CATEGORY_LIST.find((item) => item.id === categoryId)?.label || (categoryId === "unclassified" ? "未分類" : categoryId);
  const isWithinNightWindow = (start, end) => {
    const now = new Date();
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (startMinutes === endMinutes) return false;
    return startMinutes < endMinutes ? currentMinutes >= startMinutes && currentMinutes < endMinutes : currentMinutes >= startMinutes || currentMinutes < endMinutes;
  };

  const decideUrlForRole = (url, settings, role) => {
    if (role === "teacher") return "許可";
    const lower = String(url || "").toLowerCase();
    const allowKeywords = parseCsv(settings.allowKeywords || "");
    const blockKeywords = parseCsv(settings.blockKeywords || "");
    const sharedAllowed = parseLines(settings.allowedUrls || "");
    const sharedBlocked = parseLines(settings.blockedUrls || "");
    const roleAllowed = parseLines(settings.studentAllowedUrls);
    const roleBlocked = parseLines(settings.studentBlockedUrls);
    const temporaryAllowed = normalizeTemporaryRules(settings.temporaryAllowRules).some((rule) => matchesUrlRule(url, rule.target));
    const categoryId = classifyUrl(url, settings);
    const categoryGroup = categoryId.split("_")[0];
    const roleCategorySet = new Set(settings.blockedCategoriesStudent || []);

    if (settings.globalBlockAllStudent) return "全ページブロック中";
    if (temporaryAllowed) return "一時許可";
    if (sharedAllowed.some((item) => matchesUrlRule(url, item)) || roleAllowed.some((item) => matchesUrlRule(url, item)) || allowKeywords.some((item) => lower.includes(item))) return "許可";
    if (sharedBlocked.some((item) => matchesUrlRule(url, item)) || roleBlocked.some((item) => matchesUrlRule(url, item))) return "個別URL設定によりブロック";
    if (settings.nightBlockEnabled && isWithinNightWindow(settings.nightBlockStart || "22:00", settings.nightBlockEnd || "06:00")) return "夜間制限によりブロック";
    if (settings.strictMode) return "許可URL設定がないためブロック";
    if (roleCategorySet.has(categoryId) || roleCategorySet.has(`group:${categoryGroup}`)) return `${getCategoryLabel(categoryId)} カテゴリによりブロック`;
    if (blockKeywords.some((item) => lower.includes(item))) return "キーワード設定によりブロック";
    return "許可";
  };

  const showLock = (mode, message) => {
    els.lockMessage.textContent = message;
    els.lockTitle.textContent = mode === "setup" ? "初回セットアップ" : "管理画面ログイン";
    els.loginForm.classList.toggle("lock-hidden", mode !== "login");
    els.setupForm.classList.toggle("lock-hidden", mode !== "setup");
    els.lockScreen.classList.remove("lock-hidden");
  };
  const hideLock = () => els.lockScreen.classList.add("lock-hidden");
  const setStatus = (enabled) => {
    const text = enabled ? "有効" : "無効";
    els.statusText.textContent = text;
    els.summaryStatus.textContent = text;
  };
  const updateCurrentUserLabel = () => {
    els.currentUserId.textContent = currentSession ? `${currentSession.schoolId} / ${currentSession.id} (${roleLabel(currentSession.role)})` : "-";
  };
  const updateSummary = async (settings) => {
    const [history, reports, users] = await Promise.all([loadChangeHistory(), loadBlockReports(), loadUsers()]);
    const visibleReports = isSuper(currentSession) ? reports : reports.filter((item) => item.schoolId === currentSession?.schoolId);
    const todayKey = new Date().toLocaleDateString("ja-JP");
    const todayBlocks = visibleReports.filter((item) => item.blockedAt && new Date(item.blockedAt).toLocaleDateString("ja-JP") === todayKey);
    const todayChanges = Object.values(history).flatMap((item) => item.entries || []).filter((entry) => entry.changedAt && new Date(entry.changedAt).toLocaleDateString("ja-JP") === todayKey && (isSuper(currentSession) || entry.actorSchoolId === currentSession?.schoolId));
    const suspendedUsers = users.filter((user) => isSuspendedUser(user) && (isSuper(currentSession) || user.schoolId === currentSession?.schoolId));
    const topBlocked = todayBlocks.reduce((map, item) => map.set(item.url, (map.get(item.url) || 0) + 1), new Map());
    const topBlockedEntry = Array.from(topBlocked.entries()).sort((a, b) => b[1] - a[1])[0];
    setStatus(settings.enabled);
    els.summaryStudentCategories.textContent = String((settings.blockedCategoriesStudent || []).length);
    els.summaryHistoryCount.textContent = String(Object.keys(history).length);
    els.summaryTodayBlocks.textContent = String(todayBlocks.length);
    els.summaryTodayChanges.textContent = String(todayChanges.length);
    els.summarySuspendedUsers.textContent = String(suspendedUsers.length);
    els.summaryTopBlockedUrl.textContent = `よくブロックされているURL: ${topBlockedEntry ? `${topBlockedEntry[0]} (${topBlockedEntry[1]}件)` : "-"}`;
    els.syncStatus.textContent = cloud ? "同期先: Firebase Realtime Database" : "同期先: ローカル保存";
  };
  const groupedCategories = () => {
    const groups = new Map();
    CATEGORY_LIST.forEach((item) => {
      const separator = " / ";
      const splitIndex = item.label.indexOf(separator);
      const groupName = splitIndex >= 0 ? item.label.slice(0, splitIndex).trim() : item.label.trim();
      const childName = splitIndex >= 0 ? item.label.slice(splitIndex + separator.length).trim() : item.label.trim();
      const groupKey = item.id.split("_")[0];
      const key = groupName || "その他";
      if (!groups.has(groupKey)) groups.set(groupKey, { groupName: key, items: [] });
      groups.get(groupKey).items.push({ ...item, childLabel: childName || item.label });
    });
    return Array.from(groups.entries()).map(([groupKey, value]) => ({ groupKey, groupName: value.groupName, items: value.items }));
  };

  const renderCategoryGroupSet = ({ container, countEl, blockedSet, filterText, openGroups }) => {
    const filter = filterText.trim().toLowerCase();
    const groups = groupedCategories().filter(({ groupName, items }) => !filter || groupName.toLowerCase().includes(filter) || items.some((item) => item.label.toLowerCase().includes(filter)));
    container.innerHTML = "";
    let visibleCount = 0;

    groups.forEach(({ groupKey, groupName, items }) => {
      const details = document.createElement("details");
      details.className = "category-group";
      details.open = openGroups?.has(groupKey);
      details.addEventListener("toggle", () => {
        if (!openGroups) return;
        if (details.open) openGroups.add(groupKey);
        else openGroups.delete(groupKey);
      });
      const summary = document.createElement("summary");
      const left = document.createElement("div");
      left.className = "category-summary-left";
      const chevron = document.createElement("span");
      chevron.className = "category-chevron";
      chevron.textContent = "⌄";
      const titleWrap = document.createElement("div");
      const title = document.createElement("p");
      title.className = "category-summary-title";
      title.textContent = groupName;
      const meta = document.createElement("p");
      meta.className = "category-summary-meta";
      meta.textContent = `${items.length}件の小分類`;
      titleWrap.appendChild(title);
      titleWrap.appendChild(meta);
      left.appendChild(chevron);
      left.appendChild(titleWrap);

      const groupToggle = document.createElement("div");
      groupToggle.className = "category-mode-switch";
      groupToggle.addEventListener("click", (event) => event.stopPropagation());
      const groupAllow = document.createElement("button");
      groupAllow.type = "button";
      groupAllow.className = "category-mode-btn";
      groupAllow.textContent = "許可";
      const groupBlock = document.createElement("button");
      groupBlock.type = "button";
      groupBlock.className = "category-mode-btn";
      groupBlock.textContent = "ブロック";
      const updateGroupUi = () => {
        const blocked = blockedSet.has(`group:${groupKey}`);
        groupToggle.dataset.mode = blocked ? "block" : "allow";
        groupAllow.classList.toggle("active", !blocked);
        groupBlock.classList.toggle("active", blocked);
      };
      groupAllow.addEventListener("click", () => {
        blockedSet.delete(`group:${groupKey}`);
        updateGroupUi();
        markSettingsDirty();
      });
      groupBlock.addEventListener("click", () => {
        blockedSet.add(`group:${groupKey}`);
        updateGroupUi();
        markSettingsDirty();
      });
      groupToggle.appendChild(groupAllow);
      groupToggle.appendChild(groupBlock);
      updateGroupUi();
      summary.appendChild(left);
      summary.appendChild(groupToggle);
      details.appendChild(summary);

      const grid = document.createElement("div");
      grid.className = "category-child-grid";
      items.forEach((item) => {
        visibleCount += 1;
        const label = document.createElement("label");
        label.className = "category-chip";
        const titleText = document.createElement("span");
        titleText.className = "category-chip-label";
        titleText.textContent = item.childLabel;
        const switchWrap = document.createElement("div");
        switchWrap.className = "category-mode-switch";
        const allowBtn = document.createElement("button");
        allowBtn.type = "button";
        allowBtn.className = "category-mode-btn";
        allowBtn.textContent = "許可";
        const blockBtn = document.createElement("button");
        blockBtn.type = "button";
        blockBtn.className = "category-mode-btn";
        blockBtn.textContent = "ブロック";
        const updateItemUi = () => {
          const blocked = blockedSet.has(item.id);
          switchWrap.dataset.mode = blocked ? "block" : "allow";
          allowBtn.classList.toggle("active", !blocked);
          blockBtn.classList.toggle("active", blocked);
        };
        allowBtn.addEventListener("click", () => {
          blockedSet.delete(item.id);
          updateItemUi();
          markSettingsDirty();
        });
        blockBtn.addEventListener("click", () => {
          blockedSet.add(item.id);
          updateItemUi();
          markSettingsDirty();
        });
        switchWrap.appendChild(allowBtn);
        switchWrap.appendChild(blockBtn);
        updateItemUi();
        label.appendChild(titleText);
        label.appendChild(switchWrap);
        grid.appendChild(label);
      });
      details.appendChild(grid);
      container.appendChild(details);
    });

    countEl.textContent = `${visibleCount}件を表示しています。`;
  };

  const applySettingsToForm = async (settings) => {
    els.enabledToggle.checked = Boolean(settings.enabled);
    setStatus(Boolean(settings.enabled));
    els.allowKeywords.value = settings.allowKeywords || "";
    els.blockKeywords.value = settings.blockKeywords || "";
    els.globalBlockToggle.checked = Boolean(settings.globalBlockAllStudent);
    els.allowedUrls.value = settings.allowedUrls || "";
    els.blockedUrls.value = settings.blockedUrls || "";
    els.studentAllowedUrls.value = settings.studentAllowedUrls || "";
    els.studentBlockedUrls.value = settings.studentBlockedUrls || "";
    els.nightToggle.checked = Boolean(settings.nightBlockEnabled);
    els.nightStart.value = settings.nightBlockStart || "22:00";
    els.nightEnd.value = settings.nightBlockEnd || "06:00";
    els.displayName.value = settings.displayName || DEFAULTS.displayName;
    els.customCategoryRules.value = settings.customCategoryRules || "";
    els.brandTitle.textContent = settings.displayName || DEFAULTS.displayName;
    studentBlockedSet = new Set(settings.blockedCategoriesStudent || []);
    renderCategoryGroupSet({ container: els.studentCategoryContainer, countEl: els.studentCategoryCount, blockedSet: studentBlockedSet, filterText: els.studentCategorySearch.value || "", openGroups: openStudentCategoryGroups });
    await updateSummary(settings);
  };

  const updateDirtyUi = () => {
    els.saveBtn.disabled = !hasUnsavedSettings;
    if (hasUnsavedSettings) {
      els.lastSaved.textContent = "未保存の変更があります。保存するまでタブを切り替えられません。";
    } else if (!String(els.lastSaved.textContent || "").trim()) {
      els.lastSaved.textContent = "保存済みです。";
    }
  };

  const markSettingsDirty = () => {
    hasUnsavedSettings = true;
    updateDirtyUi();
  };

  const clearSettingsDirty = (message) => {
    hasUnsavedSettings = false;
    els.lastSaved.textContent = message || `保存しました: ${new Date().toLocaleTimeString("ja-JP")}`;
    updateDirtyUi();
  };

  const collectSettings = () => ({
    displayName: els.displayName.value.trim() || DEFAULTS.displayName,
    enabled: els.enabledToggle.checked,
    strictMode: currentSettings.strictMode || false,
    globalBlockAllStudent: els.globalBlockToggle.checked,
    allowKeywords: sanitizeCommaList(els.allowKeywords.value),
    blockKeywords: sanitizeCommaList(els.blockKeywords.value),
    allowedUrls: sanitizeLineList(els.allowedUrls.value),
    blockedUrls: sanitizeLineList(els.blockedUrls.value),
    studentAllowedUrls: sanitizeLineList(els.studentAllowedUrls.value),
    studentBlockedUrls: sanitizeLineList(els.studentBlockedUrls.value),
    temporaryAllowRules: normalizeTemporaryRules(currentSettings.temporaryAllowRules),
    customCategoryRules: sanitizeLineList(els.customCategoryRules.value),
    blockedCategoriesStudent: Array.from(studentBlockedSet),
    nightBlockEnabled: els.nightToggle.checked,
    nightBlockStart: els.nightStart.value || "22:00",
    nightBlockEnd: els.nightEnd.value || "06:00",
    quickAction: currentSettings.quickAction || "allow",
  });

  const saveSettings = async (source = "manual") => {
    const settings = collectSettings();
    await saveSettingsToStorage(settings);
    await applySettingsToForm(settings);
    clearSettingsDirty(`${source === "auto" ? "自動保存" : "保存"}しました: ${new Date().toLocaleTimeString("ja-JP")}`);
  };

  const collectAutoSettings = () => ({
    ...currentSettings,
    enabled: els.enabledToggle.checked,
    globalBlockAllStudent: els.globalBlockToggle.checked,
    temporaryAllowRules: normalizeTemporaryRules(currentSettings.temporaryAllowRules),
    blockedCategoriesStudent: Array.from(studentBlockedSet),
    nightBlockEnabled: els.nightToggle.checked,
  });

  const saveAutoSettings = async () => {
    const settings = collectAutoSettings();
    await saveSettingsToStorage(settings);
    await updateSummary(settings);
    els.lastSaved.textContent = `自動保存しました: ${new Date().toLocaleTimeString("ja-JP")}`;
  };

  const queueSave = (source = "auto") => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveAutoSettings(source); }, 250);
  };

  const renderSchools = async () => {
    const schools = await loadSchools();
    els.schoolList.innerHTML = "";
    if (schools.length === 0) {
      const li = document.createElement("li");
      li.textContent = "学校はまだありません。";
      els.schoolList.appendChild(li);
      return;
    }
    schools.forEach((school) => {
      const li = document.createElement("li");
      li.textContent = `${school.id} - ${school.name}`;
      els.schoolList.appendChild(li);
    });
  };

  const renderSchoolOptions = async () => {
    const schools = await loadSchools();
    [els.userSchoolId, els.bulkSchoolId].forEach((select) => {
      select.innerHTML = "";
      schools.forEach((school) => {
        const option = document.createElement("option");
        option.value = school.id;
        option.textContent = `${school.id} - ${school.name}`;
        select.appendChild(option);
      });
    });
    if (currentSession?.schoolId) {
      els.userSchoolId.value = currentSession.schoolId;
      els.bulkSchoolId.value = currentSession.schoolId;
    }
    els.userSchoolId.disabled = !isSuper(currentSession);
    els.bulkSchoolId.disabled = !isSuper(currentSession);
  };

  const renderRoleOptions = () => {
    els.userRole.innerHTML = "";
    if (isSuper(currentSession)) {
      const adminOption = document.createElement("option");
      adminOption.value = "admin";
      adminOption.textContent = "学校管理者";
      els.userRole.appendChild(adminOption);
    }
    const studentOption = document.createElement("option");
    studentOption.value = "student";
    studentOption.textContent = "生徒";
    els.userRole.appendChild(studentOption);
  };

  const renderAccessControls = async () => {
    els.schoolAdminCard.style.display = isSuper(currentSession) ? "block" : "none";
    await renderSchools();
    await renderSchoolOptions();
    renderRoleOptions();
  };
  const renderUsers = async () => {
    const [users, schools] = await Promise.all([loadUsers(), loadSchools()]);
    const schoolMap = new Map(schools.map((school) => [school.id, school.name]));
    const search = String(els.userSearch?.value || "").trim().toLowerCase();
    const visibleUsers = (isSuper(currentSession) ? users : users.filter((user) => user.schoolId === currentSession?.schoolId && user.role !== "super"))
      .filter((user) => {
        const haystack = `${user.schoolId} ${user.id} ${roleLabel(user.role)} ${schoolMap.get(user.schoolId) || ""}`.toLowerCase();
        return matchesSearch(haystack, search);
      });
    els.userList.innerHTML = "";
    if (visibleUsers.length === 0) {
      const empty = document.createElement("div");
      empty.className = "school-group";
      empty.textContent = "表示できるユーザーがいません。";
      els.userList.appendChild(empty);
      return;
    }
    const groupedUsers = visibleUsers.reduce((map, user) => {
      const list = map.get(user.schoolId) || [];
      list.push(user);
      map.set(user.schoolId, list);
      return map;
    }, new Map());

    groupedUsers.forEach((groupUsers, schoolId) => {
      const section = document.createElement("section");
      section.className = "school-group";
      const title = document.createElement("p");
      title.className = "school-group-title";
      title.textContent = schoolMap.get(schoolId) || schoolId;
      const meta = document.createElement("p");
      meta.className = "school-group-meta";
      meta.textContent = `${schoolId} / ${groupUsers.length}人`;
      section.appendChild(title);
      section.appendChild(meta);

      groupUsers.forEach((user) => {
        const userKey = `${user.schoolId}:${user.id}`;
        const details = document.createElement("details");
        details.className = "user-item";
        details.open = openUserDetails.has(userKey);
        details.addEventListener("toggle", () => {
          if (details.open) openUserDetails.add(userKey);
          else openUserDetails.delete(userKey);
        });
        const summary = document.createElement("summary");
        const main = document.createElement("div");
        main.className = "user-summary-main";
        const chevron = document.createElement("span");
        chevron.className = "user-chevron";
        chevron.textContent = "⌄";
        const text = document.createElement("div");
        text.innerHTML = `<strong>${user.id}</strong><div class="muted">${schoolId}</div>`;
        main.appendChild(chevron);
        main.appendChild(text);
        const badge = document.createElement("span");
        badge.className = "user-badge";
        badge.textContent = roleLabel(user.role);
        summary.appendChild(main);
        summary.appendChild(badge);
        details.appendChild(summary);

        const body = document.createElement("div");
        body.className = "user-body";
        const grid = document.createElement("div");
        grid.className = "user-detail-grid";
        grid.innerHTML = `<div><strong>学校ID</strong><div class="muted">${user.schoolId}</div></div><div><strong>権限</strong><div class="muted">${roleLabel(user.role)}</div></div><div><strong>作成日時</strong><div class="muted">${user.createdAt ? new Date(user.createdAt).toLocaleString("ja-JP") : "-"}</div></div><div><strong>利用状態</strong><div class="muted">${getSuspendedLabel(user)}</div></div>`;
        body.appendChild(grid);

        const canDelete = isSuper(currentSession) || (normalizeRole(currentSession?.role) === "admin" && user.role === "student" && user.schoolId === currentSession.schoolId);
        const canSuspend = (isSuper(currentSession) && user.id !== currentSession?.id) || (normalizeRole(currentSession?.role) === "admin" && normalizeRole(user.role) === "student" && user.schoolId === currentSession.schoolId);
        if (canSuspend) {
          const actionRow = document.createElement("div");
          actionRow.className = "row";
          const customUntil = document.createElement("input");
          customUntil.type = "datetime-local";
          customUntil.className = "ghost";
          customUntil.style.flex = "1 1 240px";
          const suspend10 = document.createElement("button");
          suspend10.className = "ghost";
          suspend10.type = "button";
          suspend10.textContent = "10分停止";
          suspend10.addEventListener("click", async () => {
            const nextUsers = (await loadUsers()).map((itemUser) => itemUser.id === user.id && itemUser.schoolId === user.schoolId ? { ...itemUser, suspendedUntil: toIsoAfterMinutes(10), suspendedPermanent: false } : itemUser);
            await saveUsers(nextUsers);
            await addLog(`${user.schoolId}/${user.id} を10分停止しました。`);
            await renderUsers();
            await updateSummary(await loadSettings());
          });
          const suspend60 = document.createElement("button");
          suspend60.className = "ghost";
          suspend60.type = "button";
          suspend60.textContent = "1時間停止";
          suspend60.addEventListener("click", async () => {
            const nextUsers = (await loadUsers()).map((itemUser) => itemUser.id === user.id && itemUser.schoolId === user.schoolId ? { ...itemUser, suspendedUntil: toIsoAfterMinutes(60), suspendedPermanent: false } : itemUser);
            await saveUsers(nextUsers);
            await addLog(`${user.schoolId}/${user.id} を1時間停止しました。`);
            await renderUsers();
            await updateSummary(await loadSettings());
          });
          const suspendCustom = document.createElement("button");
          suspendCustom.className = "ghost";
          suspendCustom.type = "button";
          suspendCustom.textContent = "指定日時まで停止";
          suspendCustom.addEventListener("click", async () => {
            const targetTime = customUntil.value ? new Date(customUntil.value).toISOString() : "";
            if (!targetTime || !isFuture(targetTime)) {
              els.lastSaved.textContent = "停止終了日時を現在より後に設定してください。";
              return;
            }
            const nextUsers = (await loadUsers()).map((itemUser) => itemUser.id === user.id && itemUser.schoolId === user.schoolId ? { ...itemUser, suspendedUntil: targetTime, suspendedPermanent: false } : itemUser);
            await saveUsers(nextUsers);
            await addLog(`${user.schoolId}/${user.id} を ${formatDateTime(targetTime)} まで停止しました。`);
            await renderUsers();
            await updateSummary(await loadSettings());
          });
          const suspendForever = document.createElement("button");
          suspendForever.className = "ghost";
          suspendForever.type = "button";
          suspendForever.textContent = "一時停止";
          suspendForever.addEventListener("click", async () => {
            const nextUsers = (await loadUsers()).map((itemUser) => itemUser.id === user.id && itemUser.schoolId === user.schoolId ? { ...itemUser, suspendedUntil: "", suspendedPermanent: true } : itemUser);
            await saveUsers(nextUsers);
            await addLog(`${user.schoolId}/${user.id} を一時停止しました。`);
            await renderUsers();
            await updateSummary(await loadSettings());
          });
          const suspendClear = document.createElement("button");
          suspendClear.className = "ghost";
          suspendClear.type = "button";
          suspendClear.textContent = "停止解除";
          suspendClear.addEventListener("click", async () => {
            const nextUsers = (await loadUsers()).map((itemUser) => itemUser.id === user.id && itemUser.schoolId === user.schoolId ? { ...itemUser, suspendedUntil: "", suspendedPermanent: false } : itemUser);
            await saveUsers(nextUsers);
            await addLog(`${user.schoolId}/${user.id} の停止を解除しました。`);
            await renderUsers();
            await updateSummary(await loadSettings());
          });
          actionRow.appendChild(customUntil);
          actionRow.appendChild(suspend10);
          actionRow.appendChild(suspend60);
          actionRow.appendChild(suspendCustom);
          actionRow.appendChild(suspendForever);
          actionRow.appendChild(suspendClear);
          body.appendChild(actionRow);
        }
        if (canDelete) {
          const removeButton = document.createElement("button");
          removeButton.className = "ghost";
          removeButton.type = "button";
          removeButton.textContent = "このユーザーを削除";
          removeButton.addEventListener("click", async () => {
            const nextUsers = (await loadUsers()).filter((itemUser) => !(itemUser.id === user.id && itemUser.schoolId === user.schoolId));
            await saveUsers(nextUsers);
            await addLog(`${user.schoolId}/${user.id} を削除しました。`);
            await renderUsers();
            await renderDevices();
          });
          body.appendChild(removeButton);
        }
        details.appendChild(body);
        section.appendChild(details);
      });
      els.userList.appendChild(section);
    });
  };

  const renderSiteHistory = async () => {
    const history = await loadChangeHistory();
    const search = String(els.reportSearch?.value || "").trim().toLowerCase();
    const items = Object.values(history)
      .sort((a, b) => new Date(b.changedAt || 0).getTime() - new Date(a.changedAt || 0).getTime())
      .filter((item) => isSuper(currentSession) || item.actorSchoolId === currentSession?.schoolId)
      .filter((item) => matchesSearch(`${item.target} ${item.actorSchoolId} ${item.actorId} ${item.action}`, search));
    els.siteHistoryList.innerHTML = "";
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "site-history-card";
      empty.textContent = "個別URLの変更履歴はまだありません。";
      els.siteHistoryList.appendChild(empty);
      return;
    }
    items.slice(0, 25).forEach((item) => {
      const card = document.createElement("article");
      card.className = "site-history-card";
      const title = document.createElement("h3");
      title.textContent = item.target;
      const meta = document.createElement("div");
      meta.className = "site-history-meta";
      meta.innerHTML = `<p><strong>対象</strong><br>${item.roleScope === "student" ? "生徒" : "先生"}</p><p><strong>操作</strong><br>${item.action === "block" ? "ブロック" : "許可"}</p><p><strong>操作した人</strong><br>${item.actorSchoolId} / ${item.actorId}</p><p><strong>日時</strong><br>${item.changedAt ? new Date(item.changedAt).toLocaleString("ja-JP") : "-"}</p>`;
      const list = document.createElement("ul");
      list.className = "history-list";
      (item.entries || []).slice(0, 10).forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = `${new Date(entry.changedAt).toLocaleString("ja-JP")} / ${entry.actorSchoolId} / ${entry.actorId} / ${entry.action === "block" ? "ブロック" : "許可"}`;
        list.appendChild(li);
      });
      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(list);
      els.siteHistoryList.appendChild(card);
    });
  };

  const renderBlockReports = async () => {
    const search = String(els.blockReportSearch?.value || "").trim().toLowerCase();
    const reports = (await loadBlockReports()).filter((item) => {
      if (!isSuper(currentSession) && item.schoolId !== currentSession?.schoolId) return false;
      const haystack = `${item.url} ${item.schoolId} ${item.userId} ${item.deviceLabel} ${item.reason} ${item.categoryLabel}`.toLowerCase();
      return matchesSearch(haystack, search);
    });
    els.blockReportList.innerHTML = "";
    if (reports.length === 0) {
      const empty = document.createElement("div");
      empty.className = "site-history-card";
      empty.textContent = "ブロックレポートはまだありません。";
      els.blockReportList.appendChild(empty);
      return;
    }
    reports.slice(0, 25).forEach((item) => {
      const card = document.createElement("article");
      card.className = "site-history-card";
      const title = document.createElement("h3");
      title.textContent = item.url || "-";
      const meta = document.createElement("div");
      meta.className = "site-history-meta";
      meta.innerHTML = `<p><strong>学校</strong><br>${item.schoolId || "-"}</p><p><strong>ユーザー</strong><br>${item.userId || "-"}</p><p><strong>端末</strong><br>${item.deviceLabel || "-"}</p><p><strong>日時</strong><br>${item.blockedAt ? new Date(item.blockedAt).toLocaleString("ja-JP") : "-"}</p>`;
      const list = document.createElement("ul");
      list.className = "history-list";
      const reason = document.createElement("li");
      reason.textContent = `理由: ${item.reason || "-"}`;
      const category = document.createElement("li");
      category.textContent = `カテゴリ: ${item.categoryLabel || "-"}`;
      list.appendChild(reason);
      list.appendChild(category);
      const actions = document.createElement("div");
      actions.className = "row";
      const switchEl = buildReportSwitch(item.url);
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "ghost";
      openButton.textContent = "このページを開く";
      openButton.addEventListener("click", () => {
        if (!item.url) return;
        window.open(item.url, "_blank", "noopener,noreferrer");
      });
      actions.appendChild(openButton);
      actions.appendChild(switchEl);
      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(list);
      card.appendChild(actions);
      els.blockReportList.appendChild(card);
    });
  };


  const renderAccessReports = async () => {
    const search = String(els.accessReportSearch?.value || "").trim().toLowerCase();
    const reports = (await loadAccessReports()).filter((item) => {
      if (!isSuper(currentSession) && item.schoolId !== currentSession?.schoolId) return false;
      const haystack = `${item.url} ${item.schoolId} ${item.userId} ${item.deviceLabel} ${item.categoryLabel}`.toLowerCase();
      return matchesSearch(haystack, search);
    });
    els.accessReportList.innerHTML = "";
    if (reports.length === 0) {
      const empty = document.createElement("div");
      empty.className = "site-history-card";
      empty.textContent = "閲覧履歴はまだありません。";
      els.accessReportList.appendChild(empty);
      return;
    }
    reports.slice(0, 100).forEach((item) => {
      const card = document.createElement("article");
      card.className = "site-history-card";
      const title = document.createElement("h3");
      title.textContent = item.url || "-";
      const meta = document.createElement("div");
      meta.className = "site-history-meta";
      meta.innerHTML = `<p><strong>学校</strong><br>${item.schoolId || "-"}</p><p><strong>ユーザー</strong><br>${item.userId || "-"}</p><p><strong>端末</strong><br>${item.deviceLabel || "-"}</p><p><strong>日時</strong><br>${item.accessedAt ? new Date(item.accessedAt).toLocaleString("ja-JP") : "-"}</p>`;
      const list = document.createElement("ul");
      list.className = "history-list";
      const category = document.createElement("li");
      category.textContent = `カテゴリ: ${item.categoryLabel || "-"}`;
      list.appendChild(category);
      const actions = document.createElement("div");
      actions.className = "row";
      const switchEl = buildReportSwitch(item.url);
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "ghost";
      openButton.textContent = "このページを開く";
      openButton.addEventListener("click", () => {
        if (!item.url) return;
        window.open(item.url, "_blank", "noopener,noreferrer");
      });
      actions.appendChild(openButton);
      actions.appendChild(switchEl);
      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(list);
      card.appendChild(actions);
      els.accessReportList.appendChild(card);
    });
  };
  const renderDevices = async () => {
    const [schools, users, history] = await Promise.all([loadSchools(), loadUsers(), loadChangeHistory()]);
    els.deviceSummary.innerHTML = "";
    [
      { title: "同期方式", body: cloud ? "Firebase Realtime Database と同期中です。" : "この端末のローカル保存を使用中です。" },
      { title: "管理対象", body: `学校数: ${schools.length} / ユーザー数: ${users.length}` },
      { title: "個別URL履歴", body: `履歴のあるURL数: ${Object.keys(history).length}` },
      { title: "リアルタイム反映", body: "設定変更は数秒以内ではなく、できるだけ即時に反映されます。" },
    ].forEach((item) => {
      const card = document.createElement("section");
      card.className = "device-info-card";
      card.innerHTML = `<h3>${item.title}</h3><p class="muted">${item.body}</p>`;
      els.deviceSummary.appendChild(card);
    });
    els.deviceTimeline.innerHTML = "";
    [
      "生徒の個別URL設定はカテゴリ判定より優先されます。",
      "YouTube は watch URL と embed URL を動画ごとに正規化して扱います。",
      `この端末: ${navigator.platform || "不明"} / ${navigator.userAgent.split(") ").pop() || navigator.userAgent}`,
      "別端末の変更は数秒以内に同期されます。",
    ].forEach((text) => {
      const item = document.createElement("div");
      item.className = "device-info-card";
      item.textContent = text;
      els.deviceTimeline.appendChild(item);
    });
  };

  const loadSettingsIntoPage = async () => applySettingsToForm(await loadSettings());

  const initAuth = async () => {
    const [users, session] = await Promise.all([loadUsers(), loadSession()]);
    if (users.length === 0) {
      showLock("setup", "初回は学校ID、管理者ID、パスワードを入力して本部管理者を作成してください。");
      updateCurrentUserLabel();
      return;
    }
    if (session) {
      const match = users.find((user) => user.id === session.id && user.schoolId === session.schoolId && user.role === normalizeRole(session.role));
      if (match && normalizeRole(match.role) !== "student") {
        currentSession = { id: match.id, role: match.role, schoolId: match.schoolId };
        updateCurrentUserLabel();
        hideLock();
        return;
      }
    }
    currentSession = null;
    updateCurrentUserLabel();
    showLock("login", "学校ID、ID、パスワードを入力してください。");
  };
  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const schoolId = els.loginSchoolId.value.trim();
    const id = els.loginId.value.trim();
    const password = els.loginPassword.value;
    if (!schoolId || !id || !password) {
      showLock("login", "学校ID、ID、パスワードを入力してください。");
      return;
    }
    const users = await loadUsers();
    const user = users.find((item) => item.schoolId === schoolId && item.id === id);
    if (!user) {
      showLock("login", "学校IDまたはID、パスワードが正しくありません。");
      return;
    }
    if (isSuspendedUser(user)) {
      showLock("login", user.suspendedPermanent ? "このアカウントは一時停止中です。解除されるまでログインできません。" : `このアカウントは ${formatDateTime(user.suspendedUntil)} まで一時停止中です。`);
      return;
    }
    if (normalizeRole(user.role) === "student") {
      showLock("login", "生徒アカウントでは管理画面に入れません。管理者アカウントでログインしてください。");
      return;
    }
    const hash = await hashPassword(password, base64ToBuffer(user.salt));
    if (hash !== user.hash) {
      showLock("login", "学校IDまたはID、パスワードが正しくありません。");
      return;
    }
    await saveSession({ id: user.id, role: user.role, schoolId: user.schoolId });
    updateCurrentUserLabel();
    hideLock();
    await renderAccessControls();
    await renderUsers();
    await renderSiteHistory();
    await renderBlockReports();
    await renderAccessReports();
    await renderDevices();
  });

  els.setupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const schoolId = els.setupSchoolId.value.trim();
    const id = els.setupId.value.trim();
    const password = els.setupPassword.value;
    const confirm = els.setupConfirm.value;
    if (!schoolId || !id || password.length < 6) {
      showLock("setup", "学校ID、管理者ID、6文字以上のパスワードを入力してください。");
      return;
    }
    if (password !== confirm) {
      showLock("setup", "確認用パスワードが一致しません。");
      return;
    }
    const schools = await loadSchools();
    if (schools.some((school) => school.id === schoolId)) {
      showLock("setup", "その学校IDはすでに使われています。");
      return;
    }
    const nextSchools = schools.concat([{ id: schoolId, name: DEFAULT_SCHOOL_NAME }]);
    const user = await createUser(id, "super", schoolId, password);
    await saveSchools(nextSchools);
    await saveUsers([user]);
    await saveSession({ id: user.id, role: user.role, schoolId: user.schoolId });
    updateCurrentUserLabel();
    await addLog(`初回セットアップで ${schoolId}/${id} を作成しました。`);
    hideLock();
    await renderAccessControls();
    await renderUsers();
    await renderBlockReports();
    await renderAccessReports();
    await renderDevices();
  });

  els.logoutBtn.addEventListener("click", async () => {
    await clearSession();
    updateCurrentUserLabel();
    showLock("login", "学校ID、ID、パスワードを入力してください。");
  });

  els.addSchoolBtn.addEventListener("click", async () => {
    if (!isSuper(currentSession)) { els.lastSaved.textContent = "学校を追加できるのは本部管理者のみです。"; return; }
    const id = els.schoolId.value.trim();
    const name = els.schoolName.value.trim();
    if (!id || !name) { els.lastSaved.textContent = "学校IDと学校名を入力してください。"; return; }
    const schools = await loadSchools();
    if (schools.some((school) => school.id === id)) { els.lastSaved.textContent = "その学校IDはすでに登録されています。"; return; }
    await saveSchools(schools.concat([{ id, name }]));
    els.schoolId.value = "";
    els.schoolName.value = "";
    els.lastSaved.textContent = "学校を追加しました。";
    await renderAccessControls();
    await renderDevices();
  });

  els.addUserBtn.addEventListener("click", async () => {
    if (!isAdmin(currentSession)) { els.lastSaved.textContent = "ユーザーを追加できるのは管理者のみです。"; return; }
    const id = els.userId.value.trim();
    const password = els.userPassword.value;
    const confirm = els.userPasswordConfirm.value;
    const role = isSuper(currentSession) ? els.userRole.value : "student";
    const schoolId = isSuper(currentSession) ? els.userSchoolId.value : currentSession.schoolId;
    if (!id || password.length < 6) { els.lastSaved.textContent = "IDと6文字以上のパスワードを入力してください。"; return; }
    if (password !== confirm) { els.lastSaved.textContent = "確認用パスワードが一致しません。"; return; }
    const users = await loadUsers();
    if (users.some((user) => user.id === id && user.schoolId === schoolId)) { els.lastSaved.textContent = "同じ学校に同じIDのユーザーがすでにいます。"; return; }
    const user = await createUser(id, role, schoolId, password);
    await saveUsers(users.concat([user]));
    els.userId.value = "";
    els.userPassword.value = "";
    els.userPasswordConfirm.value = "";
    els.lastSaved.textContent = `${roleLabel(role)}を追加しました。`;
    await renderUsers();
    await renderDevices();
  });

  els.bulkAddBtn.addEventListener("click", async () => {
    if (!isAdmin(currentSession)) { els.lastSaved.textContent = "生徒の一括追加は管理者のみです。"; return; }
    const schoolId = isSuper(currentSession) ? els.bulkSchoolId.value : currentSession.schoolId;
    const lines = els.bulkStudents.value.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) { els.lastSaved.textContent = "一括追加する生徒を入力してください。"; return; }
    const users = await loadUsers();
    const createdUsers = [];
    for (const line of lines) {
      const [id, password] = line.split(",").map((item) => item?.trim());
      if (!id || !password || password.length < 6) { els.lastSaved.textContent = `入力形式が正しくありません: ${line}`; return; }
      if (users.some((user) => user.id === id && user.schoolId === schoolId)) { els.lastSaved.textContent = `同じ学校に同じIDがあります: ${id}`; return; }
      createdUsers.push(await createUser(id, "student", schoolId, password));
    }
    await saveUsers(users.concat(createdUsers));
    els.bulkStudents.value = "";
    els.lastSaved.textContent = `${createdUsers.length}人の生徒を追加しました。`;
    await renderUsers();
    await renderDevices();
  });

  els.bulkDeleteBtn.addEventListener("click", async () => {
    if (!isAdmin(currentSession)) { els.lastSaved.textContent = "生徒の一括削除は管理者のみです。"; return; }
    const schoolId = isSuper(currentSession) ? els.bulkSchoolId.value : currentSession.schoolId;
    const users = await loadUsers();
    const remainingUsers = users.filter((user) => !(user.schoolId === schoolId && normalizeRole(user.role) === "student"));
    if (remainingUsers.length === users.length) { els.lastSaved.textContent = "削除できる生徒がいません。"; return; }
    await saveUsers(remainingUsers);
    els.lastSaved.textContent = `${schoolId} の生徒を全削除しました。`;
    await renderUsers();
    await renderDevices();
  });

  const markTyping = () => {
    isTypingForm = true;
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => { isTypingForm = false; }, 1200);
  };

  const manualSettingInputs = [els.allowKeywords, els.blockKeywords, els.allowedUrls, els.blockedUrls, els.studentAllowedUrls, els.studentBlockedUrls, els.nightStart, els.nightEnd, els.displayName, els.customCategoryRules];
  const auxiliaryInputs = [els.studentCategorySearch, els.testUrl, els.userId, els.userPassword, els.userPasswordConfirm, els.bulkStudents, els.schoolId, els.schoolName];
  els.navItems.forEach((item) => item.addEventListener("click", () => {
    if (hasUnsavedSettings && item.dataset.tab !== activeTabId) {
      els.lastSaved.textContent = "未保存の変更があります。保存してからタブを切り替えてください。";
      return;
    }
    setTab(item.dataset.tab);
  }));
  [...manualSettingInputs, ...auxiliaryInputs].forEach((element) => element.addEventListener("input", markTyping));
  els.userSearch.addEventListener("input", () => renderUsers());
  els.reportSearch.addEventListener("input", () => renderSiteHistory());
  els.blockReportSearch.addEventListener("input", () => renderBlockReports());
  els.accessReportSearch.addEventListener("input", () => renderAccessReports());
  manualSettingInputs.forEach((element) => {
    element.addEventListener("input", () => {
      if (element === els.displayName) els.brandTitle.textContent = els.displayName.value.trim() || DEFAULTS.displayName;
      markSettingsDirty();
    });
    element.addEventListener("change", markSettingsDirty);
  });
  els.enabledToggle.addEventListener("change", () => { setStatus(els.enabledToggle.checked); queueSave("auto"); });
  els.globalBlockToggle.addEventListener("change", () => queueSave("auto"));
  els.nightToggle.addEventListener("change", () => queueSave("auto"));
  els.studentCategorySearch.addEventListener("input", () => renderCategoryGroupSet({ container: els.studentCategoryContainer, countEl: els.studentCategoryCount, blockedSet: studentBlockedSet, filterText: els.studentCategorySearch.value, openGroups: openStudentCategoryGroups }));
  els.saveBtn.addEventListener("click", async () => { await saveSettings("manual"); await addLog("設定を保存しました。"); });
  if (els.resetBtn) els.resetBtn.addEventListener("click", async () => { await saveSettingsToStorage({ ...DEFAULTS }); await applySettingsToForm({ ...DEFAULTS }); clearSettingsDirty("初期値に戻しました。"); await addLog("設定を初期値に戻しました。"); });
  els.runTest.addEventListener("click", async () => {
    const url = els.testUrl.value.trim();
    if (!url) return;
    const settings = await loadSettings();
    els.testCategory.textContent = getCategoryLabel(classifyUrl(url));
    els.testDecisionStudent.textContent = decideUrlForRole(url, settings, "student");
    await addLog(`診断を実行しました: ${url}`);
  });
  els.exportUrlReportBtn.addEventListener("click", async () => {
    const history = Object.values(await loadChangeHistory())
      .sort((a, b) => new Date(b.changedAt || 0).getTime() - new Date(a.changedAt || 0).getTime())
      .filter((item) => isSuper(currentSession) || item.actorSchoolId === currentSession?.schoolId);
    const rows = [["対象URL", "対象", "操作", "学校", "ID", "日時"]];
    history.forEach((item) => rows.push([item.target, item.roleScope === "student" ? "生徒" : "先生", item.action === "block" ? "ブロック" : "許可", item.actorSchoolId, item.actorId, formatDateTime(item.changedAt)]));
    downloadCsv(`url-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  });
  els.exportBlockReportBtn.addEventListener("click", async () => {
    const reports = (await loadBlockReports()).filter((item) => isSuper(currentSession) || item.schoolId === currentSession?.schoolId);
    const rows = [["URL", "学校", "ユーザー", "端末", "理由", "カテゴリ", "日時"]];
    reports.forEach((item) => rows.push([item.url, item.schoolId, item.userId, item.deviceLabel, item.reason, item.categoryLabel, formatDateTime(item.blockedAt)]));
    downloadCsv(`block-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  });
  els.exportAccessReportBtn.addEventListener("click", async () => {
    const reports = (await loadAccessReports()).filter((item) => isSuper(currentSession) || item.schoolId === currentSession?.schoolId);
    const rows = [["URL", "学校", "ユーザー", "端末", "カテゴリ", "日時"]];
    reports.forEach((item) => rows.push([item.url, item.schoolId, item.userId, item.deviceLabel, item.categoryLabel, formatDateTime(item.accessedAt)]));
    downloadCsv(`access-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  });


  const startLiveSync = () => {
    window.setInterval(async () => {
      if (isTypingForm || hasUnsavedSettings || isEditingUserPanel()) return;
      await cloud.syncCoreData(DEFAULTS, { force: true, minIntervalMs: 1500 });
      await loadSettingsIntoPage();
      await renderAccessControls();
      await renderUsers();
      await renderSiteHistory();
      await renderBlockReports();
    await renderAccessReports();
      await renderDevices();
    }, 1200);
  };

  const setTab = (tabId) => {
    activeTabId = tabId;
    els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.tab === tabId));
    els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabId));
    window.dispatchEvent(new CustomEvent("msefilter:tabchange", { detail: { tabId } }));
  };

  const init = async () => {
    await cloud.syncCoreData(DEFAULTS, { force: true, minIntervalMs: 1500 });
    await loadSettingsIntoPage();
    await renderLogs();
    await initAuth();
    if (currentSession) {
      await renderAccessControls();
      await renderUsers();
      await renderSiteHistory();
      await renderBlockReports();
    await renderAccessReports();
      await renderDevices();
    }
    startLiveSync();
    updateDirtyUi();
  };

  window.addEventListener("beforeunload", (event) => {
    if (!hasUnsavedSettings) return;
    event.preventDefault();
    event.returnValue = "";
  });

  init();
})();








