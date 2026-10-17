
/* StudyOS lightweight notebook. Local data only; no teaching/chat services. */
(function (global) {
  "use strict";
  const Copy = global.StudyCopy || (typeof require === "function" ? require("./copy-en.js") : null);

  const DB_NAME = "studyos-light-notebook";
  const DB_VERSION = 1;
  const STORE = "records";
  const STATUSES = ["待整理", "待再看", "已练习", "已归档"];
  const SOURCES = ["课堂练习", "作业", "测验", "考试", "项目反馈"];
  const REASONS = [
    "暂不判断",
    "知识理解",
    "审题",
    "计算",
    "表达",
    "证据使用",
    "时间分配",
  ];
  const IMAGE_GROUPS = ["question", "ownAnswer", "referenceAnswer", "feedback"];
  const IMAGE_LABELS = {
    question: Copy.text("notebook.question_88b39d"),
    ownAnswer: Copy.text("notebook.my_answer_f6e148"),
    referenceAnswer: Copy.text("notebook.reference_answer_7b55c5"),
    feedback: Copy.text("notebook.teacher_feedback_8a383c"),
  };
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
  const MAX_RECORD_IMAGES = 12;
  const MAX_BACKUP_BYTES = 150 * 1024 * 1024;
  let databasePromise;

  function uid() {
    return (
      global.crypto?.randomUUID?.() ||
      "nb_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2)
    );
  }
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function text(value, max, field) {
    if (value == null) return "";
    if (typeof value !== "string" || value.length > max)
      throw new Error((field || Copy.text("notebook.content_e0135d")) + Copy.text("notebook.is_invalid_or_too_long_b92577"));
    return value.trim();
  }
  function validDate(value, fallback) {
    if (!value) return fallback;
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
      throw new Error(Copy.text("notebook.enter_a_valid_record_date_912039"));
    return new Date(value).toISOString();
  }
  function safeLink(value) {
    const candidate = text(value, 3000, Copy.text("notebook.resource_link_59921e"));
    if (!candidate) return "";
    let url;
    try {
      url = new URL(candidate);
    } catch (_) {
      throw new Error(Copy.text("notebook.enter_a_complete_https_or_af3580"));
    }
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error(Copy.text("notebook.use_an_http_or_https_0de424"));
    return url.href;
  }
  function validateImage(image) {
    if (!image || typeof image !== "object")
      throw new Error(Copy.text("notebook.the_image_record_is_invalid_18f6a7"));
    const data = text(
      image.data,
      Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 200,
      Copy.text("notebook.image_044c6c"),
    );
    const match =
      /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
        data,
      );
    if (!match || match[2].length % 4 !== 0)
      throw new Error(
        Copy.text("notebook.use_png_jpeg_webp_or_39c199"),
      );
    let header;
    try {
      header = atob(match[2].slice(0, 32));
    } catch (_) {
      throw new Error(Copy.text("notebook.the_image_data_is_damaged_2e5492"));
    }
    const isType = {
      png: header.startsWith("\x89PNG\r\n\x1a\n"),
      jpeg: header.startsWith("\xff\xd8\xff"),
      webp: header.startsWith("RIFF") && header.slice(8, 12) === "WEBP",
      gif: header.startsWith("GIF87a") || header.startsWith("GIF89a"),
    };
    if (!isType[match[1]]) throw new Error(Copy.text("notebook.the_image_type_does_not_4afad3"));
    if (!IMAGE_GROUPS.includes(image.group || "question"))
      throw new Error(Copy.text("notebook.the_image_category_is_invalid_575469"));
    return {
      id: /^[\w-]{1,100}$/.test(image.id || "") ? image.id : uid(),
      name: text(image.name || Copy.text("notebook.image_044c6c"), 250, Copy.text("notebook.image_name_fd21b6")),
      group: image.group || "question",
      data,
    };
  }
  function validateRecord(raw, creating) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Error(Copy.text("notebook.the_record_format_is_invalid_e1c160"));
    const now = new Date().toISOString();
    if (
      raw.id &&
      (typeof raw.id !== "string" || !/^[\w-]{1,100}$/.test(raw.id))
    )
      throw new Error(Copy.text("notebook.the_record_id_is_invalid_f85b00"));
    if (raw.images != null && !Array.isArray(raw.images))
      throw new Error(Copy.text("notebook.the_image_list_is_invalid_e8a8c5"));
    if ((raw.images || []).length > MAX_RECORD_IMAGES)
      throw new Error(Copy.text("notebook.maximum_images_per_record_49e0d0") + MAX_RECORD_IMAGES + Copy.text("notebook.images_2c41c4"));
    const images = (raw.images || []).map(validateImage);
    let tags = raw.tags || [];
    if (typeof tags === "string")
      tags = tags
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
    if (!Array.isArray(tags) || tags.length > 24)
      throw new Error(Copy.text("notebook.use_no_more_than_tags_bc050e"));
    tags = [
      ...new Set(tags.map((tag) => text(tag, 80, Copy.text("notebook.tags_37c462"))).filter(Boolean)),
    ];
    const record = {
      id: raw.id || uid(),
      title: text(raw.title, 500, Copy.text("notebook.title_c0e1e0")),
      question: text(raw.question, 50000, Copy.text("notebook.question_88b39d")),
      subject: text(raw.subject, 160, Copy.text("notebook.subject_ab77b5")),
      tags,
      source: text(raw.source, 160, Copy.text("notebook.source_962f56")),
      status: raw.status || "待整理",
      link: safeLink(raw.link),
      images,
      ownAnswer: text(raw.ownAnswer, 50000, Copy.text("notebook.my_answer_f6e148")),
      referenceAnswer: text(raw.referenceAnswer, 50000, Copy.text("notebook.reference_answer_7b55c5")),
      feedback: text(raw.feedback, 30000, Copy.text("notebook.teacher_feedback_8a383c")),
      reason: text(raw.reason, 2000, Copy.text("notebook.error_reason_d6026d")),
      createdAt: validDate(raw.createdAt, now),
      updatedAt: creating ? now : validDate(raw.updatedAt, now),
    };
    if (!STATUSES.includes(record.status)) throw new Error(Copy.text("notebook.the_record_status_is_invalid_df6a00"));
    if (
      !record.title &&
      !record.question &&
      !record.link &&
      !record.images.length
    )
      throw new Error(Copy.text("notebook.add_a_question_image_title_c5710f"));
    if (!record.title)
      record.title =
        record.question.slice(0, 60) || (record.link ? Copy.text("notebook.resource_link_59921e") : Copy.text("notebook.image_record_4dceaf"));
    return record;
  }
  async function verifyImages(images) {
    for (const image of images) {
      const preview = new Image();
      preview.src = image.data;
      try {
        await preview.decode();
        if (!preview.naturalWidth || !preview.naturalHeight)
          throw new Error("empty");
      } catch (_) {
        throw new Error(
          Copy.text("notebook.image_9e2776") + image.name + Copy.text("notebook.could_not_be_decoded_select_bbe6bf"),
        );
      } finally {
        preview.src = "";
      }
    }
  }

  function ready() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error(Copy.text("notebook.this_browser_does_not_support_18a300")));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE))
          request.result.createObjectStore(STORE, { keyPath: "id" });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          databasePromise = undefined;
        };
        resolve(db);
      };
      request.onerror = () => {
        databasePromise = undefined;
        reject(
          new Error(
            Copy.text("notebook.could_not_open_the_local_ec33f9") + (request.error?.message || Copy.text("notebook.storage_access_is_restricted_349968")),
          ),
        );
      };
      request.onblocked = () => {
        databasePromise = undefined;
        reject(new Error(Copy.text("notebook.another_tab_is_using_an_84daa3")));
      };
    });
    return databasePromise;
  }
  async function transaction(mode, action) {
    const db = await ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () =>
        reject(
          tx.error ||
            new Error(
              Copy.text("notebook.could_not_save_check_browser_889402"),
            ),
        );
      tx.onerror = () => {};
      try {
        action(tx.objectStore(STORE), (value) => {
          result = value;
        });
      } catch (error) {
        tx.abort();
        reject(error);
      }
    });
  }
  async function list() {
    return transaction("readonly", (store, done) => {
      const request = store.getAll();
      request.onsuccess = () =>
        done(
          request.result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        );
    });
  }
  async function get(id) {
    return transaction("readonly", (store, done) => {
      const request = store.get(id);
      request.onsuccess = () => done(request.result || null);
    });
  }
  async function save(raw) {
    const record = validateRecord(raw, true);
    await verifyImages(record.images);
    await transaction("readwrite", (store, done) => {
      store.put(record);
      done(record.id);
    });
    global.dispatchEvent(
      new CustomEvent("studyos-notebook-change", { detail: { id: record.id } }),
    );
    return clone(record);
  }
  async function backup() {
    return {
      schema: 1,
      kind: "studyos-notebook",
      exportedAt: new Date().toISOString(),
      records: await list(),
    };
  }
  async function restore(data) {
    if (
      !data ||
      data.schema !== 1 ||
      !Array.isArray(data.records) ||
      data.records.length > 10000
    )
      throw new Error(Copy.text("notebook.this_is_not_a_supported_1e0086"));
    const records = data.records.map((record) => validateRecord(record, false));
    if (new Set(records.map((r) => r.id)).size !== records.length)
      throw new Error(Copy.text("notebook.the_backup_contains_duplicate_record_de4adf"));
    for (const record of records) await verifyImages(record.images);
    const outcome = await transaction("readwrite", (store, done) => {
      const counts = { imported: 0, preserved: 0, unchanged: 0 };
      const request = store.getAll();
      request.onsuccess = () => {
        const existing = new Map(
          request.result.map((record) => [record.id, record]),
        );
        records.forEach((record) => {
          const before = existing.get(record.id);
          if (before && JSON.stringify(before) === JSON.stringify(record)) {
            counts.unchanged++;
            return;
          }
          if (before) {
            const preserved = {
              ...before,
              id: uid(),
              title: before.title.slice(0, 480) + Copy.text("notebook.version_before_import_45bd4b"),
              status: "已归档",
            };
            store.put(preserved);
            counts.preserved++;
          }
          store.put(record);
          counts.imported++;
        });
        done(counts);
      };
    });
    global.dispatchEvent(
      new CustomEvent("studyos-notebook-change", { detail: { restore: true } }),
    );
    return outcome;
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on") && typeof value === "function")
        node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value != null) node.setAttribute(key, String(value));
    }
    for (const child of children || [])
      if (child != null)
        node.append(
          typeof child === "string" ? document.createTextNode(child) : child,
        );
    return node;
  }
  function btn(label, action, primary) {
    return el("button", {
      type: "button",
      class: "btn nb-btn" + (primary ? " primary nb-primary" : ""),
      text: label,
      onclick: action,
    });
  }
  function hint(content) {
    return el("p", { class: "nb-hint", text: content });
  }
  function field(label, control, help) {
    return el("label", { class: "nb-field" }, [
      el("span", { text: label }),
      control,
      help ? hint(help) : null,
    ]);
  }
  function input(value, attrs) {
    const node = el("input", { type: "text", ...attrs });
    node.value = value || "";
    return node;
  }
  function area(value, rows) {
    const node = el("textarea", { rows: rows || 4 });
    node.value = value || "";
    return node;
  }
  function select(options, value, attrs) {
    const node = el(
      "select",
      attrs,
      options.map((option) =>
        el("option", {
          value: typeof option === "string" ? option : option[0],
          text: typeof option === "string" ? option : option[1],
        }),
      ),
    );
    node.value = value || "";
    return node;
  }
  function dateLabel(value) {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = el("a", { href: url, download: filename });
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function readImage(file, group) {
    return new Promise((resolve, reject) => {
      if (
        !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
          file.type,
        )
      ) {
        reject(new Error(Copy.text("notebook.use_a_png_jpeg_webp_34181a")));
        return;
      }
      if (!file.size || file.size > MAX_IMAGE_BYTES) {
        reject(new Error(Copy.text("notebook.each_image_must_be_smaller_2c9bdf")));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(Copy.text("notebook.could_not_read_the_image_cd0dda")));
      reader.onload = async () => {
        try {
          const image = validateImage({
            id: uid(),
            name: file.name || Copy.text("notebook.pasted_image_86eb51"),
            group: group || "question",
            data: reader.result,
          });
          await verifyImages([image]);
          resolve(image);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function mount(container, options) {
    const opts = options || {};
    let preference = opts.preference || "";
    let records = [],
      selected = new Set(),
      editor = null,
      dirty = false,
      busy = false,
      disposed = false,
      pendingImages = 0;
    let search = "",
      filterSubject = "",
      filterStatus = "active",
      filterSource = "",
      filterDate = "";
    let showExisting = false;
    let filtersOpen = false;
    let pendingOpenId =
      typeof opts.openId === "string"
        ? opts.openId
        : typeof opts.initialId === "string"
          ? opts.initialId
          : "";
    const dialogs = new Set();
    const notify = (message) =>
      opts.toast ? opts.toast(message) : (messageNode.textContent = message);
    const root = el("section", {
      class: "nb-root",
      "aria-label": Copy.text("notebook.notebook_84fc7f"),
    });
    const messageNode = el("p", {
      class: "nb-message",
      role: "status",
      "aria-live": "polite",
    });
    container.replaceChildren(root);
    const unload = (event) => {
      if (dirty || busy || pendingImages) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    global.addEventListener("beforeunload", unload);

    function dialog(title, content, actions, wide) {
      const previousFocus = document.activeElement;
      const node = el("dialog", {
        class: "nb-dialog" + (wide ? " nb-dialog-wide" : ""),
      });
      const titleId = "nb-dialog-" + uid();
      node.setAttribute("aria-labelledby", titleId);
      const close = () => {
        node.close();
        node.remove();
        dialogs.delete(node);
        previousFocus?.focus?.();
      };
      node.append(
        el("div", { class: "nb-dialog-head" }, [
          el("h2", { id: titleId, text: title }),
          btn(Copy.text("common.close"), close),
        ]),
        content,
      );
      if (actions)
        node.append(el("div", { class: "nb-actions" }, actions(close)));
      node.addEventListener("cancel", (event) => {
        event.preventDefault();
        close();
      });
      document.body.append(node);
      dialogs.add(node);
      node.showModal();
      return close;
    }
    function changePreference(next) {
      if (dirty) {
        confirmDiscard(() => changePreference(next));
        return;
      }
      preference = next;
      editor = null;
      showExisting = false;
      opts.onPreference?.(next);
      render();
    }
    function confirmDiscard(action) {
      dialog(
        Copy.text("notebook.keep_editing_3fe672"),
        hint(Copy.text("notebook.your_unsaved_content_is_still_3b8ace")),
        (close) => [
          btn(Copy.text("notebook.keep_editing_563d69"), close),
          btn(Copy.text("notebook.discard_changes_9644d7"), () => {
            dirty = false;
            close();
            action();
          }),
        ],
      );
    }
    async function refresh() {
      try {
        records = await list();
        if (!disposed && !editor) {
          if (pendingOpenId) showExisting = true;
          render();
          if (pendingOpenId) {
            const requestedId = pendingOpenId;
            pendingOpenId = "";
            const record = records.find((item) => item.id === requestedId);
            if (record) showRecord(record);
            else
              notify(
                Copy.text("notebook.this_resource_was_not_found_c101fa"),
              );
          }
        }
      } catch (error) {
        if (!disposed)
          root.replaceChildren(
            el("h2", { text: Copy.text("notebook.could_not_open_notebook_74180b") }),
            hint(error.message),
            btn(Copy.text("notebook.try_again_454b12"), refresh),
          );
      }
    }
    function heading() {
      return el("header", { class: "nb-heading" }, [
        el("div", {}, [
          el("h2", { text: Copy.text("notebook.notebook_entries_40dfb2") }),
        ]),
        btn(Copy.text("notebook.add_entry_a1bbe6"), () => openEditor(null), true),
      ]);
    }
    function preferences() {
      const options = [
        [
          "external",
          Copy.text("notebook.i_record_elsewhere_4816e1"),
          Copy.text("notebook.keep_your_paper_notebook_or_a2ce4f"),
        ],
        ["here", Copy.text("notebook.try_this_notebook_9ed1c4"), Copy.text("notebook.paste_an_image_or_add_0d20a1")],
        ["none", Copy.text("notebook.not_now_721252"), Copy.text("notebook.skip_this_now_you_can_b4e78f")],
      ];
      const content = el("section", { class: "nb-preference" }, [
        el("h2", {
          text: preference ? Copy.text("notebook.notebook_preference_6663dc") : Copy.text("notebook.how_do_you_keep_track_a64a77"),
        }),
        el(
          "div",
          { class: "nb-choice-grid" },
          options.map(([value, label, description]) => {
            const choice = btn("", () => changePreference(value));
            choice.className =
              "nb-choice" + (preference === value ? " is-selected" : "");
            choice.setAttribute("aria-pressed", String(preference === value));
            choice.append(
              el("strong", { text: label }),
              el("span", { text: description }),
            );
            return choice;
          }),
        ),
      ]);
      if (!preference)
        content.append(btn(Copy.text("notebook.skip_for_now_6e78be"), () => changePreference("none")));
      return content;
    }
    function render() {
      if (disposed) return;
      root.replaceChildren();
      if (editor) {
        renderEditor();
        return;
      }
      root.append(heading());
      if (!preference || preference === "none") {
        root.append(preferences());
        if (records.length && !showExisting)
          root.append(
            hint(Copy.text("notebook.previously_saved_6d1a49") + records.length + Copy.text("notebook.entries_remain_in_this_browser_6a8e76")),
            btn(Copy.text("notebook.view_saved_entries_924f2b"), () => {
              showExisting = true;
              render();
            }),
          );
        if (!showExisting) {
          root.append(storageNote(), messageNode);
          return;
        }
      }
      if (preference === "external")
        root.append(
          el("section", { class: "nb-external" }, [
            el("h2", { text: Copy.text("notebook.external_resources_1ac103") }),
            hint(
              Copy.text("notebook.add_a_page_reference_or_09e962"),
            ),
            el("div", { class: "nb-actions" }, [
              btn(Copy.text("notebook.add_link_or_page_reference_e8ca4d"), () => openEditor({})),
              btn(Copy.text("notebook.plan_a_revisit_70f309"), () => planRecords([])),
            ]),
          ]),
        );
      const subject = select(
        [
          ["", Copy.text("notebook.all_subjects_b782f5")],
          ...[...new Set(records.map((r) => r.subject).filter(Boolean))],
        ],
        filterSubject,
        { "aria-label": Copy.text("notebook.filter_by_subject_b938f8") },
      );
      const status = select(
        [["active", Copy.text("notebook.not_archived_f7f303")], ["", Copy.text("notebook.all_statuses_39b80e")], ...STATUSES.map(value => [value, Copy.notebookLabel("notebookStatus", value)])],
        filterStatus,
        { "aria-label": Copy.text("notebook.filter_by_status_68ba3e") },
      );
      const source = select(
        [
          ["", Copy.text("notebook.all_sources_cb3ef3")],
          ...[...new Set(records.map((r) => r.source).filter(Boolean))].map(value => [value, Copy.notebookLabel("notebookSource", value)]),
        ],
        filterSource,
        { "aria-label": Copy.text("notebook.filter_by_source_ec2ebd") },
      );
      const searchInput = input(search, {
        type: "search",
        placeholder: Copy.text("notebook.search_titles_questions_or_tags_2a1b7c"),
        "aria-label": Copy.text("notebook.search_entries_7fe51e"),
      });
      const date = input(filterDate, {
        type: "date",
        "aria-label": Copy.text("notebook.filter_by_record_date_75c7a1"),
      });
      const filterSummary = el("summary", { text: Copy.text("notebook.filters_f6b4db") });
      const filters = el("details", { class: "nb-filters" }, [
        filterSummary,
        el("div", { class: "nb-filter-fields" }, [
          field(Copy.text("notebook.subject_ab77b5"), subject),
          field(Copy.text("notebook.status_ae3ebc"), status),
          field(Copy.text("notebook.source_962f56"), source),
          field(Copy.text("notebook.record_date_458d8b"), date),
        ]),
      ]);
      filters.open = filtersOpen;
      filters.addEventListener("toggle", () => { filtersOpen = filters.open; });
      const listArea = el("div", { class: "nb-list" });
      const counts = hint("");
      const selectedButton = btn(Copy.text("notebook.plan_selected_entries_69fc6c"), () =>
        planRecords(records.filter((r) => selected.has(r.id))),
      );
      function updateList() {
        const query = search.trim().toLocaleLowerCase();
        const filtered = records.filter(
          (r) =>
            (!filterSubject || r.subject === filterSubject) &&
            (!filterSource || r.source === filterSource) &&
            (!filterDate || localDate(r.createdAt) === filterDate) &&
            (!filterStatus ||
              (filterStatus === "active"
                ? r.status !== "已归档"
                : r.status === filterStatus)) &&
            (!query ||
              [r.title, r.question, r.subject, r.source, ...r.tags]
                .join(" ")
                .toLocaleLowerCase()
                .includes(query)),
        );
        counts.textContent = Copy.text("notebook.showing_d08166") + filtered.length + " / " + records.length + Copy.text("notebook.entries_e38dea") +
          (filterStatus === "active" ? Copy.text("notebook.not_archived_9c77b0") : "");
        counts.title = Copy.text("notebook.counts_describe_only_the_resources_0e5153");
        const filterCount = [filterSubject, filterSource, filterDate,
          filterStatus && filterStatus !== "active" ? filterStatus : ""].filter(Boolean).length;
        filterSummary.textContent = Copy.text("notebook.filters_f6b4db") + (filterCount ? " · " + filterCount : "");
        selectedButton.disabled = selected.size === 0;
        selectedButton.hidden = selected.size === 0;
        listArea.replaceChildren(
          ...filtered.map((record) => recordRow(record, updateList)),
        );
        if (!filtered.length)
          listArea.append(
            el("div", { class: "nb-empty" }, [
              el("h2", {
                text: records.length
                  ? Copy.text("notebook.no_matching_entries_b632bf")
                  : Copy.text("notebook.no_entries_yet_f68c07"),
              }),
              hint(
                records.length
                  ? Copy.text("notebook.adjust_your_filters_or_choose_bd8f2e")
                  : Copy.text("notebook.save_the_question_now_add_ad5c55"),
              ),
              records.length
                ? btn(Copy.text("notebook.clear_filters_ab4b29"), () => {
                    search = "";
                    filterSubject = "";
                    filterSource = "";
                    filterDate = "";
                    filterStatus = "";
                    render();
                  })
                : btn(Copy.text("notebook.add_your_first_entry_7f7325"), () => openEditor(null)),
            ]),
          );
      }
      searchInput.addEventListener("input", () => {
        search = searchInput.value;
        updateList();
      });
      subject.addEventListener("change", () => {
        filterSubject = subject.value;
        updateList();
      });
      status.addEventListener("change", () => {
        filterStatus = status.value;
        updateList();
      });
      source.addEventListener("change", () => {
        filterSource = source.value;
        updateList();
      });
      date.addEventListener("change", () => {
        filterDate = date.value;
        updateList();
      });
      if (records.length) {
        root.append(
          el("div", { class: "nb-toolbar" }, [searchInput, filters]),
          el("div", { class: "nb-between" }, [counts, selectedButton]),
        );
      }
      root.append(
        listArea,
        el("div", { class: "nb-actions nb-backup-actions" }, [
          btn(Copy.text("notebook.export_notebook_backup_e5c511"), exportBackup),
          btn(Copy.text("notebook.restore_notebook_backup_1b1b51"), importBackup),
          btn(Copy.text("notebook.change_preference_353e09"), () => dialog(Copy.text("notebook.notebook_preference_6663dc"), preferences())),
        ]),
        storageNote(),
        messageNode,
      );
      updateList();
    }
    function localDate(value) {
      const date = new Date(value);
      return (
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0")
      );
    }
    function storageNote() {
      return hint(
        Copy.text("notebook.text_and_original_images_are_2f5f50"),
      );
    }
    function recordRow(record, updateList) {
      const checkbox = el("input", {
        type: "checkbox",
        "aria-label": Copy.text("notebook.select_d8775d") + record.title,
      });
      checkbox.checked = selected.has(record.id);
      checkbox.addEventListener("change", () => {
        checkbox.checked ? selected.add(record.id) : selected.delete(record.id);
        updateList();
      });
      const title = btn(record.title, () => showRecord(record));
      title.className = "nb-record-title";
      const thumbImage = record.images.find(
        (image) => image.group === "question",
      );
      const thumb = thumbImage
        ? el("img", {
            class: "nb-thumb",
            src: thumbImage.data,
            alt: "",
            loading: "lazy",
          })
        : el("div", {
            class: "nb-thumb nb-thumb-text",
            text: record.link ? "↗" : Copy.text("notebook.text_659358"),
          });
      return el("article", { class: "nb-record" }, [
        el("label", { class: "nb-record-select" }, [checkbox]),
        thumb,
        el("div", { class: "nb-record-body" }, [
          title,
          el("p", {
            class: "nb-meta",
            text: [
              record.subject || Copy.text("notebook.uncategorized_a45e46"),
              Copy.notebookLabel("notebookStatus", record.status),
              Copy.notebookLabel("notebookSource", record.source),
              dateLabel(record.createdAt),
            ]
              .filter(Boolean)
              .join(" · "),
          }),
          record.tags.length
            ? el("p", {
                class: "nb-meta",
                text: record.tags.map((tag) => "#" + tag).join("  "),
              })
            : null,
        ]),
        el("div", { class: "nb-actions" }, [
          btn(Copy.text("notebook.revisit_692eac"), () => planRecords([record])),
          btn(Copy.text("notebook.edit_c88ae9"), () => openEditor(record)),
        ]),
      ]);
    }
    function openEditor(record) {
      if (dirty) {
        confirmDiscard(() => openEditor(record));
        return;
      }
      editor = record ? clone(record) : {};
      editor.images = editor.images || [];
      dirty = false;
      render();
      root.querySelector("textarea, input")?.focus();
    }
    function renderEditor() {
      const editing = !!editor.id;
      const form = el("form", { class: "nb-editor", novalidate: "" });
      const titleInput = input(editor.title, {
        maxlength: 500,
        placeholder: Copy.text("notebook.optional_uses_a_question_summary_b495fa"),
      });
      const question = area(editor.question, 5);
      question.placeholder = Copy.text("notebook.paste_a_question_add_a_decf4a");
      const subject = input(editor.subject, {
        maxlength: 160,
        placeholder: Copy.text("notebook.e_g_mathematics_biology_history_bee42d"),
      });
      const tags = input((editor.tags || []).join(", "), {
        placeholder: Copy.text("notebook.separate_tags_with_commas_any_07443c"),
      });
      const source = input(editor.source, {
        list: "nb-sources",
        maxlength: 160,
        placeholder: Copy.text("notebook.optional_custom_values_are_welcome_e110ff"),
      });
      const sourceSuggestions = el(
        "datalist",
        { id: "nb-sources" },
        SOURCES.map((value) => el("option", { value: Copy.notebookLabel("notebookSource", value) })),
      );
      const status = select(STATUSES.map(value => [value, Copy.notebookLabel("notebookStatus", value)]), editor.status || "待整理");
      const link = input(editor.link, {
        type: "url",
        placeholder: Copy.text("notebook.https_optional_f6f867"),
      });
      const ownAnswer = area(editor.ownAnswer),
        referenceAnswer = area(editor.referenceAnswer),
        feedback = area(editor.feedback, 3);
      const reason = input(editor.reason, {
        list: "nb-reasons",
        maxlength: 2000,
        placeholder: Copy.text("notebook.leave_undecided_or_add_your_84932b"),
      });
      const reasonSuggestions = el(
        "datalist",
        { id: "nb-reasons" },
        REASONS.map((value) => el("option", { value: Copy.notebookLabel("notebookReason", value) })),
      );
      const group = select(
        IMAGE_GROUPS.map((value) => [value, IMAGE_LABELS[value] + " " + Copy.text("notebook.image_044c6c")]),
        "question",
        { "aria-label": Copy.text("notebook.image_category_eedcad") },
      );
      const file = input("", {
        type: "file",
        accept: "image/png,image/jpeg,image/webp,image/gif",
        multiple: "",
        "aria-label": Copy.text("notebook.upload_image_6f7e27"),
      });
      const tray = el("div", { class: "nb-image-tray" });
      const error = el("p", { class: "nb-error", role: "alert" });
      const saveButton = btn(
        editing ? Copy.text("notebook.save_changes_1e93a0") : Copy.text("notebook.save_entry_8296e7"),
        performSave,
        true,
      );
      function showImages() {
        tray.replaceChildren(
          ...editor.images.map((image) =>
            el("figure", {}, [
              el(
                "button",
                {
                  type: "button",
                  class: "nb-image-button",
                  "aria-label": Copy.text("notebook.enlarge_fdec86") + image.name,
                  onclick: () => enlarge(image),
                },
                [el("img", { src: image.data, alt: image.name })],
              ),
              el("figcaption", {
                text: IMAGE_LABELS[image.group] + " · " + image.name,
              }),
              btn(Copy.text("notebook.remove_image_dbe924"), () => {
                editor.images = editor.images.filter(
                  (item) => item.id !== image.id,
                );
                dirty = true;
                showImages();
              }),
            ]),
          ),
        );
      }
      async function addImages(files) {
        error.textContent = "";
        if (editor.images.length + files.length > MAX_RECORD_IMAGES) {
          error.textContent = Copy.text("notebook.use_no_more_than_images_f0a562");
          return;
        }
        const targetEditor = editor;
        pendingImages++;
        saveButton.disabled = true;
        try {
          const images = await Promise.all(
            files.map((item) => readImage(item, group.value)),
          );
          if (targetEditor !== editor || disposed) return;
          if (editor.images.length + images.length > MAX_RECORD_IMAGES)
            throw new Error(Copy.text("notebook.use_no_more_than_images_f0a562"));
          editor.images.push(...images);
          dirty = true;
          showImages();
        } catch (issue) {
          error.textContent = issue.message;
        } finally {
          pendingImages--;
          saveButton.disabled = busy || pendingImages > 0;
          file.value = "";
        }
      }
      file.addEventListener("change", () => addImages([...file.files]));
      form.addEventListener("paste", (event) => {
        const files = [...(event.clipboardData?.items || [])]
          .filter(
            (item) => item.kind === "file" && item.type.startsWith("image/"),
          )
          .map((item) => item.getAsFile())
          .filter(Boolean);
        if (files.length) {
          event.preventDefault();
          addImages(files);
        }
      });
      form.addEventListener("input", () => {
        dirty = true;
      });
      form.addEventListener("change", () => {
        dirty = true;
      });
      form.addEventListener("submit", (event) => event.preventDefault());
      form.addEventListener("keydown", (event) => {
        if (
          event.key === "Enter" &&
          event.target.tagName === "INPUT" &&
          !event.isComposing
        )
          event.preventDefault();
      });
      async function performSave() {
        if (busy || pendingImages) return;
        busy = true;
        saveButton.disabled = true;
        error.textContent = "";
        try {
          const result = await save({
            ...editor,
            title: titleInput.value,
            question: question.value,
            subject: subject.value,
            tags: tags.value,
            source: source.value,
            status: status.value,
            link: link.value,
            ownAnswer: ownAnswer.value,
            referenceAnswer: referenceAnswer.value,
            feedback: feedback.value,
            reason: reason.value,
          });
          dirty = false;
          editor = null;
          records = await list();
          render();
          notify(Copy.text("notebook.saved_in_this_browser_c83789"));
          opts.onSaved?.(result);
        } catch (issue) {
          error.textContent =
            issue.message || Copy.text("notebook.could_not_save_your_content_b42dbd");
        } finally {
          busy = false;
          saveButton.disabled = false;
        }
      }
      const detail = el("details", { class: "nb-details" }, [
        el("summary", { text: Copy.text("notebook.categories_answers_and_feedback_optional_5fad43") }),
        el("div", { class: "nb-field-grid" }, [
          field(Copy.text("notebook.subject_ab77b5"), subject),
          field(Copy.text("notebook.tags_37c462"), tags),
          field(Copy.text("notebook.source_962f56"), source),
          field(Copy.text("notebook.status_ae3ebc"), status),
        ]),
        sourceSuggestions,
        field(Copy.text("notebook.resource_link_59921e"), link),
        field(Copy.text("notebook.my_answer_f6e148"), ownAnswer),
        field(Copy.text("notebook.reference_answer_7b55c5"), referenceAnswer),
        field(Copy.text("notebook.teacher_feedback_8a383c"), feedback),
        field(Copy.text("notebook.error_reason_d6026d"), reason),
        reasonSuggestions,
      ]);
      if (editing) detail.open = true;
      form.append(
        field(Copy.text("notebook.title_optional_c45a4f"), titleInput),
        field(Copy.text("notebook.question_material_or_page_reference_60273c"), question),
        el("div", { class: "nb-upload" }, [
          el("strong", { text: Copy.text("notebook.add_a_photo_or_screenshot_9adb88") }),
          hint(
            Copy.text("notebook.paste_an_image_in_the_eef3b4"),
          ),
          el("div", { class: "nb-actions" }, [group, file]),
          tray,
        ]),
        detail,
        hint(
          Copy.text("notebook.practiced_is_a_record_status_4df728"),
        ),
        error,
        el("div", { class: "nb-editor-footer" }, [
          btn(Copy.text("common.back"), () => {
            if (busy || pendingImages) return;
            if (dirty)
              confirmDiscard(() => {
                editor = null;
                render();
              });
            else {
              editor = null;
              render();
            }
          }),
          saveButton,
        ]),
      );
      root.append(
        el("header", { class: "nb-heading" }, [
          el("div", {}, [
            el("h2", {
              text: editing ? Copy.text("notebook.edit_entry_de1b2c") : Copy.text("notebook.add_entry_a1bbe6"),
            }),
            hint(Copy.text("notebook.a_question_image_title_or_7daf22")),
          ]),
        ]),
        form,
        storageNote(),
        messageNode,
      );
      showImages();
    }

    function enlarge(image) {
      dialog(
        IMAGE_LABELS[image.group] + " " + Copy.text("notebook.image_044c6c"),
        el("div", { class: "nb-zoom" }, [
          el("img", { src: image.data, alt: image.name }),
          hint(
            Copy.text("notebook.this_is_the_saved_original_a6aff7"),
          ),
        ]),
        null,
        true,
      );
    }
    function recordContent(record, showAnswers, printable) {
      const content = el("div", { class: "nb-record-detail" });
      content.append(
        hint(
          [
            record.subject || Copy.text("notebook.uncategorized_a45e46"),
            Copy.notebookLabel("notebookSource", record.source),
            Copy.notebookLabel("notebookStatus", record.status),
            dateLabel(record.createdAt),
          ]
            .filter(Boolean)
            .join(" · "),
        ),
      );
      if (record.tags.length)
        content.append(hint(record.tags.map((tag) => "#" + tag).join("  ")));
      if (record.question)
        content.append(
          el("h3", { text: Copy.text("notebook.question_material_8d5539") }),
          el("p", { class: "nb-prose", text: record.question }),
        );
      if (record.link)
        content.append(
          el("a", {
            class: "nb-reference-link",
            href: record.link,
            target: "_blank",
            rel: "noopener noreferrer",
            text: record.link,
          }),
        );
      const groups = showAnswers ? IMAGE_GROUPS : ["question"];
      for (const key of groups) {
        if (key !== "question" && record[key])
          content.append(
            el("h3", { text: IMAGE_LABELS[key] }),
            el("p", { class: "nb-prose", text: record[key] }),
          );
        const images = record.images.filter((image) => image.group === key);
        if (images.length)
          content.append(
            el(
              "div",
              { class: "nb-detail-images" },
              images.map((image) =>
                printable
                  ? el("img", {
                      src: image.data,
                      alt: IMAGE_LABELS[key] + " · " + image.name,
                    })
                  : el(
                      "button",
                      {
                        type: "button",
                        class: "nb-image-button",
                        "aria-label": Copy.text("notebook.enlarge_fdec86") + IMAGE_LABELS[key] + " " + Copy.text("notebook.image_044c6c"),
                        onclick: () => enlarge(image),
                      },
                      [
                        el("img", {
                          src: image.data,
                          alt: IMAGE_LABELS[key] + " · " + image.name,
                        }),
                      ],
                    ),
              ),
            ),
          );
      }
      if (record.reason)
        content.append(
          el("h3", { text: Copy.text("notebook.recorded_reason_46c921") }),
          el("p", { class: "nb-prose", text: Copy.notebookLabel("notebookReason", record.reason) }),
        );
      return content;
    }
    function showRecord(record) {
      let answers = false;
      const content = el("div");
      const body = el("div");
      const hide = btn(Copy.text("notebook.show_separate_answers_and_feedback_7ba77f"), () => {
        answers = !answers;
        update();
      });
      function update() {
        hide.textContent = answers
          ? Copy.text("notebook.hide_separate_answers_and_feedback_6b8283")
          : Copy.text("notebook.show_separate_answers_and_feedback_7ba77f");
        hide.setAttribute("aria-pressed", String(answers));
        body.replaceChildren(recordContent(record, answers));
      }
      content.append(
        el("div", { class: "nb-actions" }, [
          hide,
          btn(Copy.text("notebook.print_without_separate_answers_b11282"), () => printRecord(record, false)),
          btn(Copy.text("notebook.print_with_answers_13bdba"), () => printRecord(record, true)),
        ]),
        hint(Copy.text("notebook.answers_already_written_in_photos_7fd4ba")),
        body,
      );
      update();
      dialog(
        record.title,
        content,
        (close) => [
          btn(Copy.text("notebook.edit_c88ae9"), () => {
            close();
            openEditor(record);
          }),
          btn(
            record.status === "已归档" ? Copy.text("notebook.restore_to_revisit_a67dc5") : Copy.text("notebook.archive_a6029d"),
            async () => {
              try {
                await save({
                  ...record,
                  status: record.status === "已归档" ? "待再看" : "已归档",
                });
                close();
                await refresh();
                notify(
                  record.status === "已归档"
                    ? Copy.text("notebook.restored_to_to_revisit_100ba6")
                    : Copy.text("notebook.archived_find_it_under_all_0c5a0b"),
                );
              } catch (issue) {
                notify(issue.message);
              }
            },
          ),
          btn(
            Copy.text("notebook.plan_a_revisit_70f309"),
            () => {
              close();
              planRecords([record]);
            },
            true,
          ),
        ],
        true,
      );
    }
    function planRecords(items) {
      if (!opts.onPlan) {
        notify(Copy.text("notebook.the_planner_is_not_connected_1a6fa7"));
        return;
      }
      const minutes = input("20", {
        type: "number",
        min: 1,
        max: 1440,
        step: 1,
      });
      const title = input(
        items.length === 1
          ? Copy.text("notebook.revisit_e49650") + items[0].title
          : items.length
            ? Copy.text("notebook.revisit_99d198") + items.length + Copy.text("notebook.resources_9c8c73")
            : Copy.text("notebook.revisit_my_notebook_394e22"),
        { maxlength: 500 },
      );
      const note = area(
        items
          .map((item) =>
            [item.title, item.link || "", item.question.slice(0, 300)]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n\n"),
        4,
      );
      const issue = el("p", { class: "nb-error", role: "alert" });
      const content = el("div", {}, [
        field(Copy.text("notebook.task_title_7400fe"), title),
        field(
          Copy.text("notebook.estimated_time_minutes_bc37fb"),
          minutes,
          Copy.text("notebook.this_is_the_total_time_0f862d"),
        ),
        field(Copy.text("notebook.resource_notes_page_references_898924"), note),
        hint(Copy.text("notebook.next_choose_a_date_in_1eca06")),
        issue,
      ]);
      dialog(Copy.text("notebook.plan_a_revisit_70f309"), content, (close) => [
        btn(Copy.text("common.cancel"), close),
        btn(
          Copy.text("notebook.continue_to_task_settings_147cd6"),
          async (event) => {
            const total = Number(minutes.value);
            if (
              !title.value.trim() ||
              !Number.isInteger(total) ||
              total < 1 ||
              total > 1440
            ) {
              issue.textContent = Copy.text("notebook.enter_a_task_title_and_7bbfa2");
              return;
            }
            const submitButton = event.currentTarget;
            submitButton.disabled = true;
            try {
              await opts.onPlan({
                title: title.value.trim(),
                note: note.value,
                subject: items.length === 1 ? items[0].subject : "",
                minutes: total,
                materialId: items[0]?.id || "",
                materialIds: items.map((item) => item.id),
              });
              close();
            } catch (error) {
              issue.textContent =
                error.message || Copy.text("notebook.could_not_open_task_settings_ca73a1");
              submitButton.disabled = false;
            }
          },
          true,
        ),
      ]);
    }
    function printRecord(record, answers) {
      const printRoot = el("section", { class: "nb-print-only" }, [
        el("h1", { text: record.title }),
        hint(
          answers
            ? Copy.text("notebook.includes_separate_answers_and_feedback_05594b")
            : Copy.text("notebook.excludes_separate_answers_and_feedback_58b15e"),
        ),
        recordContent(record, answers, true),
      ]);
      document.body.append(printRoot);
      document.body.classList.add("nb-printing");
      const clean = () => {
        printRoot.remove();
        document.body.classList.remove("nb-printing");
        global.removeEventListener("afterprint", clean);
      };
      global.addEventListener("afterprint", clean, { once: true });
      const images = [...printRoot.querySelectorAll("img")];
      Promise.all(
        images.map((image) =>
          image.decode ? image.decode().catch(() => {}) : Promise.resolve(),
        ),
      ).then(() => {
        global.print();
        // afterprint is emitted when printing/preview closes in supported browsers.
        setTimeout(clean, 60000);
      });
    }
    async function exportBackup() {
      try {
        downloadJSON(
          await backup(),
          "StudyOS-notebook-" + localDate(new Date()) + ".json",
        );
        notify(Copy.text("notebook.backup_created_including_original_images_719115"));
      } catch (issue) {
        notify(Copy.text("notebook.export_failed_fdea0b") + issue.message);
      }
    }
    function importBackup() {
      const file = input("", {
        type: "file",
        accept: "application/json,.json",
      });
      file.addEventListener("change", async () => {
        const selectedFile = file.files[0];
        if (!selectedFile) return;
        if (selectedFile.size > MAX_BACKUP_BYTES) {
          notify(Copy.text("notebook.this_backup_exceeds_the_mb_392911"));
          return;
        }
        let data;
        try {
          data = JSON.parse(await selectedFile.text());
          if (!data || data.schema !== 1 || !Array.isArray(data.records))
            throw new Error(Copy.text("notebook.choose_a_json_file_created_0390bf"));
          data.records.forEach((record) => validateRecord(record, false));
        } catch (issue) {
          notify(Copy.text("notebook.no_entries_were_imported_a46709") + issue.message);
          return;
        }
        const issue = el("p", { class: "nb-error", role: "alert" });
        dialog(
          Copy.text("notebook.restore_7b8fc5") + data.records.length + Copy.text("notebook.entries_638566"),
          el("div", {}, [
            hint(
              Copy.text("notebook.existing_entries_are_kept_if_24af31"),
            ),
            issue,
          ]),
          (close) => [
            btn(Copy.text("common.cancel"), close),
            btn(
              Copy.text("notebook.restore_backup_7ff43e"),
              async (event) => {
                const submitButton = event.currentTarget;
                submitButton.disabled = true;
                try {
                  const result = await restore(data);
                  close();
                  await refresh();
                  notify(
                    Copy.text("notebook.restored_d74890") +
                      result.imported +
                      Copy.text("notebook.entries_preserved_e4e373") +
                      result.preserved +
                      Copy.text("notebook.versions_from_before_import_deed2d"),
                  );
                } catch (error) {
                  issue.textContent = Copy.text("notebook.restore_failed_d86656") + error.message;
                  submitButton.disabled = false;
                }
              },
              true,
            ),
          ],
        );
      });
      file.click();
    }
    const changed = () => {
      if (!editor) refresh();
    };
    global.addEventListener("studyos-notebook-change", changed);
    root.append(hint(Copy.text("notebook.loading_local_resources_161bac")));
    refresh();
    const cleanup = () => {
      disposed = true;
      global.removeEventListener("beforeunload", unload);
      global.removeEventListener("studyos-notebook-change", changed);
      dialogs.forEach((node) => node.remove());
      dialogs.clear();
    };
    cleanup.hasUnsaved = () => dirty || busy || pendingImages > 0;
    cleanup.canLeave = () => !cleanup.hasUnsaved();
    return cleanup;
  }

  global.StudyNotebook = Object.freeze({
    ready,
    list,
    get,
    save,
    backup,
    restore,
    mount,
    validateRecord,
    safeLink,
    DB_NAME,
    STATUSES: [...STATUSES.map(value => [value, Copy.notebookLabel("notebookStatus", value)])],
  });
})(window);

