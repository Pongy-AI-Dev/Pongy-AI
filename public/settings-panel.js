(function (root) {
  "use strict";
  var ctx,
    active = "main",
    own = false,
    scanRunning = false,
    epoch = 0,
    account = "",
    statusTimer,
    lastRefresh = 0,
    restoreBusy = false,
    autoRestored = 0,
    refreshApiKeyStatus = () => {},
    refreshMcpStatus = () => {};
  const translated = new Map();
  var translations = new Map();
  let adminBusy = false,
    adminRequest = 0,
    adminState = { disabled: false, maintenance: false };
  const $ = (id) => document.getElementById(id),
    tr = (r, e) => {
      const value = ctx.lang() === "ru" ? r : e;
      translations.set(value, [r, e]);
      return value;
    },
    tabs = {
      main: ["Главная", "General"],
      account: ["Аккаунт", "Account"],
      interface: ["Интерфейс", "Appearance"],
      tools: ["API и MCP", "API & MCP"],
      connections: ["Подключения", "Connections"],
      plugins: ["Плагины", "Plugins"],
      skills: ["Навыки", "Skills"],
      usage: ["Использование", "Usage"],
      subscription: ["Подписка", "Subscription"],
      beta: ["Бета-функции", "Beta features"],
      developer: ["Разработчик", "Developer"],
    };
  function node(tag, text, cls) {
    const n = document.createElement(tag);
    if (tag === "input") { n.autocomplete = "off"; n.setAttribute("data-lpignore", "true"); }
    if (text !== undefined) {
      n.textContent = text;
      if (translations.has(text)) translated.set(n, translations.get(text));
    }
    if (cls) n.className = cls;
    return n;
  }
  // Browser autofill is account-scoped obfuscation, not encryption. Requests use HTTPS; server storage uses AES-GCM.
  function apiAccount() {
    try {
      return String(ctx?.user()?.email || "").toLowerCase();
    } catch (e) {
      return "";
    }
  }
  function apiSalt() {
    try {
      return localStorage.getItem("pongy_device_id") || "pongy";
    } catch (e) {
      return "pongy";
    }
  }
  function apiEncode(value) {
    const source = String(value || ""),
      salt = apiSalt() + "|" + apiAccount();
    let mixed = "";
    for (let i = 0; i < source.length; i++)
      mixed += String.fromCharCode(
        source.charCodeAt(i) ^ salt.charCodeAt(i % salt.length),
      );
    try {
      const bytes = new TextEncoder().encode(mixed);
      let binary = "";
      bytes.forEach((b) => {
        binary += String.fromCharCode(b);
      });
      return btoa(binary);
    } catch (e) {
      return "";
    }
  }
  function apiDecode(value) {
    try {
      const binary = atob(String(value || "")),
        bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0)),
        mixed = new TextDecoder().decode(bytes),
        salt = apiSalt() + "|" + apiAccount();
      let out = "";
      for (let i = 0; i < mixed.length; i++)
        out += String.fromCharCode(
          mixed.charCodeAt(i) ^ salt.charCodeAt(i % salt.length),
        );
      return out;
    } catch (e) {
      return "";
    }
  }
  function apiLocal(suffix, value) {
    const account = apiAccount();
    if (!account) return null;
    const key = "pongy_api_" + suffix + ":" + account;
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else
        localStorage.setItem(
          key,
          typeof value === "string" ? value : JSON.stringify(value),
        );
    } catch (e) {}
    return null;
  }
  function readStoredKey() {
    const raw = apiLocal("key");
    return raw ? apiDecode(raw) : "";
  }
  function writeStoredKey(value) {
    if (!apiAccount()) return;
    if (value) apiLocal("key", apiEncode(value));
    else apiLocal("key", null);
  }
  function readApiMeta() {
    try {
      const raw = apiLocal("meta");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function readConsent() {
    return apiLocal("consent") === "1";
  }
  function writeConsent(value) {
    apiLocal("consent", value ? "1" : null);
  }
  function writeApiMeta(value) {
    try {
      apiLocal("meta", value ? JSON.stringify(value) : null);
    } catch (e) {}
  }
  let apiRevealTimer = 0,
    apiDirty = false,
    apiRevision = 0,
    modelsRequest = 0;
  function dirtyApi() {
    apiDirty = true;
    apiRevision++;
    const meta = readApiMeta() || {};
    writeApiMeta({ ...meta, draft: true });
    const save = $("personalApiSave");
    if (save) save.hidden = false;
    const status = $("personalApiStatus");
    if (status)
      status.textContent = tr(
        "Черновик сохранён на устройстве. Для применения нажмите «Проверить и подключить».",
        "Draft saved on this device. Select Validate & connect to apply it.",
      );
  }
  function clearApiModels() {
    modelsRequest++;
    const model = $("personalApiModel");
    delete model.dataset.loading;
    model.disabled = true;
    model.replaceChildren(
      node("option", tr("Сначала загрузите модели", "Load models first")),
    );
    $("personalApiModelOwner").textContent = "";
    const load = $("personalApiLoadModels");
    if (load) load.disabled = false;
  }

  // After a re-login the activation restores itself: the browser still holds the key, provider
  // and model, so the same validated connect request is repeated once without the user noticing.
  async function autoRestoreConnection(accountId) {
    // Retries are throttled: a redeploy that loses server data must not permanently drop the personal API.
    if (apiDirty || restoreBusy || Date.now() - autoRestored < 300000) return;
    autoRestored = Date.now();
    const key = readStoredKey(),
      meta = readApiMeta();
    if (
      !key ||
      !meta ||
      meta.draft === true ||
      typeof meta.provider !== "string" ||
      typeof meta.model !== "string" ||
      !meta.model ||
      !readConsent()
    )
      return;
    restoreBusy = true;
    const token = epoch,
      revision = apiRevision,
      output = $("personalApiStatus");
    try {
      output.textContent = tr(
        "Восстанавливаю подключение личного API…",
        "Restoring the personal API connection…",
      );
      const provider = $("personalApiProvider");
      if (
        provider &&
        [...provider.options].some((o) => o.value === meta.provider)
      )
        provider.value = meta.provider;
      if (Array.isArray(meta.models) && meta.models.length)
        fillModels(meta.models, meta.model);
      const v = await ctx.api("/api/user-api", {
        method: "PUT",
        body: {
          provider: meta.provider,
          model: meta.model,
          key,
          consent: true,
        },
      });
      if (token !== epoch || revision !== apiRevision) return;
      showApi(v);
      await usage();
      if (v.connected)
        ctx.notify(
          tr(
            "Подключение личного API восстановлено",
            "Personal API connection restored",
          ),
        );
    } catch (e) {
      if (token === epoch && revision === apiRevision)
        output.textContent =
          tr(
            "Не удалось восстановить подключение личного API: ",
            "Could not restore the personal API connection: ",
          ) + e.message;
    } finally {
      restoreBusy = false;
    }
  }
  function hideApiKey() {
    clearTimeout(apiRevealTimer);
    apiRevealTimer = 0;
    const input = $("personalApiKey"),
      eye = $("personalApiToggle");
    if (input) { input.type = "password"; input.style.webkitTextSecurity = ""; }
    if (eye) {
      eye.hidden = !input || !input.value;
      eye.classList.remove("revealed");
      eye.setAttribute("aria-pressed", "false");
      const label = tr(
        "Показать ключ на 3 секунды",
        "Show the key for 3 seconds",
      );
      eye.setAttribute("aria-label", label);
      eye.title = label;
    }
  }
  function revealApiKey() {
    const input = $("personalApiKey"),
      eye = $("personalApiToggle");
    if (!input || !input.value) return;
    clearTimeout(apiRevealTimer);
    input.type = "text";
    input.style.webkitTextSecurity = "";
    if (eye) {
      eye.classList.add("revealed");
      eye.setAttribute("aria-pressed", "true");
      const label = tr("Скрыть ключ", "Hide the key");
      eye.setAttribute("aria-label", label);
      eye.title = label;
    }
    apiRevealTimer = setTimeout(hideApiKey, 3000);
  }
  function storedKeyForField() {
    return readStoredKey();
  }
  function fillModels(items, selected) {
    const model = $("personalApiModel"),
      hint = $("personalApiModelOwner");
    if (!model || !Array.isArray(items) || model.dataset.loading === "true")
      return;
    model.replaceChildren();
    for (const item of items) {
      if (!item || typeof item.id !== "string") continue;
      const option = node("option");
      option.value = item.id;
      option.label = item.owner ? item.id + " — " + item.owner : item.id;
      option.dataset.owner = typeof item.owner === "string" ? item.owner : "";
      model.append(option);
    }
    if (!model.options.length) {
      model.disabled = true;
      model.append(
        node("option", tr("Сначала загрузите модели", "Load models first")),
      );
      return;
    }
    model.disabled = false;
    if (selected && [...model.options].some((o) => o.value === selected))
      model.value = selected;
    const option = model.selectedOptions[0],
      owner = option?.dataset.owner || "";
    if (hint)
      hint.textContent = owner
        ? tr(
            "Разработчик по данным провайдера: ",
            "Developer reported by provider: ",
          ) + owner
        : tr(
            "Провайдер не указал разработчика этой модели.",
            "The provider did not report this model’s developer.",
          );
  }
  function button(text, fn) {
    const n = node("button", text, "settings-action");
    n.type = "button";
    n.onclick = fn;
    return n;
  }
  function paragraph(parent, r, e) {
    const n = node("p", tr(r, e), "settings-hint");
    parent.append(n);
    return n;
  }
  function field(parent, label, type = "text") {
    const l = node("label", label, "settings-field"),
      input = node("input");
    input.className = "inp";
    input.type = type;
    l.append(input);
    parent.append(l);
    return input;
  }
  function syncSettingsTabs(reveal = false) {
    const strip = document.querySelector("#settingsModal .settings-tabs"),
      selected = $("settings-tab-" + active);
    if (!strip || !selected) return;
    const indicator = strip.querySelector(".settings-tab-indicator");
    if (indicator) {
      indicator.style.width = selected.offsetWidth + "px";
      indicator.style.transform = "translateX(" + selected.offsetLeft + "px)";
    }
    if (reveal && strip.clientWidth) {
      const visible = [...strip.querySelectorAll("[role=tab]")].filter(
          (el) => !el.hidden,
        ),
        left = selected === visible[0] ? 0 : selected.offsetLeft - 8,
        right =
          selected === visible[visible.length - 1]
            ? strip.scrollWidth
            : selected.offsetLeft + selected.offsetWidth + 8;
      if (left < strip.scrollLeft) strip.scrollLeft = Math.max(0, left);
      else if (right > strip.scrollLeft + strip.clientWidth)
        strip.scrollLeft = right - strip.clientWidth;
    }
    const shell = strip.parentElement,
      back = shell.querySelector(".settings-tabs-prev"),
      next = shell.querySelector(".settings-tabs-next");
    if (!back || !next) return;
    back.setAttribute(
      "aria-label",
      tr("Предыдущие разделы", "Previous sections"),
    );
    next.setAttribute("aria-label", tr("Следующие разделы", "Next sections"));
    const overflow = strip.scrollWidth > shell.clientWidth + 1;
    back.hidden = next.hidden = !overflow;
    back.disabled = strip.scrollLeft <= 1;
    next.disabled =
      strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1;
  }
  function selectTab(id) {
    const previous = active;
    if ((scanRunning && id !== "developer") || (id === "beta" && !ctx.beta()))
      return;
    active = id;
    if (id === "plugins" || id === "skills")
      void root.PongyExtensions?.mount(id);
    if (id === "usage") void usage();
    if (id === "connections") void root.PongyConnections?.refreshSettings();
    if (id === "developer" && previous !== id) void admin();
    if (id === "developer") void $("settings-panel-developer")._loadAiFirmware?.();
    Object.keys(tabs).forEach((key) => {
      $("settings-tab-" + key).setAttribute(
        "aria-selected",
        String(key === id),
      );
      $("settings-tab-" + key).tabIndex = key === id ? 0 : -1;
      $("settings-panel-" + key).hidden = key !== id;
    });
    syncSettingsTabs(true);
  }
  function move(id, panel, whole) {
    let n = $(id);
    if (n) {
      if (whole) n = n.parentElement;
      $("settings-panel-" + panel).append(n);
    }
  }
  function lock(value) {
    own = value;
    document.documentElement.dataset.userApi = String(value);
    for (const id of ["agentBtn", "smartBtn", "searchBtn"]) {
      const n = $(id);
      if (n) {
        n.disabled = value;
        n.setAttribute("aria-disabled", String(value));
        n.title = value
          ? tr(
              "Недоступно при подключённом личном API",
              "Unavailable while a personal API is connected",
            )
          : "";
      }
    }
    document
      .querySelectorAll("[data-beta-only]")
      .forEach((n) => (n.hidden = !ctx.beta()));
  }
  function syncBetaTab() {
    const enabled = !!$("betaFunctions")?.checked;
    $("settings-tab-beta").hidden = !enabled;
    $("settings-panel-beta").hidden = !enabled || active !== "beta";
    if (!enabled && active === "beta") selectTab("interface");
  }
  function setup() {
    const body = $("settingsModal").querySelector(".modal-body"),
      strip = node("div", undefined, "settings-tabs");
    strip.setAttribute("role", "tablist");
    strip.setAttribute(
      "aria-label",
      tr("Разделы настроек", "Settings sections"),
    );
    strip.id = "settingsTabs";
    const shell = node("div", undefined, "settings-tabs-shell");
    const search = node("input", undefined, "settings-nav-search");
    search.type = "search";
    const syncSearchLanguage = () => {
      const russian = ctx.lang() === "ru";
      search.placeholder = russian ? "Поиск в настройках" : "Search settings";
      search.setAttribute("aria-label", russian ? "Поиск по разделам настроек" : "Search settings sections");
    };
    syncSearchLanguage();
    new MutationObserver(syncSearchLanguage).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "data-lang"] });
    search.autocomplete = "off";
    search.addEventListener("input", () => {
      const query = search.value.trim().toLocaleLowerCase();
      strip.querySelectorAll("[role=tab]").forEach((tab) => {
        tab.hidden = !!query && !(tab.dataset.search || tab.textContent).toLocaleLowerCase().includes(query);
      });
      syncSettingsTabs(true);
    });
    function arrow(dir) {
      const b = node(
        "button",
        undefined,
        "settings-tabs-arrow " +
          (dir < 0 ? "settings-tabs-prev" : "settings-tabs-next"),
      );
      b.type = "button";
      b.setAttribute("aria-controls", strip.id);
      b.setAttribute(
        "aria-label",
        tr(
          dir < 0 ? "Предыдущие разделы" : "Следующие разделы",
          dir < 0 ? "Previous sections" : "Next sections",
        ),
      );
      b.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="' +
        (dir < 0 ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6") +
        '"/></svg>';
      b.onclick = () =>
        strip.scrollBy({
          left: dir * Math.max(160, strip.clientWidth * 0.75),
          behavior:
            document.documentElement.dataset.motion === "reduced"
              ? "auto"
              : "smooth",
        });
      return b;
    }
    shell.append(search, arrow(-1), strip, arrow(1));
    body.before(shell);
    strip.addEventListener("scroll", () => syncSettingsTabs(false), {
      passive: true,
    });
    strip.addEventListener(
      "wheel",
      (e) => {
        if (
          e.ctrlKey ||
          Math.abs(e.deltaX) >= Math.abs(e.deltaY) ||
          strip.scrollWidth <= strip.clientWidth
        )
          return;
        const delta =
            e.deltaY *
            (e.deltaMode === 1
              ? 16
              : e.deltaMode === 2
                ? strip.clientWidth
                : 1),
          before = strip.scrollLeft;
        strip.scrollLeft += delta;
        syncSettingsTabs(false);
        if (strip.scrollLeft !== before) e.preventDefault();
      },
      { passive: false },
    );
    new ResizeObserver(() => syncSettingsTabs(true)).observe(strip);
    new MutationObserver(() =>
      requestAnimationFrame(() => syncSettingsTabs(false)),
    ).observe(strip, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden"],
    });
    new MutationObserver(() => {
      if ($("settingsModal").classList.contains("open"))
        requestAnimationFrame(() => syncSettingsTabs(true));
    }).observe($("settingsModal"), {
      attributes: true,
      attributeFilter: ["class"],
    });
    Object.entries(tabs).forEach(([id, label]) => {
      const b = node("button", undefined, "settings-action");
      b.type = "button";
      b.onclick = () => selectTab(id);
      b.append(node("span", tr(...label)));
      b.id = "settings-tab-" + id;
      b.dataset.search = label.join(" ").toLocaleLowerCase();
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", "settings-panel-" + id);
      b.tabIndex = id === "main" ? 0 : -1;
      strip.append(b);
      const panel = node("section", undefined, "settings-section");
      panel.id = "settings-panel-" + id;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", b.id);
      const descriptions = {
        main:["Основные параметры приложения и личные предпочтения","App defaults and personal preferences"],
        account:["Профиль, безопасность и параметры аккаунта","Profile, security and account preferences"],
        interface:["Язык, тема, отображение и голос","Language, theme, display and voice"],
        tools:["Ключи API, совместимость и инструменты разработчика","API keys, compatibility and developer tools"],
        connections:["Подключение внешних сервисов и аккаунтов","Connect external services and accounts"],
        plugins:["Управление подключёнными расширениями","Manage connected extensions"],
        skills:["Навыки и дополнительные возможности помощника","Assistant skills and capabilities"],
        usage:["Состояние использования и доступные лимиты","Usage status and available limits"],
        subscription:["Тариф, преимущества и состояние подписки","Plan, benefits and subscription status"],
        beta:["Экспериментальные и новые функции","Experimental and upcoming features"],
        developer:["Расширенные параметры и диагностика","Advanced settings and diagnostics"]
      };
      panel.append(node("h2",tr(...label),"settings-page-title"),node("p",tr(...descriptions[id]),"settings-page-description"));
      body.append(panel);
    });
    const betaPanel = $("settings-panel-beta");
    [
      ["earlyAccess", "Ранний доступ", "Early access", "Получайте доступ к новым функциям раньше, когда они появятся. Сейчас активных ранних функций ещё нет.", "Access new features earlier when they become available. There are no active early-access features yet."],
      ["developerFeatures", "Функции разработчика", "Developer features", "Более осторожный и проверяющий стиль ответов. Не открывает платные модели, лимиты или дополнительные права.", "A slightly more careful, verification-focused response style. Does not unlock paid models, quotas, or extra permissions."],
    ].forEach(([key,ru,en,ruHint,enHint])=>{
      const row=node("label",undefined,"display-option beta-feature-option"),
        copy=node("span",undefined,"beta-feature-copy"),
        title=node("strong",tr(ru,en)),
        hint=node("small",tr(ruHint,enHint)),
        check=node("input");
      copy.append(title,hint);
      check.type="checkbox";check.className="display-switch";check.setAttribute("role","switch");
      check.id="betaFeature-"+key;check.checked=!!ctx.betaFeature?.(key);
      check.onchange=()=>{ctx.betaFeature?.(key,check.checked);ctx.applyAdvanced?.();lock(own);};
      row.append(copy,check);betaPanel.append(row);
    });
    strip.prepend(node("span", undefined, "settings-tab-indicator"));
    strip.onkeydown = (e) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
      const list = [...strip.querySelectorAll("[role=tab]")].filter(
          (n) => !n.hidden,
        ),
        idx = list.indexOf(document.activeElement),
        next =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? list.length - 1
              : (idx + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + list.length) %
                list.length;
      e.preventDefault();
      list[next].click();
      list[next].focus();
    };
    root.addEventListener("resize", () => selectTab(active), { passive: true });
    const beta = node("label", undefined, "display-option"),
      txt = node("span", tr("Бета-функции", "Beta features")),
      check = node("input");
    check.id = "betaFunctions";
    check.type = "checkbox";
    check.className = "display-switch";
    check.setAttribute("role", "switch");
    check.checked = ctx.beta();
    check.onchange = () => {
      ctx.beta(check.checked);
      syncBetaTab();
      ctx.applyAdvanced?.();
      if (check.checked) selectTab("beta");
      lock(own);
    };
    beta.append(txt, check);
    const betaBox = node("div", undefined, "beta-setting-option");
    const betaHint = node("small", tr("Включите, чтобы открыть отдельный раздел бета-функций", "Enable to open the Beta features section"));
    betaBox.append(beta, betaHint);
    $("settings-panel-interface").prepend(betaBox);
    syncBetaTab();
    move("developerBadge", "account");
    move("langLabel", "interface", true);
    move("themeLabel", "interface", true);
    move("accentPreferenceSetting", "interface");
    move("fontPreferenceSetting", "interface");
    move("expandedLanguageHint", "interface");
    move("motionPreference", "interface", true);
    move("voicePreferenceSetting", "interface");
    move("displayPreferences", "interface");
    move("wakeWordSetting", "interface");
    move("answerNotifications", "account", true);
    move("notificationChannels", "account");
    move("memoryToggle", "main", true);
    move("nickLabel", "account", true);
    move("subscriptionLabel", "subscription", true);
    body.querySelector(".local-history-card") &&
      $("settings-panel-main").append(
        body.querySelector(".local-history-card"),
      );
    body.querySelector(".support-link") &&
      $("settings-panel-main").append(body.querySelector(".support-link"));
    move("logoutBtnSettings", "account");
    move("settingsAppVersion", "main");
    // Keep the settings panel focused on controls; product details live outside settings.
    if (!ctx.user()?.guest) {
      const emailLabel = node(
          "label",
          tr("Почта аккаунта", "Account email"),
          "settings-field",
        ),
        emailField = node("input");
      emailLabel.id = "accountEmailLabel";
      emailField.id = "accountEmail";
      emailField.type = "email";
      emailField.readOnly = true;
      emailField.className = "inp";
      emailField.autocomplete = "off";
      emailField.value = ctx.user()?.email || "";
      emailLabel.append(emailField);
      $("settings-panel-account").insertBefore(
        emailLabel,
        $("logoutBtnSettings"),
      );
    }
    const moderationAccount=node("section",undefined,"settings-subsection moderation-account"),moderationTitle=node("h3",tr("Предупреждения и апелляции","Warnings and appeals")),moderationHint=node("p",tr("Здесь отображаются действующие и прошлые решения модерации. Если вы не согласны с решением, можно подать апелляцию.","View moderation decisions and submit an appeal if you disagree."),"settings-hint"),moderationList=node("div",undefined,"moderation-account-list"),moderationStatus=node("p","","settings-hint"),moderationLoad=button(tr("Проверить решения","Refresh decisions"),async()=>loadMyModeration());moderationAccount.append(moderationTitle,moderationHint,moderationList,moderationLoad,moderationStatus);if(ctx.user()?.guest){moderationStatus.textContent=tr("Войдите в аккаунт, чтобы просматривать предупреждения и подавать апелляции.","Sign in to view warnings and submit appeals.");moderationLoad.disabled=true;}
    const appealDialog=node("dialog",undefined,"admin-user-dialog moderation-appeal-dialog"),appealTitle=node("h2",tr("Апелляция","Appeal")),appealInput=node("textarea",undefined,"inp"),appealSubmit=button(tr("Отправить апелляцию","Submit appeal"),async()=>{if(!appealAction||appealInput.value.trim().length<8){appealStatus.textContent=tr("Опишите причину подробнее (не менее 8 символов).","Please provide at least 8 characters.");return;}appealSubmit.disabled=true;try{await ctx.api("/api/moderation/appeal",{method:"POST",body:{actionId:appealAction,details:appealInput.value.trim()}});appealDialog.close();appealInput.value="";moderationStatus.textContent=tr("Апелляция отправлена разработчикам.","Your appeal was sent to the developers.");await loadMyModeration();}catch(e){appealStatus.textContent=e.message;}finally{appealSubmit.disabled=false;}}),appealStatus=node("p","","settings-hint"),appealClose=button(tr("Закрыть","Close"),()=>appealDialog.close());let appealAction="";appealInput.rows=6;appealInput.maxLength=2000;appealInput.placeholder=tr("Почему вы считаете это решение ошибочным?","Why do you believe this decision was incorrect?");appealDialog.append(appealTitle,appealInput,appealStatus,appealSubmit,appealClose);$("settingsModal").append(appealDialog);
    let moderationActions=[];
    async function loadMyModeration(){if(ctx.user()?.guest)return;moderationLoad.disabled=true;moderationStatus.textContent=tr("Загрузка…","Loading…");try{const data=await ctx.api("/api/moderation/my-actions");moderationList.replaceChildren();const items=data.actions||[];moderationActions=items;moderationAccount.hidden=!items.length;if(!items.length){moderationStatus.textContent=tr("Модерационных решений нет.","No moderation decisions.");return;}for(const a of items){const card=node("div",undefined,"moderation-account-card"),name={ban:tr("Блокировка аккаунта","Account ban"),restrict:tr("Ограничение доступа к функциям","AI access restriction"),warning:tr("Предупреждение","Warning")}[a.kind]||a.kind;card.append(node("strong",name),node("p",(a.reason||"—")+" · "+dateLabel(a.createdAt)+(a.expiresAt?" · "+tr("до ","until ")+dateLabel(a.expiresAt):""),"settings-hint"));if(a.revokedAt)card.append(node("span",tr("Отменено","Revoked"),"moderation-revoked"));else{const appeal=button(tr("Подать апелляцию","Appeal"),()=>{appealAction=a.id;appealInput.value="";appealStatus.textContent="";appealDialog.showModal();});card.append(appeal);}moderationList.append(card);}moderationStatus.textContent=tr("Записей: ","Records: ")+items.length;}catch(e){moderationStatus.textContent=e.message;}finally{moderationLoad.disabled=false;}}window.addEventListener("pongy-session-ready",()=>{if(ctx.user()&&!ctx.user().guest)void loadMyModeration();});if(ctx.user()&&!ctx.user().guest)void loadMyModeration();
    const voice = $("voiceGender");
    $("voiceGenderLabel").textContent = tr(
      "Голос озвучивания",
      "Spoken reply voice",
    );
    $("voiceGenderHint").textContent = "";
    $("voiceGenderHint").hidden = true;
    voice.value = ctx.voiceGender() === "female" ? "female" : "male";
    voice.onchange = () =>
      ctx.setVoiceGender(voice.value === "female" ? "female" : "male");
    const speechLabel = node(
      "label",
      tr("Язык голосового ввода", "Voice input language"),
      "settings-field",
    );
    const speechSelect = node("select");
    speechSelect.id = "speechInputLanguage";
    speechSelect.className = "inp";
    for (const [value, r, e] of [
      ["auto", "Как язык интерфейса", "Same as interface"],
      ["ru-RU", "Русский", "Russian"],
      ["en-US", "Английский", "English"],
    ]) {
      const option = node("option", tr(r, e));
      option.value = value;
      speechSelect.append(option);
    }
    try {
      speechSelect.value =
        localStorage.getItem("pongy_speech_language") || "auto";
    } catch {}
    speechSelect.onchange = () => {
      root.stopVoice?.();
      try {
        if (speechSelect.value === "auto")
          localStorage.removeItem("pongy_speech_language");
        else localStorage.setItem("pongy_speech_language", speechSelect.value);
      } catch {}
    };
    speechLabel.append(speechSelect);
    $("voicePreferenceSetting").after(speechLabel);
    const sound = node("details", undefined, "sound-settings"), soundTitle = node("summary", tr("\u0417\u0432\u0443\u043a", "Sound")), soundRow = node("label", undefined, "display-option"), soundText = node("span", tr("\u0417\u0432\u0443\u043a", "Sound")), soundToggle = node("input");
    const soundChevron = '<svg class="settings-section-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    sound.id = "soundSettings"; sound.open = false; soundToggle.id = "soundEnabled"; soundToggle.type = "checkbox"; soundToggle.className = "display-switch"; soundToggle.setAttribute("role", "switch");
    try { soundToggle.checked = localStorage.getItem("pongy_sound") !== "off"; } catch { soundToggle.checked = true; }
    soundToggle.onchange = () => { try { localStorage.setItem("pongy_sound", soundToggle.checked ? "on" : "off"); } catch { soundToggle.checked = true; } if (!soundToggle.checked) { root.speechSynthesis?.cancel(); root.PongyNeuralSpeech?.stop(); $("musicStop")?.click(); } root.dispatchEvent(new root.CustomEvent("pongy-sound-change", { detail: { enabled: soundToggle.checked } })); };
    sound.id = "soundSettings";
    soundTitle.textContent = tr("Звук", "Sound"); translated.set(soundTitle, ["Звук", "Sound"]); soundTitle.insertAdjacentHTML("beforeend", soundChevron);
    sound.classList.add("settings-subsection");
    soundText.textContent = tr("Звук", "Sound");
    soundRow.append(soundText, soundToggle); sound.append(soundTitle);
    const voiceHost = $("voicePreferenceSetting"), speechHost = speechLabel, wakeHost = $("wakeWordSetting"), extensionHost = $("wakeFocusSetup");
    const extensionTitle = node("strong", tr("Расширение браузера", "Browser extension"), "sound-subtitle");
    const wakeTitle = node("strong", tr("Активация голосом", "Voice activation"), "sound-subtitle");
    if (voiceHost) sound.append(voiceHost);
    sound.append(speechHost);
    if (wakeHost) { wakeHost.prepend(wakeTitle); sound.append(wakeHost); }
    if (extensionHost) extensionHost.prepend(extensionTitle);
    sound.append(soundRow);
    $("settings-panel-interface").append(sound);
    apiPanel();
    usagePanel();
    developerPanel();
    const developerSettingsPanel = $("settings-panel-developer");
    if (developerSettingsPanel) developerSettingsPanel.append(moderationAccount);
    selectTab("main");
    const sub = $("settings-panel-subscription");
    paragraph(
      sub,
      "Pongy Plus открывает расширенные возможности сервиса:",
      "Pongy Plus unlocks extended service capabilities:",
    );
    const benefits = node("ul", undefined, "plus-benefits");
    for (const [r, e] of [
      [
        "Доступ к дополнительным моделям при их подключении",
        "Access to additional models when enabled",
      ],
      ["Увеличенный дневной лимит запросов", "A higher daily request limit"],
      [
        "Более длинный контекст чата и большие вложения",
        "Longer chat context and larger attachments",
      ],
      ["Приоритет обработки запросов", "Priority request processing"],
      ["Приоритетная поддержка", "Priority support"],
    ])
      benefits.append(node("li", tr(r, e)));
    sub.append(benefits);
    sub.append(button("Plus", () => ctx.subscribe()));
    sub.lastChild.classList.add("plus-action");
    new MutationObserver(() => {
      for (const [n, pair] of translated) {
        if (n.isConnected) {
          if (
            n.tagName === "LABEL" &&
            n.querySelector("input,select,textarea")
          ) {
            if (n.firstChild.nodeType === 3)
              n.firstChild.textContent = tr(...pair);
          } else n.textContent = tr(...pair);
        }
      }
      for (const [id, labels] of Object.entries(tabs))
        $("settings-tab-" + id).textContent = tr(...labels);
      $("voiceGenderLabel").textContent = tr(
        "Голос озвучивания",
        "Spoken reply voice",
      );
      $("voiceGenderHint").textContent = "";
      $("voiceGenderHint").hidden = true;
      const extensionHeading = $("wakeFocusSetup")?.querySelector(".sound-subtitle"); if (extensionHeading) extensionHeading.textContent = tr("Расширение браузера", "Browser extension");
      const wakeHeading = $("wakeWordSetting")?.querySelector(".sound-subtitle"); if (wakeHeading) wakeHeading.textContent = tr("Активация голосом", "Voice activation");
      $("wakeWordLabel").textContent = tr("Активация голосом", "Voice activation");
      $("voiceGender").options[0].textContent = tr("Мужской", "Male");
      $("voiceGender").options[1].textContent = tr("Женский", "Female");
      refresh();
      siteState();
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
  }
  function apiPanel() {
    const p = $("settings-panel-tools");
    p.append(node("h3", "API"));
    paragraph(
      p,
      "Подключите ключ одного из поддерживаемых провайдеров. Каталог не охватывает все сервисы: доступность моделей и сведения об их разработчике зависят от ответа API провайдера. Ключ отправляется только на официальный endpoint выбранного провайдера и хранится зашифрованным.",
      "Connect an API key from a supported provider. This catalog does not cover every service; model availability and developer details depend on the provider API. Keys are sent only to the selected provider’s official endpoint and stored encrypted.",
    );
    const providerField = node("label", tr("Провайдер", "Provider"), "settings-field");
    const provider = node("select");
    provider.id = "personalApiProvider";
    provider.className = "inp";
    provider.setAttribute("aria-label", tr("Провайдер", "Provider"));
    provider.autocomplete = "off";
    provider.disabled = true;
    provider.append(node("option", tr("Войдите в аккаунт, чтобы подключить API", "Sign in to connect an API")));
    providerField.append(provider);
    p.append(providerField);
    const keyField = node("div", undefined, "settings-field"),
      keyLabel = node("label", tr("API-ключ", "API key")),
      keyWrap = node("div", undefined, "api-key-field"),
      key = node("input"),
      keyEye = node("button");
    key.className = "inp";
    key.type = "password";
    key.id = "personalApiKey";
    keyLabel.htmlFor = key.id;
    key.autocomplete = "off";
    key.setAttribute("autocapitalize", "off");
    key.setAttribute("data-lpignore", "true");
    key.spellcheck = false;
    key.maxLength = 512;key.placeholder = tr("Вставьте API-ключ провайдера", "Paste provider API key");
    keyEye.type = "button";
    keyEye.id = "personalApiToggle";
    keyEye.className = "api-key-eye";
    keyEye.setAttribute("aria-pressed", "false");
    keyEye.setAttribute("aria-controls", "personalApiKey");
    keyEye.hidden = true;
    key.addEventListener("input", () => { keyEye.hidden = !key.value; if (!key.value) hideApiKey(); });
    keyEye.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle class="api-eye-pupil" cx="12" cy="12" r="3"/><path class="api-eye-slash" pathLength="1" d="M3 3 21 21"/></svg>';
    keyEye.onclick = function (event) {
      event.preventDefault();
      if (key.type === "text") hideApiKey();
      else revealApiKey();
    };
    keyWrap.append(key, keyEye);
    keyField.append(keyLabel, keyWrap);
    p.append(keyField);
    hideApiKey();
    const modelLabel = node("label", tr("Модель", "Model"), "settings-field"),
      model = node("select");
    model.id = "personalApiModel";
    model.className = "inp";
    model.disabled = true;
    model.append(
      node("option", tr("Сначала загрузите модели", "Load models first")),
    );
    modelLabel.append(model);
    p.append(modelLabel);
    const ownerHint = node("p", undefined, "settings-hint");
    ownerHint.id = "personalApiModelOwner";
    p.append(ownerHint);
    const output = node("p", undefined, "settings-hint");
    output.id = "personalApiStatus";
    output.setAttribute("role", "status");
    p.append(output);
    const loadModels = button(
      tr("Загрузить модели", "Load models"),
      async () => {
        const token = epoch,
          request = ++modelsRequest,
          selectedProvider = provider.value,
          enteredKey = key.value.trim();
        const current = () =>
          token === epoch &&
          request === modelsRequest &&
          provider.value === selectedProvider &&
          key.value.trim() === enteredKey;
        loadModels.disabled = true;
        model.dataset.loading = "true";
        output.textContent = tr(
          "Запрашиваем список моделей у провайдера…",
          "Requesting the provider model list…",
        );
        ownerHint.textContent = "";
        try {
          const result = await ctx.api("/api/user-api/models", {
            method: "POST",
            body: { provider: selectedProvider, key: enteredKey },
          });
          if (!current()) return;
          if (!Array.isArray(result.models) || result.models.length > 1000)
            throw Error(
              tr(
                "Провайдер вернул некорректный список моделей.",
                "The provider returned an invalid model list.",
              ),
            );
          model.replaceChildren();
          for (const item of result.models) {
            if (!item || typeof item.id !== "string") continue;
            const option = node("option");
            option.value = item.id;
            option.label = item.owner ? item.id + " — " + item.owner : item.id;
            option.dataset.owner =
              typeof item.owner === "string" ? item.owner : "";
            model.append(option);
          }
          if (!model.options.length)
            throw Error(
              tr(
                "Провайдер не предоставил доступных моделей.",
                "The provider did not return any available models.",
              ),
            );
          model.value = model.options[0].value;
          model.disabled = false;
          showOwner();
          dirtyApi();
          writeApiMeta({
            ...readApiMeta(),
            provider: provider.value,
            model: model.value,
            models: [...model.options].map((o) => ({
              id: o.value,
              owner: o.dataset.owner || "",
            })),
          });
          output.textContent =
            tr("Модели загружены: ", "Models loaded: ") + model.options.length;
        } catch (e) {
          if (current()) {
            model.disabled = true;
            output.textContent = e.message;
          }
        } finally {
          if (current()) {
            loadModels.disabled = false;
            delete model.dataset.loading;
          }
        }
      },
    );
    loadModels.id = "personalApiLoadModels";
    loadModels.disabled = true;
    p.append(loadModels);
    function showOwner() {
      const selected = model.selectedOptions[0],
        owner = selected?.dataset.owner || "";
      ownerHint.textContent = owner
        ? tr(
            "Разработчик по данным провайдера: ",
            "Developer reported by provider: ",
          ) + owner
        : tr(
            "Провайдер не указал разработчика этой модели.",
            "The provider did not report this model’s developer.",
          );
    }
    model.onchange = () => {
      dirtyApi();
      showOwner();
      writeApiMeta({
        ...readApiMeta(),
        provider: provider.value,
        model: model.value,
        models: [...model.options].map((o) => ({
          id: o.value,
          owner: o.dataset.owner || "",
        })),
      });
    };
    provider.onchange = () => {
      const saved = readApiMeta();
      clearApiModels();
      if (
        saved &&
        saved.provider === provider.value &&
        Array.isArray(saved.models) &&
        saved.models.length
      )
        fillModels(saved.models, saved.model);
      else {
        key.value = "";
        writeStoredKey("");
        writeConsent(false);
        $("personalApiConsent").checked = false;
        writeApiMeta({ provider: provider.value, model: "", models: [] });
      }
      dirtyApi();
      hideApiKey();
    };
    key.addEventListener("input", () => {
      if (readStoredKey() === key.value.trim()) return;
      writeStoredKey(key.value.trim());
      clearApiModels();
      writeApiMeta({
        ...readApiMeta(),
        provider: provider.value,
        model: "",
        models: [],
      });
      dirtyApi();
    });
    key.addEventListener("change", () => writeStoredKey(key.value.trim()));
    const keyHint = paragraph(
      p,
      "Используйте API-ключ из кабинета выбранного сервиса. Ключ не включается в URL; на сервере он хранится зашифрованным, а копия для автозаполнения остаётся только в этом браузере.",
      "Use an API key from the selected provider dashboard. The key is never put in a URL; the server stores it encrypted and an autofill copy stays only in this browser.",
    );
    keyHint.id = "personalApiKeyHint";
    const consent = node("label", undefined, "memory-setting"),
      c = node("input");
    c.type = "checkbox";
    c.id = "personalApiConsent";
    c.checked = readConsent();
    c.onchange = () => {
      writeConsent(c.checked);
      dirtyApi();
    };
    consent.append(
      c,
      node(
        "span",
        tr(
          "Разрешаю обращения к моему провайдеру и принимаю его возможную оплату.",
          "Allow requests to my provider and accept any provider charges.",
        ),
      ),
    );
    p.append(consent);
    const save = button(
        tr("Проверить и подключить", "Validate & connect"),
        async () => {
          const token = epoch,
            revision = apiRevision,
            body = {
              provider: provider.value,
              model: model.value.trim(),
              key: key.value.trim(),
              consent: c.checked,
            };
          save.disabled = true;
          try {
            const v = await ctx.api("/api/user-api", { method: "PUT", body });
            if (token !== epoch || revision !== apiRevision) return;
            writeConsent(body.consent);
            writeStoredKey(body.key);
            apiDirty = false;
            showApi(v);
            await usage();
          } catch (e) {
            if (token === epoch) output.textContent = e.message;
          } finally {
            if (token === epoch) save.disabled = false;
          }
        },
      ),
      remove = button(tr("Отключить ключ", "Disconnect key"), async () => {
        const token = epoch,
          revision = apiRevision;
        remove.disabled = true;
        try {
          const v = await ctx.api("/api/user-api", { method: "DELETE" });
          if (token !== epoch || revision !== apiRevision) return;
          clearApiModels();
          writeStoredKey("");
          writeApiMeta(null);
          writeConsent(false);
          c.checked = false;
          key.value = "";
          apiDirty = false;
          hideApiKey();
          showApi(v);
          await usage();
        } catch (e) {
          if (token === epoch) output.textContent = e.message;
        } finally {
          if (token === epoch) remove.disabled = false;
        }
      });
    save.id = "personalApiSave";
    remove.id = "personalApiRemove";
    p.append(save, remove);
    paragraph(
      p,
      "Личный API использует только выбранную текстовую модель. Pongy не получает сведения о тарифах, балансе или лимитах провайдера. Генерация изображений личным ключом пока не поддерживается.",
      "Personal API uses only the selected text model. Pongy cannot see your provider’s plan, balance or quotas. Image generation with personal keys is not supported yet.",
    );
    mcpPanel(p);
  }
  function mcpPanel(parent) {
    // The API section below shares the existing API heading.paragraph(parent,'Создайте личный Pongy API Key для подключения внешних агентов. API совместим с OpenAI Chat Completions; используйте адрес endpoint и ключ как Bearer-токен. Ключ действует от имени вашего аккаунта и расходует его лимиты.','Create a personal Pongy API Key to connect external agents. The API is compatible with OpenAI Chat Completions; use the endpoint and key as a Bearer token. The key acts as your account and uses its limits.');
    const apiStatus = node("p", "", "settings-hint"),
      apiKey = node("output", "", "credential-value"),
      apiEndpointText = node("output", "", "credential-value"),
      apiDetails = node("div"),
      apiCreate = button(tr("Создать API-ключ", "Create API key"), async () => {
        apiCreate.disabled = true;
        try {
          const issuedEpoch=epoch;
          const data = await ctx.api("/api/api-key", { method: "POST" });
          if(issuedEpoch!==epoch)return;
          apiKey.textContent = data.token;
          apiEndpointText.textContent = data.endpoint;
          apiStatus.textContent = tr(
            "Ключ создан. Скопируйте и сохраните его сейчас: повторно секрет не показывается.",
            "Key created. Copy and save it now; the secret will not be shown again.",
          );
          apiRevoke.hidden = false;
          apiCopy.hidden = false;
          apiEndpointCopy.hidden = false;
          apiCreate.textContent = tr(
            "Создать новый API Key",
            "Create new API Key",
          );
        } catch (error) {
          apiStatus.textContent = error.message;
        } finally {
          apiCreate.disabled = false;
        }
      }),
      apiCopy = button(tr("Копировать API Key", "Copy API Key"), async () => {
        try {
          await navigator.clipboard.writeText(apiKey.textContent);
          ctx.notify(tr("API Key скопирован", "API Key copied"));
        } catch {
          ctx.notify(
            tr("Не удалось скопировать API Key", "Could not copy API Key"),
          );
        }
      }),
      apiEndpointCopy = button(tr("Копировать адрес API", "Copy API endpoint"), async () => { try { await navigator.clipboard.writeText(apiEndpointText.textContent); ctx.notify(tr("Адрес API скопирован", "API endpoint copied")); } catch { ctx.notify(tr("Не удалось скопировать адрес API", "Could not copy API endpoint")); } }),
      apiRevoke = button(tr("Отозвать API Key", "Revoke API Key"), async () => {
        apiRevoke.disabled = true;
        try {
          await ctx.api("/api/api-key", { method: "DELETE" });
          apiKey.textContent = "";
          apiStatus.textContent = tr("API Key отозван.", "API Key revoked.");
          apiRevoke.hidden = true;
          apiCopy.hidden = true;
          apiEndpointCopy.hidden = true;
          apiCreate.textContent = tr("Создать API-ключ", "Create API key");
        } catch (error) {
          apiStatus.textContent = error.message;
        } finally {
          apiRevoke.disabled = false;
        }
      });
    apiDetails.className = "api-key-details";
    apiStatus.id = "apiKeyStatus";
    apiStatus.setAttribute("role", "status");
    apiKey.id = "apiKeyValue";
    apiEndpointText.id = "apiKeyEndpoint";
    apiCreate.id = "apiKeyCreate";
    apiCopy.id = "apiKeyCopy";
    apiRevoke.id = "apiKeyRevoke";
    apiEndpointCopy.id = "apiKeyEndpointCopy";
    apiCreate.classList.add("api-key-primary");
    apiKey.textContent = tr(
      "Создайте ключ и сохраните его в надёжном месте",
      "Create a key and keep it in a safe place",
    );
    apiEndpointText.textContent = "";
    apiDetails.append(
      node("span", tr("Адрес API", "API address"), "credential-label"),
      apiEndpointText,
      node("span", "", "credential-divider"),
      node("span", tr("Секретный ключ", "Secret key"), "credential-label"),
      apiKey,
    );
    const keyCard = node("section", undefined, "api-key-card");
    keyCard.setAttribute(
      "aria-label",
      tr("Личный API-ключ", "Personal API key"),
    );
    keyCard.append(
      node("h3", tr("Личный API-ключ", "Personal API key")),
      apiStatus,
      apiDetails,
      apiCreate,
      apiCopy,
      apiEndpointCopy,
      apiRevoke,
    );
    parent.append(keyCard);
    apiCopy.hidden = true;
    apiEndpointCopy.hidden = true;
    apiRevoke.hidden = true;
    apiCreate.disabled = !ctx.user();
    apiRevoke.disabled = !ctx.user();
    refreshApiKeyStatus = async () => {
      const token = epoch,
        user = ctx.user();
      apiCreate.disabled = !user;
      apiRevoke.disabled = !user;
      if (!user) {
        apiStatus.textContent = tr(
          "Войдите в аккаунт, чтобы создать API Key.",
          "Sign in to create an API Key.",
        );
        apiEndpointText.textContent = "";
        apiRevoke.hidden = true;
        apiEndpointCopy.hidden = true;
        return;
      }
      try {
        const data = await ctx.api("/api/api-key");
        if (token !== epoch) return;
        if (data.connected) {
          apiStatus.textContent = tr(
            "API Key уже создан. Создайте новый, чтобы заменить его, или отзовите текущий.",
            "An API Key already exists. Create a new one to replace it, or revoke the current key.",
          );
          apiEndpointText.textContent = data.endpoint;
          apiEndpointCopy.hidden = false;
          apiCreate.textContent = tr(
            "Создать новый API Key",
            "Create new API Key",
          );
          apiRevoke.hidden = false;
        } else {
          apiStatus.textContent = tr(
            "API Key не создан.",
            "No API Key has been created.",
          );
          apiEndpointText.textContent = "";
          apiRevoke.hidden = true;
          apiEndpointCopy.hidden = true;
        }
      } catch (error) {
        if (token === epoch) apiStatus.textContent = error.message;
      }
    };
    parent.append(node("h3", "MCP"));
    paragraph(
      parent,
      "Подключите своё приложение к Pongy через MCP. Создайте токен и скопируйте настройки подключения. Действуют лимиты вашего аккаунта",
      "Connect your app to Pongy using MCP. Create a token and copy the connection settings. Your account limits apply",
    );
    const status = node("p", "", "settings-hint"),
      secret = node("code"),
      pre = node("details", "", "mcp-connection-card"),
      copy = button(tr("Копировать конфигурацию", "Copy config"), async () => {
        try {
          await navigator.clipboard.writeText(secret.textContent);
          ctx.notify(tr("Конфигурация скопирована", "Configuration copied"));
        } catch {
          ctx.notify(
            tr(
              "Не удалось скопировать конфигурацию",
              "Could not copy configuration",
            ),
          );
        }
      }),
      create = button(tr("Создать токен", "Create token"), async () => {
        create.disabled = true;
        try {
          const issuedEpoch=epoch;
          const data = await ctx.api("/api/mcp/token", { method: "POST" });
          if(issuedEpoch!==epoch)return;
          $("mcpEndpoint").value=data.endpoint;$("mcpSecret").value=data.token;pre.open=true;
          secret.textContent = JSON.stringify(
            {
              mcpServers: {
                pongy: {
                  url: data.endpoint,
                  headers: { Authorization: "Bearer " + data.token },
                },
              },
            },
            null,
            2,
          );
          status.textContent = tr(
            "Токен создан. Скопируйте конфигурацию сейчас: секрет повторно не показывается.",
            "Token created. Copy the configuration now; the secret will not be shown again.",
          );
          create.textContent = tr("Создать новый токен", "Create new token");
          revoke.hidden = false;
          copy.hidden = false;
        } catch (error) {
          status.textContent = error.message;
        } finally {
          create.disabled = false;
        }
      }),
      revoke = button(tr("Отозвать токен", "Revoke token"), async () => {
        revoke.disabled = true;
        try {
          await ctx.api("/api/mcp/token", { method: "DELETE" });
          secret.textContent = "";$("mcpEndpoint").value="";$("mcpSecret").value="";
          status.textContent = tr("Токен отозван.", "Token revoked.");
          revoke.hidden = true;
          copy.hidden = true;
          create.textContent = tr("Создать токен", "Create token");
        } catch (error) {
          status.textContent = error.message;
        } finally {
          revoke.disabled = false;
        }
      });
    create.id = "mcpCreateToken";
    revoke.id = "mcpRevokeToken";
    copy.id = "mcpCopyConfig";
    status.id = "mcpTokenStatus";
    secret.id = "mcpConfig";
    secret.textContent = tr(
      "Сначала создайте токен подключения.",
      "Create a connection token first.",
    );
    secret.hidden=true;
    const mcpEndpoint=node('input'),mcpSecret=node('input');mcpEndpoint.id='mcpEndpoint';mcpSecret.id='mcpSecret';mcpSecret.type='password';[mcpEndpoint,mcpSecret].forEach(field=>{field.readOnly=true;field.className='credential-value';field.autocomplete='off';field.setAttribute('data-lpignore','true');});
    const endpointLabel=node('label',tr('Адрес сервера','Server address'),'credential-label');endpointLabel.htmlFor=mcpEndpoint.id;const secretLabel=node('label',tr('Секретный токен','Secret token'),'credential-label');secretLabel.htmlFor=mcpSecret.id;
    pre.append(node("summary", tr("Настройки для подключения", "Connection settings")),endpointLabel,mcpEndpoint,secretLabel,mcpSecret, copy, secret);
    parent.append(status, pre, create, revoke);
    revoke.hidden = true;
    copy.hidden = true;
    create.disabled = !ctx.user();
    revoke.disabled = !ctx.user();
    refreshMcpStatus = async () => {
      const token = epoch,
        user = ctx.user();
      create.disabled = !user;
      revoke.disabled = !user;
      if (!user) {
        status.textContent = tr(
          "Войдите в аккаунт, чтобы настроить подключение MCP.",
          "Sign in to configure MCP.",
        );
        revoke.hidden = true;
        return;
      }
      try {
        const data = await ctx.api("/api/mcp/token");
        if (token !== epoch) return;
        if (data.connected) {
          status.textContent = tr(
            "Подключение настроено. Создайте новый токен, чтобы показать конфигурацию, либо отзовите текущий.",
            "Connection is configured. Create a new token to reveal its configuration, or revoke the current token.",
          );
          create.textContent = tr("Создать новый токен", "Create new token");
          revoke.hidden = false;
        } else {
          status.textContent = tr(
            "Готово к подключению",
            "Ready to connect",
          );
          revoke.hidden = true;
        }
      } catch (error) {
        if (token === epoch) status.textContent = error.message;
      }
    };
    refreshMcpStatus();
  }
  function loadProviderCatalog() {
    const provider = $("personalApiProvider"),
      output = $("personalApiStatus");
    if (
      !ctx.user() ||
      provider.dataset.loading === "true" ||
      provider.dataset.loaded === "true"
    )
      return;
    provider.dataset.loading = "true";
    const token = epoch;
    ctx
      .api("/api/user-api/providers")
      .then((data) => {
        if (token !== epoch) return;
        if (!Array.isArray(data.providers) || !data.providers.length)
          throw Error(
            tr(
              "Каталог провайдеров недоступен.",
              "The provider catalog is unavailable.",
            ),
          );
        provider.replaceChildren(
          ...data.providers.map((item) => {
            const option = node("option", item.name);
            option.value = item.id;
            return option;
          }),
        );
        provider.disabled = false;
        $("personalApiLoadModels").disabled = false;
        provider.dataset.loaded = "true";
        const meta = readApiMeta();
        if (meta && meta.provider)
          restoreApiSelection(meta.provider, meta.model);
      })
      .catch((e) => {
        if (token === epoch) output.textContent = e.message;
      })
      .finally(() => {
        if (token === epoch) provider.dataset.loading = "false";
      });
  }
  function showApi(v) {
    const connected = v.connected === true;
    lock(connected);
    $("personalApiRemove").hidden = !connected;
    if (apiDirty) {
      $("personalApiStatus").textContent = tr(
        "Черновик сохранён на устройстве. Для применения нажмите «Проверить и подключить».",
        "Draft saved on this device. Select Validate & connect to apply it.",
      );
      $("personalApiSave").hidden = false;
      const meta = readApiMeta();
      if (meta?.provider) restoreApiSelection(meta.provider, meta.model);
      return;
    }
    $("personalApiStatus").textContent = v.unavailable
      ? tr(
          "Сохранённый ключ временно недоступен. Проверьте серверный секрет шифрования или подключите ключ повторно.",
          "The saved key is unavailable. Check the server encryption secret or reconnect the key.",
        )
      : connected
        ? tr("Подключено: ", "Connected: ") +
          (v.providerName || v.provider) +
          " · " +
          v.model
        : tr("Личный API не подключён", "No personal API connected");
    $("personalApiSave").hidden = connected;
    $("personalApiRemove").hidden = !connected;
    const keyInput = $("personalApiKey");
    if (keyInput && !keyInput.value) {
      const stored = storedKeyForField();
      if (stored) keyInput.value = stored;
    }
    if (keyInput) {
      keyInput.placeholder = connected
        ? tr("Ключ сохранён на сервере", "Key saved on server")
        : tr("API-ключ", "API key");
      keyInput.dataset.saved = String(connected);
    }
    if (connected && v.provider) {
      $("personalApiConsent").checked = v.consent === true;
      writeConsent(v.consent === true);
      const meta = readApiMeta();
      writeApiMeta({
        provider: v.provider,
        model: v.model,
        models:
          Array.isArray(v.models) && v.models.length
            ? v.models
            : meta &&
                meta.provider === v.provider &&
                Array.isArray(meta.models) &&
                meta.models.length
              ? meta.models
              : [{ id: v.model, owner: v.providerName || v.provider }],
      });
      restoreApiSelection(v.provider, v.model);
    } else if (!connected) {
      const meta = readApiMeta();
      if (meta && meta.provider) restoreApiSelection(meta.provider, meta.model);
    }
  }
  function restoreApiSelection(providerId, modelId) {
    const provider = $("personalApiProvider"),
      meta = readApiMeta();
    if (!provider || !providerId) return;
    if ([...provider.options].some((o) => o.value === providerId))
      provider.value = providerId;
    if (
      meta &&
      meta.provider === providerId &&
      Array.isArray(meta.models) &&
      meta.models.length
    )
      fillModels(meta.models, modelId || meta.model);
  }
  function usagePanel() {
    const p = $("settings-panel-usage");
    paragraph(
      p,
      "Шкала заполняется по мере использования общего ресурса Pongy.",
      "This bar fills up as the shared Pongy allowance is used.",
    );
    const row = node("div", undefined, "usage-row");
    const bar = node("progress");
    bar.id = "usageProgress";
    bar.max = 100;
    bar.setAttribute(
      "aria-label",
      tr("Использование общего ресурса Pongy", "Shared Pongy allowance usage"),
    );
    row.append(bar);
    const percent = node("p", undefined, "settings-hint");
    percent.id = "usagePercent";
    row.append(percent);
    p.append(row);
    for (const id of ["usageReset", "usageHint"]) {
      const n = node("p", undefined, "settings-hint");
      n.id = id;
      p.append(n);
    }
  }
  async function usage() {
    if (!ctx.user()) return;
    const token = epoch;
    try {
      const s = await ctx.api("/api/service-status");
      if (token !== epoch) return;
      const own = s.weeklyUnlimited === true || s.userApi?.connected === true,
        paid = s.paid === true,
        remaining = Number(s.weeklyRemainingPercent);
      if (!own && (!Number.isFinite(remaining) || remaining < 0 || remaining > 100))
        throw Error(tr("Не удалось получить состояние общего ресурса Pongy.","Could not retrieve the shared Pongy allowance status."));
      const used = own ? 0 : Math.max(0, Math.min(100, 100 - remaining));
      $("usageProgress").value = used;
      $("usageProgress").hidden = own;
      $("usageProgress").removeAttribute("aria-disabled");
      $("settings-panel-usage").dataset.state = s.aiUnavailable ? "unavailable" : used >= 100 ? "exhausted" : "normal";
      $("usagePercent").textContent = own
        ? tr("Личный API без лимита Pongy","Personal API: no Pongy usage cap")
        : tr("Использовано ","Used ") + used.toLocaleString(ctx.lang()==="ru"?"ru-RU":"en-US",{maximumFractionDigits:1}) + "%";
      $("usageReset").textContent = s.weeklyReset
        ? tr("Сброс: ","Resets: ") + new Date(s.weeklyReset).toLocaleDateString(ctx.lang()==="ru"?"ru-RU":"en-US")
        : "";
      $("usageHint").replaceChildren();
      if (!own && used >= 100 && !paid) {
        const upgrade = button(tr("Лимит этой недели исчерпан. Перейдите на Plus, чтобы увеличить доступный ресурс.","This week's allowance is exhausted. Switch to Plus for a larger weekly budget."),() => ctx.subscribe());
        upgrade.onclick = () => ctx.subscribe();
        $("usageHint").append(upgrade);
        return;
      }
      $("usageHint").textContent = own
        ? tr("Запросы выполняются через подключённый личный API.","Requests use your connected personal API.")
        : used >= 100
          ? tr("Недельный лимит исчерпан. Он обновится в указанную дату.","The weekly allowance is exhausted. It resets on the date shown.")
          : tr("Расход зависит от длины и сложности запроса, контекста, выбранной модели и уровня размышления.","Usage depends on request length and complexity, context, selected model and thinking level.");
    } catch (e) {
      $("usageHint").textContent = e.message;
    }
  }
  function developerPanel() {
    const p = $("settings-panel-developer"),
      open = button(tr("Проверка", "Check"), () => {
        open.focus();
        dialog.showModal();
      });
    open.id = "adminCheckButton";
    p.append(open);
    const firmware = node("section", undefined, "settings-subsection");
    const firmwareTitle = node("h3", tr("Настройки модели", "AI firmware"));
    const firmwareHint = node("p", tr("Глобальные правила поведения Pongy AI для всех пользователей. Настройки применяются на сервере.", "Global Pongy AI behaviour settings for all users. Changes are applied server-side."), "settings-hint");
    const firmwareStyleLabel = node("label", tr("Стиль общения", "Communication style"), "field-label");
    const firmwareStyle = node("select", undefined, "inp");
    firmwareStyleLabel.htmlFor = "aiFirmwareStyle"; firmwareStyle.id = "aiFirmwareStyle";
    for (const [value, ru, en] of [["balanced","Сбалансированный","Balanced"],["friendly","Дружелюбный","Friendly"],["formal","Формальный","Formal"],["concise","Краткий","Concise"],["detailed","Подробный","Detailed"]]) firmwareStyle.append(new Option(tr(ru,en),value));
    const firmwareDiscussionLabel = node("label", tr("Обсуждение спорных тем", "Sensitive-topic discussion"), "field-label");
    const firmwareDiscussion = node("select", undefined, "inp");
    firmwareDiscussionLabel.htmlFor = "aiFirmwareDiscussion"; firmwareDiscussion.id = "aiFirmwareDiscussion";
    for (const [value, ru, en] of [["contextual","Контекстный анализ — без фильтра по словам","Contextual analysis — no keyword filtering"],["academic","Академический и исторический","Academic and historical"],["balanced","Сбалансированный разбор фактов","Balanced, evidence-led discussion"]]) firmwareDiscussion.append(new Option(tr(ru,en),value));
    const firmwareMaskRow = node("label", undefined, "display-option");
    const firmwareMaskText = node("span", tr("Внутренние названия моделей всегда скрыты", "Internal model names are always hidden"));
    const firmwareMask = node("input"); firmwareMask.type = "checkbox"; firmwareMask.id = "aiFirmwareMaskModels"; firmwareMask.className = "display-switch"; firmwareMask.checked = true; firmwareMask.disabled = true; firmwareMask.setAttribute("role","switch");
    firmwareMaskRow.append(firmwareMaskText,firmwareMask);
    const firmwareSafety = node("p", tr("Базовые правила безопасности всегда включены и не могут быть отключены.", "Core safety rules always remain enabled and cannot be disabled."), "settings-hint");
    const firmwareStatus = node("p", "", "settings-hint"); firmwareStatus.id = "aiFirmwareStatus";
    const firmwareSave = button(tr("Сохранить прошивку", "Save AI firmware"), async () => {
      firmwareSave.disabled = true; firmwareStatus.textContent = tr("Сохранение…","Saving…");
      try {
        const value = await ctx.api("/api/admin/ai-firmware", {method:"PUT",body:{style:firmwareStyle.value,discussion:firmwareDiscussion.value,maskModels:firmwareMask.checked}});
        firmwareStyle.value=value.style; firmwareDiscussion.value=value.discussion; firmwareMask.checked=value.maskModels===true;
        firmwareStatus.textContent = tr("Глобальная прошивка сохранена.","Global AI firmware saved.");
      } catch(error) { firmwareStatus.textContent = error.message || tr("Не удалось сохранить настройки.","Could not save settings."); }
      finally { firmwareSave.disabled = false; }
    });
    firmwareSave.id = "aiFirmwareSave";
    firmware.append(firmwareTitle,firmwareHint,firmwareStyleLabel,firmwareStyle,firmwareDiscussionLabel,firmwareDiscussion,firmwareMaskRow,firmwareSafety,firmwareSave,firmwareStatus);
    p.append(firmware);
    async function loadFirmware() {
      try {
        const value = await ctx.api("/api/admin/ai-firmware");
        firmwareStyle.value = value.style || "balanced";
        firmwareDiscussion.value = value.discussion || "contextual";
        firmwareMask.checked = value.maskModels !== false;
        firmwareStatus.textContent = value.updatedAt ? tr("Последнее сохранение: ","Last saved: ")+new Date(value.updatedAt).toLocaleString(ctx.lang()==="ru"?"ru-RU":"en-US") : tr("Используются стандартные настройки.","Default settings are active.");
      } catch(error) { firmwareStatus.textContent = error.message || tr("Не удалось загрузить прошивку.","Could not load AI firmware."); }
    }
    p._loadAiFirmware = loadFirmware;
    const users = node("details", undefined, "admin-users"), usersSummary = node("summary", tr("Пользователи", "Users")), usersStatus = node("p", "", "settings-hint"), usersWrap = node("div", undefined, "admin-users-wrap"), usersTable = node("table", undefined, "admin-users-table"), usersHead = node("thead"), usersBody = node("tbody"), usersActions = node("div", undefined, "admin-users-actions");
    users.id = "adminUsers"; usersStatus.id = "adminUsersStatus"; usersTable.append(usersHead, usersBody); usersWrap.append(usersTable); users.append(usersSummary, usersStatus, usersWrap);
    const headRow = node("tr"); [["Имя","Name"],["Почта","Email"],["Возраст аккаунта","Account age"],["Подписка","Subscription"],["Платежи","Payments"],["Последнее посещение","Last visit"]].forEach(([ru,en])=>headRow.append(node("th",tr(ru,en)))); usersHead.append(headRow);
    let usersOffset = 0, usersBusy = false, usersLoaded = false;
    function accountAge(value){if(!Number.isFinite(Number(value))||Number(value)<=0)return "—";const days=Math.max(0,Math.floor((Date.now()-Number(value))/86400000));if(ctx.lang()==="ru"){if(days<30)return days+" дн.";const months=Math.floor(days/30);if(months<12)return months+" мес.";const years=Math.floor(months/12),rest=months%12;return years+" г. "+(rest?rest+" мес.":"");}if(days<30)return days+" d";const months=Math.floor(days/30);if(months<12)return months+" mo";const years=Math.floor(months/12),rest=months%12;return years+" y "+(rest?rest+" mo":"");}
    function dateLabel(value){return Number(value)>0?new Date(Number(value)).toLocaleString(ctx.lang()==="ru"?"ru-RU":"en-US",{dateStyle:"medium",timeStyle:"short"}):"—";}
    function paymentLabel(items){if(!items||!items.length)return tr("Нет платежей","No payments");return items.map(x=>{const amount=(Number(x.paidMinor||0)/100).toLocaleString(ctx.lang()==="ru"?"ru-RU":"en-US",{minimumFractionDigits:2,maximumFractionDigits:2})+" "+x.currency;return tr("Оплачено: ","Paid: ")+(x.paidCount||0)+" · "+amount+(x.pendingCount?" · "+tr("Ожидают: ","Pending: ")+x.pendingCount:"")+(x.failedCount?" · "+tr("Не завершено: ","Unsuccessful: ")+x.failedCount:"");}).join(" / ");}
    let selectedUser=null,selectedReport=null,selectedDetails=null;
    function modal(titleText,cls){const d=node("dialog",undefined,"admin-user-dialog "+(cls||""));const h=node("h2",titleText);const close=button(tr("Закрыть","Close"),()=>d.close());close.classList.add("admin-dialog-close");d.append(h);d.addEventListener("click",e=>{if(e.target===d)d.close();});p.append(d);return {dialog:d,heading:h,close};}
    const detailsModal=modal(tr("Сведения о пользователе","User details"));
    const detailsContent=node("div",undefined,"admin-user-details-content");detailsModal.dialog.append(detailsContent,detailsModal.close);
    const actionsModal=modal(tr("Действия с пользователем","User actions"));
    const actionsIdentity=node("div",undefined,"admin-action-identity"),reportBox=node("textarea",undefined,"inp admin-report-readonly");reportBox.readOnly=true;reportBox.rows=5;
    const reportHead=node("div",undefined,"admin-report-head"),reportStatus=node("select",undefined,"inp admin-report-status"),reportStatusMenu=node("div",undefined,"admin-report-status-menu"),reportStatusToggle=button(tr("Статус обращения","Report status"),()=>{reportStatusMenu.hidden=!reportStatusMenu.hidden;}),reportStatusSave=button(tr("Сохранить статус","Save status"),async()=>{if(!selectedReport)return;try{await ctx.api("/api/admin/moderation/reports/"+encodeURIComponent(selectedReport.id)+"/status",{method:"POST",body:{status:reportStatus.value}});selectedReport.status=reportStatus.value;reportStatusSave.textContent=tr("Сохранено","Saved");reportStatusSave.hidden=true;}catch(e){reportStatusSave.textContent=e.message;}});reportStatus.hidden=true;reportStatusMenu.hidden=true;reportStatusSave.hidden=true;
    for(const [value,r,e] of [["accepted","✓ Согласие","✓ Accepted"],["investigation","◷ Разбирательства","◷ Under review"],["rejected","× Отказ","× Rejected"]]){const label=tr(r,e);reportStatus.append(new Option(label,value));reportStatusMenu.append(button(label,()=>{reportStatus.value=value;reportStatusMenu.hidden=true;reportStatusToggle.textContent=label;reportStatusSave.hidden=false;}));}reportHead.append(reportStatusToggle);
    const reportPanel=node("section",undefined,"admin-report-panel");reportPanel.append(reportHead,reportBox,reportStatus,reportStatusMenu,reportStatusSave);
    const actionReason=field(actionsModal.dialog,tr("Причина действия","Reason for action"));actionReason.placeholder=tr("Укажите причину, которая будет видна пользователю","Enter the reason visible to the user");actionReason.maxLength=2000;
    const actionButtons=node("div",undefined,"admin-moderation-actions");
    const actionReasonLabel=actionReason.closest("label");actionReasonLabel.classList.add("admin-action-reason");
    actionsModal.dialog.append(actionsIdentity,reportPanel,actionReasonLabel,actionButtons,actionsModal.close);
    let pendingKind="";
    const confirmModal=modal(tr("Подтвердить действие","Confirm action"));
    const confirmText=node("p",undefined,"settings-hint"),termSelect=node("select",undefined,"inp");
    for(const [value,r,e] of [["1","1 день","1 day"],["7","7 дней","7 days"],["30","30 дней","30 days"],["90","90 дней","90 days"],["permanent","Бессрочно","Permanent"]])termSelect.append(new Option(tr(r,e),value));
    const confirmReason=node("p",undefined,"settings-hint"),confirmGo=button(tr("Подтвердить","Confirm"),async()=>{if(!selectedUser||!pendingKind)return;confirmGo.disabled=true;try{await ctx.api("/api/admin/users/"+selectedUser.id+"/actions",{method:"POST",body:{kind:pendingKind,reason:actionReason.value.trim(),term:termSelect.value,reportId:selectedReport?.id||null}});confirmModal.dialog.close();actionsModal.dialog.close();await loadUsers(true);}catch(e){confirmText.textContent=e.message;}finally{confirmGo.disabled=false;}});
    confirmModal.dialog.append(confirmText,termSelect,confirmReason,confirmGo,confirmModal.close);
    function openAction(kind){pendingKind=kind;const warning=kind==="warning";confirmModal.heading.textContent=kind==="ban"?tr("Подтвердить бан","Confirm ban"):kind==="restrict"?tr("Ограничить доступ к функциям","Restrict AI access"):tr("Отправить предупреждение","Send warning");const activeWarnings=(selectedDetails?.actions||[]).filter(x=>x.kind==='warning'&&!x.revoked_at).length;confirmText.textContent=warning?(activeWarnings>=2?tr("Это третье активное предупреждение. После него аккаунт будет автоматически заблокирован бессрочно.","This is the third active warning. The account will be automatically banned permanently after it."):tr("Пользователь получит уведомление в приложении и на почту. Максимум три активных предупреждения.","The user will receive an in-app and email warning. Maximum three active warnings.")):tr("Выберите срок действия ограничения.","Choose how long the restriction will last.");termSelect.hidden=warning;confirmReason.textContent=tr("Проверьте причину: ","Reason: ")+(actionReason.value.trim()||tr("не указана","not provided"));confirmModal.dialog.showModal();}
    async function showUserDetails(user){selectedUser=user;detailsContent.replaceChildren(node("p",tr("Загрузка сведений…","Loading details…"),"settings-hint"));detailsModal.dialog.showModal();try{const d=await ctx.api("/api/admin/users/"+user.id+"/details");selectedDetails=d;detailsContent.replaceChildren();const rows=[["ID",d.id],["Имя",d.nickname||user.name],["Почта",d.email],["Создан",dateLabel(d.firebase_created_at||d.created_at)],["Последний визит",dateLabel(d.last_seen_at)],["Подтверждение почты",d.email_verified?tr("Да","Yes"):tr("Нет","No")],["Plus до",dateLabel(d.subscription_until)],["Умный ПК до",dateLabel(d.smart_pc_until)],["Google ID",d.google_id||"—"],["Firebase UID",d.firebase_uid||"—"],["Аватар",d.avatar||"—"],["Активный бан",d.access?.banned?tr("Да","Yes"):tr("Нет","No")],["Ограничение функций",d.access?.restricted?tr("Да","Yes"):tr("Нет","No")],["Всего обращений",(d.reports||[]).length],["Всего действий",(d.actions||[]).length],["Предупреждения",(d.actions||[]).filter(x=>x.kind==='warning'&&!x.revoked_at).length+" / 3"]];for(const [k,v] of rows){const line=node("div",undefined,"admin-detail-line");line.append(node("strong",String(k)),node("span",String(v??"—")));detailsContent.append(line);}detailsContent.append(node("h3",tr("История действий","Action history")));for(const a of d.actions||[]){const line=node("div",undefined,"admin-detail-action");line.append(node("span",a.kind+" · "+(a.reason||"—")+" · "+dateLabel(a.created_at)));if(!a.revoked_at){const revoke=button(tr("Снять","Revoke"),async()=>{await ctx.api("/api/admin/moderation/actions/"+a.id+"/revoke",{method:"POST",body:{}});await showUserDetails(user);});line.append(revoke);}detailsContent.append(line);}detailsContent.append(node("h3",tr("Обращения и апелляции","Reports and appeals")));for(const r of d.reports||[])detailsContent.append(node("p",r.category+" · "+r.status+" · "+dateLabel(r.created_at)+"\n"+r.details,"settings-hint"));}catch(e){detailsContent.replaceChildren(node("p",e.message,"settings-hint"));}}
    async function showUserActions(user,reportId){selectedUser=user;actionsModal.heading.textContent=tr("Действия","Actions");actionsIdentity.replaceChildren(node("strong",user.name||"—"),node("span",user.email||"—"));try{const d=await ctx.api("/api/admin/users/"+user.id+"/details");selectedDetails=d;actionsIdentity.append(node("small",tr("Активных предупреждений: ","Active warnings: ")+((d.actions||[]).filter(x=>x.kind==='warning'&&!x.revoked_at).length)+" / 3","settings-hint"));selectedReport=(d.reports||[]).find(x=>x.id===reportId)||(d.reports||[]).find(x=>x.category!=="appeal")||null;reportBox.value=selectedReport?selectedReport.details:"";reportHead.replaceChildren(node("span",selectedReport?tr("Обращение №","Report #")+selectedReport.id.slice(0,8)+" · "+dateLabel(selectedReport.created_at):tr("Жалоб нет","No report attached")),reportStatusToggle);reportPanel.hidden=!selectedReport;reportStatusMenu.hidden=true;reportStatusToggle.hidden=!selectedReport;reportStatusToggle.textContent=selectedReport?({accepted:tr("✓ Согласие","✓ Accepted"),investigation:tr("◷ Разбирательства","◷ Under review"),rejected:tr("× Отказ","× Rejected")}[selectedReport.status]||tr("Статус обращения","Report status")):tr("Жалоб нет","No report attached");reportStatusSave.hidden=true;if(selectedReport){reportStatus.value=selectedReport.status;reportStatusSave.textContent=tr("Сохранить статус","Save status");}actionButtons.replaceChildren();for(const [kind,r,e] of [["ban","Бан","Ban"],["restrict","Ограничить доступ к функциям","Restrict AI access"],["warning","Предупреждение","Warning"]]){const b=button(tr(r,e),()=>openAction(kind));b.classList.add("admin-action-"+kind);actionButtons.append(b);}actionsModal.dialog.showModal();}catch(e){reportHead.textContent=e.message;actionsModal.dialog.showModal();}}
    async function loadUsers(reset=false){if(usersBusy)return;if(reset){usersOffset=0;usersBody.replaceChildren();usersLoaded=false;}usersBusy=true;usersMore.disabled=true;usersStatus.textContent=tr("Загрузка…","Loading…");try{const data=await ctx.api("/api/admin/users?offset="+usersOffset);for(const u of data.users||[]){const row=node("tr"),until=Number(u.subscription?.plusUntil||0),smart=Number(u.subscription?.smartPcUntil||0),subscription=until>Date.now()?tr("Plus до ","Plus until ")+dateLabel(until):tr("Бесплатная","Free");row.classList.add("admin-user-row");row.append(node("td",u.name||"—"),node("td",u.email||"—"),node("td",accountAge(u.createdAt)),node("td",subscription+(smart>Date.now()?" · Smart PC":"")),node("td",paymentLabel(u.payments)),node("td",dateLabel(u.lastVisitAt)));usersBody.append(row);row.tabIndex=0;row.setAttribute("role","button");row.setAttribute("aria-label",tr("Выбрать пользователя ","Select user ")+(u.name||u.email));const expand=()=>{const old=row.nextElementSibling;if(old?.classList.contains("admin-user-expanded")){old.remove();row.classList.remove("selected");return;}usersBody.querySelectorAll(".admin-user-expanded").forEach(x=>x.remove());usersBody.querySelectorAll(".admin-user-row").forEach(x=>x.classList.remove("selected"));row.classList.add("selected");const trRow=node("tr",undefined,"admin-user-expanded"),cell=node("td");cell.colSpan=6;const bar=node("div",undefined,"admin-user-action-bar");bar.append(button(tr("Сведения","Details"),()=>showUserDetails(u)),button(tr("Действия","Actions"),()=>showUserActions(u)));cell.append(bar);trRow.append(cell);row.after(trRow);};row.addEventListener("click",expand);row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();expand();}});}usersOffset+=Array.isArray(data.users)?data.users.length:0;usersStatus.textContent=tr("Пользователей: ","Users: ")+usersOffset;usersMore.hidden=!data.hasMore;usersMore.textContent=tr("Загрузить ещё","Load more");usersLoaded=true;}catch(error){usersStatus.textContent=error.message||tr("Не удалось загрузить пользователей","Could not load users");usersLoaded=false;usersMore.hidden=false;usersMore.textContent=tr("Повторить загрузку","Retry loading");}finally{usersBusy=false;usersMore.disabled=false;}}
    const usersMore=button(tr("Загрузить ещё","Load more"),()=>loadUsers(false));usersMore.id="adminUsersMore";usersMore.hidden=true;usersActions.append(usersMore);users.append(usersActions);users.addEventListener("toggle",()=>{if(users.open&&!usersLoaded)void loadUsers(true);});p.append(users);p._openModerationReport=async reportId=>{selectTab("developer");users.open=true;if(!usersLoaded)await loadUsers(true);const data=await ctx.api("/api/admin/moderation/reports?limit=200"),report=(data.reports||[]).find(x=>x.id===reportId);if(!report)throw Error(tr("Обращение не найдено","Report not found"));await showUserActions({id:report.user_id,name:report.nickname||report.user_email,email:report.user_email},reportId);};
    const dialog = node("dialog");
    dialog.id = "adminCheckDialog";
    dialog.className = "admin-check-dialog";
    dialog.setAttribute("aria-labelledby", "adminCheckTitle");
    const title = node("h2", tr("Выберите тип проверки", "Choose a check"));
    title.id = "adminCheckTitle";
    const close = button(tr("Закрыть", "Close"), () => dialog.close());
    const choices = node("div", undefined, "grid2");
    for (const [mode, r, e] of [
      ["standard", "Обычный тест", "Standard test"],
      ["full", "Полное сканирование", "Full local scan"],
    ])
      choices.append(
        button(tr(r, e), () => {
          dialog.close();
          startScan(mode);
        }),
      );
    dialog.append(
      title,
      paragraph(
        dialog,
        "Проверка локальных компонентов и синтаксиса. Не заменяет полный CI, аудит безопасности или проверку внешних сервисов.",
        "Local component and syntax diagnostics. Not a replacement for full CI, security auditing or external service tests.",
      ),
      choices,
      close,
    );
    document.body.append(dialog);
    for (const [id, r, e] of [
      ["disabled", "Остановить работу сайта", "Disable site"],
      ["maintenance", "Технические работы", "Maintenance"],
    ]) {
      const label = node("label", undefined, "display-option"),
        input = node("input");
      input.type = "checkbox";
      input.id = "admin-" + id;
      input.className = "display-switch";
      input.setAttribute("role", "switch");
      input.onchange = saveAdmin;
      label.append(node("span", tr(r, e)), input);
      p.append(label);
    }
    const progress = node("progress");
    progress.id = "adminScanProgress";
    progress.max = 1;
    progress.value = 0;
    progress.hidden = true;
    p.append(progress, node("p", "", "settings-hint"));
    progress.nextSibling.id = "adminScanCount";
    progress.nextSibling.hidden = true;
    const reports = node("div");
    reports.id = "adminReports";
    p.append(reports);
    const hint = paragraph(
      p,
      "Эти ограничения применяются к обычным пользователям. Подтверждённые разработчики сохраняют доступ, чтобы можно было снова включить сайт. Изменения сохраняются в базе этого сервера.",
      "Restrictions apply to regular users. Verified developers retain access so they can reopen the site. Changes are stored in this server’s database.",
    );
    hint.id = "adminControlHint";
    const output = node("p", "", "admin-control-status");
    output.id = "adminControlStatus";
    output.setAttribute("role", "status");
    output.setAttribute("aria-live", "polite");
    p.append(output);
    const email = field(
      p,
      tr("Почта для чёрного списка", "Email to block"),
      "email",
    );
    email.id = "adminBlockEmail";
    const block = button(tr("Заблокировать", "Block"), async () => {
      if (!email.reportValidity() || !email.value.trim()) {
        adminMessage(
          tr("Укажите корректную почту.", "Enter a valid email."),
          true,
        );
        return;
      }
      const ok = await mutateAdmin("/api/admin/blacklist", "POST", {
        email: email.value.trim().toLowerCase(),
      });
      if (ok) {
        email.value = "";
        $("adminBlacklist").parentElement.open = true;
      }
    });
    block.id = "adminBlockButton";
    p.append(block);
    const details = node("details"),
      summary = node("summary", tr("Чёрный список", "Blacklist")),
      list = node("div");
    list.id = "adminBlacklist";
    details.append(summary, list);
    p.append(details);
  }
  function adminMessage(text, error = false) {
    const el = $("adminControlStatus");
    if (!el) return;
    el.textContent = text;
    el.dataset.error = String(error);
  }
  function adminLock(value) {
    adminBusy = value;
    for (const id of [
      "admin-disabled",
      "admin-maintenance",
      "adminBlockEmail",
      "adminBlockButton",
    ])
      if ($(id)) $(id).disabled = value;
    $("adminBlacklist")
      ?.querySelectorAll("button")
      .forEach((b) => (b.disabled = value));
  }
  function applyAdminState(v) {
    adminState = {
      disabled: v.disabled === true,
      maintenance: v.maintenance === true,
    };
    $("admin-disabled").checked = adminState.disabled;
    $("admin-maintenance").checked = adminState.maintenance;
    const forced = v.environmentMaintenance === true;
    $("adminControlHint").textContent = forced
      ? tr(
          "Сервер запущен с MAINTENANCE_MODE=true: режим обслуживания нельзя отключить здесь. Разработчики сохраняют доступ.",
          "The server uses MAINTENANCE_MODE=true: maintenance cannot be disabled here. Developers retain access.",
        )
      : tr(
          "Ограничения действуют для обычных пользователей. Подтверждённые разработчики сохраняют доступ для управления сайтом. Состояние хранится в базе этого сервера.",
          "Restrictions apply to regular users. Verified developers retain management access. State is stored in this server’s database.",
        );
  }
  async function saveAdmin() {
    if (adminBusy) return;
    const desired = {
        disabled: $("admin-disabled").checked,
        maintenance: $("admin-maintenance").checked,
      },
      previous = { ...adminState };
    const ok = await mutateAdmin("/api/admin/control", "PUT", desired);
    if (!ok) {
      $("admin-disabled").checked = previous.disabled;
      $("admin-maintenance").checked = previous.maintenance;
    }
  }
  async function mutateAdmin(url, method, body) {
    if (adminBusy) return false;
    const token = epoch;
    ++adminRequest;
    adminLock(true);
    adminMessage(tr("Сохраняю…", "Saving…"));
    try {
      await ctx.api(url, { method, body });
      if (token !== epoch) return false;
      await admin(true);
      if (token !== epoch) return false;
      adminMessage(
        tr(
          "Изменения сохранены и подтверждены сервером.",
          "Changes saved and confirmed by the server.",
        ),
      );
      void siteState();
      return true;
    } catch (e) {
      if (token === epoch) adminMessage(e.message, true);
      return false;
    } finally {
      if (token === epoch) adminLock(false);
    }
  }
  async function admin(force = false) {
    if (!ctx.user()?.developer || (adminBusy && !force)) return;
    const token = epoch,
      request = ++adminRequest;
    try {
      const v = await ctx.api("/api/admin/control");
      if (token !== epoch || request !== adminRequest || (adminBusy && !force))
        return;
      applyAdminState(v);
      $("adminBlacklist").replaceChildren();
      for (const b of v.blocked) {
        const row = node("div", undefined, "admin-block-row");
        row.append(
          node(
            "span",
            b.email + " · " + new Date(b.blockedAt).toLocaleString(ctx.lang()),
          ),
          button(tr("Исключить", "Unblock"), async () => {
            await mutateAdmin("/api/admin/blacklist", "DELETE", {
              email: b.email,
            });
          }),
        );
        $("adminBlacklist").append(row);
      }
      if (!v.blocked.length)
        $("adminBlacklist").append(
          node("p", tr("Список пуст", "No blocked accounts"), "settings-hint"),
        );
      $("adminReports").replaceChildren();
      for (const scan of v.scans) report(scan);
    } catch (e) {
      if (token === epoch && request === adminRequest)
        adminMessage(e.message, true);
      if (force) throw e;
    }
  }
  function report(v) {
    const box = node("details"),
      summary = node(
        "summary",
        tr("Проверка", "Scan") +
          " · " +
          new Date(v.finishedAt || v.startedAt).toLocaleString(ctx.lang()),
      ),
      code = node("pre"),
      logs = v.checks
        .map((c) => (c.ok ? "PASS" : "FAIL") + " — " + c.name)
        .join("\n"),
      a = node("a", tr("Скачать отчёт .md", "Download .md report"));
    const badge = node("span");
    badge.className = "scan-status";
    badge.setAttribute(
      "aria-label",
      v.running
        ? tr("В процессе", "Running")
        : v.ok
          ? tr("Успешно", "Passed")
          : tr("Есть ошибки", "Errors found"),
    );
    badge.innerHTML =
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="' +
      (v.running
        ? "M6 12h12"
        : v.ok
          ? "m5 12 4 4L19 6"
          : "m6 6 12 12M18 6 6 18") +
      '"/></svg>';
    summary.prepend(badge);
    a.href = "#";
    a.onclick = async (e) => {
      e.preventDefault();
      try {
        const value = await ctx.api(
          "/api/admin/scans/" + encodeURIComponent(v.id),
        );
        download(
          "Pongy-AI-scan-" + v.id + ".md",
          "# Pongy AI\n\n" +
            new Date(value.finishedAt || value.startedAt).toISOString() +
            "\n\n" +
            value.passed +
            "/" +
            value.total +
            " checks passed.\n\n" +
            value.checks
              .map((c) => (c.ok ? "PASS" : "FAIL") + " — " + c.name)
              .join("\n") +
            "\n\nScope: local diagnostics, not full CI or a security audit.\n",
        );
      } catch (error) {
        ctx.notify(error.message);
      }
    };
    code.append(
      button(tr("Копировать", "Copy"), () =>
        navigator.clipboard.writeText(logs).catch(() => {}),
      ),
      node("code", logs),
    );
    box.append(summary, a, code);
    $("adminReports").append(box);
  }
  function download(name, text) {
    const url = URL.createObjectURL(
        new Blob([text], { type: "text/markdown;charset=utf-8" }),
      ),
      a = node("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function startScan(mode) {
    if (scanRunning) return;
    scanRunning = true;
    $("adminCheckButton").setAttribute("aria-busy", "true");
    $("adminCheckButton").disabled = true;
    $("adminScanProgress").hidden = false;
    $("adminScanCount").hidden = false;
    $("adminScanProgress").value = 0;
    $("adminScanCount").textContent = "";
    const modal = $("settingsModal"),
      close = $("closeSettings"),
      previous = close.disabled;
    close.disabled = true;
    modal.dataset.scanning = "true";
    const guard = (e) => {
      if (
        scanRunning &&
        (e.key === "Escape" || e.target === modal || e.target === close)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    modal.addEventListener("click", guard, true);
    document.addEventListener("keydown", guard, true);
    try {
      let v = await ctx.api("/api/admin/scans", {
        method: "POST",
        body: { mode },
      });
      for (;;) {
        $("adminScanProgress").max = v.total || 1;
        $("adminScanProgress").value = v.completed;
        $("adminScanCount").textContent =
          v.passed +
          " / " +
          v.total +
          " " +
          tr("тестов прошли проверку", "checks passed");
        if (!v.running) break;
        await new Promise((r) => setTimeout(r, 1500));
        v = await ctx.api("/api/admin/scans/" + encodeURIComponent(v.id));
      }
      await admin();
    } catch (e) {
      ctx.notify(e.message);
    } finally {
      scanRunning = false;
      $("adminCheckButton").removeAttribute("aria-busy");
      $("adminCheckButton").disabled = false;
      close.disabled = previous;
      delete modal.dataset.scanning;
      modal.removeEventListener("click", guard, true);
      document.removeEventListener("keydown", guard, true);
    }
  }
  async function refresh() {
    const user = ctx.user(),
      id = user?.email || "";
    if (user?.guest) {
      $("accountEmailLabel")?.remove();
      $("accountEmail")?.remove();
      syncBetaTab();
      $("settings-tab-developer").hidden = true;
      return;
    }
    if (!$("accountEmailLabel") && user) {
      const emailLabel = node("label",tr("Почта аккаунта", "Account email"),"settings-field");
      const emailField = node("input");
      emailLabel.id = "accountEmailLabel";
      emailField.id = "accountEmail";
      emailField.type = "email";
      emailField.readOnly = true;
      emailField.className = "inp";
      emailField.autocomplete = "off";
      emailLabel.append(emailField);
      $("settings-panel-account").insertBefore(emailLabel,$("logoutBtnSettings"));
    }
    if ($("accountEmail")) $("accountEmail").value = id;
    if (account !== id) {
      account = id;
      ["mcpEndpoint","mcpSecret"].forEach(id=>{if($(id))$(id).value="";});
      ["apiKeyValue","apiKeyEndpoint","mcpConfig"].forEach(id=>{if($(id))$(id).textContent="";});
      ["apiKeyCopy","mcpCopyConfig"].forEach(id=>{if($(id))$(id).hidden=true;});
      epoch++;
      apiRevision++;
      apiDirty = readApiMeta()?.draft === true;
      clearApiModels();
      const provider = $("personalApiProvider");
      provider.disabled = true;
      provider.replaceChildren();
      delete provider.dataset.loaded;
      delete provider.dataset.loading;
      $("personalApiSave").disabled = false;
      $("personalApiRemove").disabled = false;
      ++adminRequest;
      adminLock(false);
      adminMessage("");
      lastRefresh = 0;
      autoRestored = 0;
      siteState();
      $("personalApiKey").value = readStoredKey();
      $("personalApiConsent").checked = readConsent();
      hideApiKey();
      $("betaFunctions").checked = ctx.beta();
      syncBetaTab();
      lock(false);
      void refreshApiKeyStatus();
      void refreshMcpStatus();
    }
    const keyField = $("personalApiKey");
    if (keyField && !keyField.value) {
      const stored = readStoredKey();
      if (stored) keyField.value = stored;
    }
    const dev = !!user?.developer;
    $("settings-tab-developer").hidden = !dev;
    if (!dev && active === "developer") selectTab("main");
    if (!user) return;
    loadProviderCatalog();
    if (Date.now() - lastRefresh < 12000) return;
    lastRefresh = Date.now();
    const token = epoch;
    await Promise.all([
      ctx
        .api("/api/user-api")
        .then((v) => {
          if (token !== epoch) return;
          showApi(v);
          if (!v.connected && !v.unavailable && id)
            void autoRestoreConnection(id);
        })
        .catch((e) => {
          if (token === epoch) $("personalApiStatus").textContent = e.message;
        }),
      usage(),
      dev ? admin() : Promise.resolve(),
    ]);
  }
  async function siteState() {
    try {
      const response = await fetch("/api/site-state", { cache: "no-store" });
      if (!response.ok) return;
      const value = await response.json(),
        user = ctx.user(),
        closed = (value.disabled || value.maintenance) && !user?.developer;
      let box = $("siteControlScreen");
      if (!box) {
        box = node("section");
        box.id = "siteControlScreen";
        box.setAttribute("role", "alert");
        box.hidden = true;
        const icon = node("span");
        icon.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 6.5v6"/><circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/></svg>';
        box.append(
          icon,
          node("h1"),
          button(tr("Вход разработчика", "Developer sign-in"), () => {
            box.hidden = true;
            box.dataset.login = "true";
          }),
        );
        document.body.append(box);
      }
      if (!closed) {
        box.hidden = true;
        delete box.dataset.login;
        return;
      }
      box.querySelector("h1").textContent = value.disabled
        ? tr(
            "Внимание! На данный момент сайт отключен. Попробуйте посетить нас позднее!",
            "Attention! The site is currently disabled. Please try again later!",
          )
        : tr(
            "Извините, сейчас этот сервис недоступен. На сайте ведутся технические работы!",
            "Sorry, this service is unavailable during maintenance.",
          );
      box.querySelector("button").hidden = !!user;
      if (box.dataset.login !== "true" || user) box.hidden = false;
    } catch {}
  }
  function init(options) {
    ctx = options;
    setup();
    window.addEventListener("pongy-session-ready", () => {
      void refresh();
    });
    siteState();
    setInterval(siteState, 30000);
    let last = "";
    statusTimer = setInterval(() => {
      const id = ctx.user()?.email || "";
      if (id !== last) {
        last = id;
        refresh();
      }
      if ($("settingsModal").classList.contains("open")) usage();
    }, 15000);
    refresh();
  }
  // Watchdog: re-check the personal API while the session is live. A silent server-side loss
  // (redeploy with a stable encryption secret) can be repaired from a validated browser copy.
  setInterval(function () {
    if (!ctx || !ctx.ready() || restoreBusy) return;
    var id = ctx.account();
    if (!id) return;
    ctx
      .api("/api/user-api")
      .then(function (v) {
        if (v && v.connected !== true && !v.unavailable && ctx.account() === id)
          autoRestoreConnection(id);
      })
      .catch(function () {});
  }, 120000);
  root.addEventListener("pongy-answer-settled",()=>{if($("settingsModal").classList.contains("open"))void usage();});
  root.addEventListener("pongy-products-updated",()=>{if($("settingsModal").classList.contains("open"))void usage();});
  root.PongySettings = {
    init,
    openAccount() { selectTab("account"); },
    openMain() { selectTab("main"); },
    openDeveloper() { if ($("settings-tab-developer")?.hidden) return false; selectTab("developer"); return active === "developer"; },
    openModerationReport(id) { return $("settings-panel-developer")?._openModerationReport?.(id); },
    async openAppeal() { if (!moderationActions.length) await loadMyModeration(); const action = moderationActions.find((item) => !item.revokedAt); if (!action) return false; appealAction = action.id; appealInput.value = ""; appealStatus.textContent = ""; appealDialog.showModal(); return true; },
    refresh,
    refreshUsage: usage,
    checkSite: siteState,
    syncPreferences() {
      if (!ctx) return;
      $("betaFunctions").checked = ctx.beta();
      syncBetaTab();
      $("voiceGender").value = ctx.voiceGender();
    },
    syncVoiceGender() {
      if (ctx) $("voiceGender").value = ctx.voiceGender();
    },
    reset() {
      if (!ctx) return;
      account = "";
      ["mcpEndpoint","mcpSecret"].forEach(id=>{if($(id))$(id).value="";});
      ["apiKeyValue","apiKeyEndpoint","mcpConfig"].forEach(id=>{if($(id))$(id).textContent="";});
      ["apiKeyCopy","mcpCopyConfig"].forEach(id=>{if($(id))$(id).hidden=true;});
      epoch++;
      apiRevision++;
      apiDirty = false;
      modelsRequest++;
      autoRestored = 0;
      clearApiModels();
      $("personalApiProvider").replaceChildren();
      delete $("personalApiProvider").dataset.loaded;
      delete $("personalApiProvider").dataset.loading;
      $("personalApiKey").value = "";
      $("personalApiConsent").checked = false;
      $("adminReports").textContent = "";
      $("adminBlacklist").textContent = "";
      $("adminBlockEmail").value = "";
      $("settings-tab-developer").hidden = true;
      selectTab("main");
      lock(false);
      $("personalApiSave").hidden = false;
      $("personalApiRemove").hidden = true;
      $("personalApiStatus").textContent = "";
      $("personalApiKey").placeholder = tr("API-ключ", "API key");
      $("personalApiKey").dataset.saved = "false";
      hideApiKey();
    },
  };
})(window);
