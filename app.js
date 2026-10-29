/* ==========================================================================
   LOGIK INTERAKTIF PLATFORM PEMBELAJARAN TIKTOK: KAEDAH PEMASARAN BISNES
   ========================================================================== */

(function () {
  const DATA = window.EBOOK_DATA;

  // State Management
  const state = {
    activeView: "nota",
    activeChapterId: "bab1",
    activeWorkflowId: "wf1",
    activeDayFilter: "all",
    previewDayIndex: 0,
    variationSeed: 0,
    instructorMode: false,
    xp: parseInt(localStorage.getItem("tt_edu_xp") || "120", 10),
    completedChapters: JSON.parse(localStorage.getItem("tt_edu_chaps") || '["prakata"]'),
    completedSteps: JSON.parse(localStorage.getItem("tt_edu_steps") || '["wf1-0"]'),
    quizIndex: 0,
    quizScore: 0,
    quizAnswered: {},
    generatedDays: []
  };

  function saveState() {
    localStorage.setItem("tt_edu_xp", String(state.xp));
    localStorage.setItem("tt_edu_chaps", JSON.stringify(state.completedChapters));
    localStorage.setItem("tt_edu_steps", JSON.stringify(state.completedSteps));
    updateXpUI();
  }

  function addXp(amount, reason) {
    state.xp += amount;
    saveState();
    showToast(`+${amount} XP: ${reason}`);
  }

  function updateXpUI() {
    const xpValEl = document.getElementById("xpValue");
    const xpLevelEl = document.getElementById("xpLevel");
    if (xpValEl) xpValEl.textContent = `${state.xp} XP`;
    if (xpLevelEl) {
      const level = Math.max(1, Math.floor(state.xp / 150) + 1);
      xpLevelEl.textContent = `LV ${level}`;
    }
  }

  function showToast(msg) {
    const toast = document.getElementById("toastMsg");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  function copyText(text, label = "Teks berjaya disalin!") {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(label));
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast(label);
    }
  }

  /* ==========================================================================
     1. NAVIGATION & INSTRUCTOR MODE
     ========================================================================== */
  window.switchView = function (viewName) {
    state.activeView = viewName;
    document.querySelectorAll(".view-section").forEach((sec) => {
      sec.classList.toggle("active", sec.id === `view-${viewName}`);
    });
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.jumpToChapter = function (chapterId) {
    state.activeChapterId = chapterId;
    window.switchView("nota");
    renderChapterList();
    renderChapterReader();
  };

  window.toggleInstructorMode = function () {
    state.instructorMode = !state.instructorMode;
    document.body.classList.toggle("instructor-mode", state.instructorMode);
    const btn = document.getElementById("instructorToggleBtn");
    if (btn) {
      btn.classList.toggle("active", state.instructorMode);
      btn.innerHTML = state.instructorMode
        ? "🎓 Mod Pengajar: AKTIF"
        : "👨‍🏫 Mod Tenaga Pengajar";
    }
    showToast(
      state.instructorMode
        ? "Mod Tenaga Pengajar diaktifkan: Nota kuliah & tip aktiviti kelas dipaparkan."
        : "Mod Pelajar diaktifkan."
    );
  };

  /* ==========================================================================
     2. NOTA LENGKAP EBOOK (8 BAB + PRAKATA)
     ========================================================================== */
  function renderChapterList(filterText = "") {
    const listEl = document.getElementById("chapterNavList");
    if (!listEl) return;
    const q = filterText.trim().toLowerCase();

    const filtered = DATA.chapters.filter((ch) => {
      if (!q) return true;
      const inTitle = ch.title.toLowerCase().includes(q) || ch.summary.toLowerCase().includes(q);
      const inSub = ch.subtopics.some(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.points.some((p) => p.toLowerCase().includes(q))
      );
      return inTitle || inSub;
    });

    listEl.innerHTML = filtered
      .map((ch) => {
        const isActive = ch.id === state.activeChapterId;
        const isDone = state.completedChapters.includes(ch.id);
        return `
        <button class="chapter-nav-item ${isActive ? "active" : ""}" onclick="selectChapter('${ch.id}')">
          <div class="chap-orb">${ch.num}</div>
          <div class="chap-meta">
            <strong>${ch.shortTitle}</strong>
            <span>${ch.partLabel}</span>
          </div>
          ${isDone ? '<div class="chap-done-tick" title="Selesai">✓</div>' : ""}
        </button>
      `;
      })
      .join("");
  }

  window.selectChapter = function (id) {
    state.activeChapterId = id;
    const searchInput = document.getElementById("chapterSearchInput");
    renderChapterList(searchInput ? searchInput.value : "");
    renderChapterReader();
  };

  window.toggleChapterComplete = function (id) {
    const idx = state.completedChapters.indexOf(id);
    if (idx === -1) {
      state.completedChapters.push(id);
      addXp(50, "Menamatkan pembacaan bab!");
    } else {
      state.completedChapters.splice(idx, 1);
      saveState();
    }
    renderChapterList();
    renderChapterReader();
  };

  function renderChapterReader() {
    const container = document.getElementById("chapterReaderContainer");
    if (!container) return;
    const ch = DATA.chapters.find((c) => c.id === state.activeChapterId) || DATA.chapters[1];
    const isDone = state.completedChapters.includes(ch.id);

    const subtopicsHtml = ch.subtopics
      .map((sub) => {
        let tableHtml = "";
        if (sub.table) {
          const ths = sub.table.headers.map((h) => `<th>${h}</th>`).join("");
          const trs = sub.table.rows
            .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
            .join("");
          tableHtml = `
            <div class="ebook-table-wrap">
              <table class="ebook-table">
                <thead><tr>${ths}</tr></thead>
                <tbody>${trs}</tbody>
              </table>
            </div>
          `;
        }

        const pointsHtml = (sub.points || [])
          .map((pt) => `<li>${pt}</li>`)
          .join("");

        return `
          <div class="subtopic-card">
            <div class="subtopic-header">
              <div class="subtopic-orb">${sub.code}</div>
              <h3>${sub.title}</h3>
            </div>
            <p style="font-size:0.9rem;color:var(--text-secondary);">${sub.desc}</p>
            ${tableHtml}
            <ul class="subtopic-points">${pointsHtml}</ul>
          </div>
        `;
      })
      .join("");

    // Navigate prev/next chapter
    const curIndex = DATA.chapters.findIndex((c) => c.id === ch.id);
    const prevChap = curIndex > 0 ? DATA.chapters[curIndex - 1] : null;
    const nextChap = curIndex < DATA.chapters.length - 1 ? DATA.chapters[curIndex + 1] : null;

    container.innerHTML = `
      <div class="reader-top-header">
        <div>
          <span style="display:inline-block;font-size:0.74rem;font-weight:800;letter-spacing:0.14em;color:var(--blue-100);margin-bottom:0.3rem;">
            ${ch.partLabel} • EBOOK TIKTOK: TAPI TAK MENARI
          </span>
          <h2 style="font-size:clamp(1.35rem,2.2vw,1.85rem);font-weight:900;line-height:1.2;margin-bottom:0.45rem;">
            ${ch.title}
          </h2>
          <p style="font-size:0.9rem;color:rgba(255,255,255,0.88);max-width:720px;">
            ${ch.summary}
          </p>
        </div>
        <div class="reader-badge-num">
          <small>BAB</small>
          <span>${ch.num}</span>
        </div>
      </div>

      <div class="reader-body">
        <div class="instructor-note-box">
          <strong>👨‍🏫 Panduan Tenaga Pengajar (${ch.shortTitle}):</strong><br/>
          ${ch.instructorTip}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;margin-bottom:1.35rem;padding-bottom:1rem;border-bottom:1px solid var(--border-light);">
          <div style="font-size:0.84rem;color:var(--text-secondary);font-weight:700;">
            📌 Terdapat <strong>${ch.subtopics.length} topik utama</strong> dalam modul ini.
          </div>
          <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
            <button class="step-check-btn" style="padding:0.5rem 1rem;font-size:0.8rem;${isDone ? "background:var(--accent-emerald);border-color:var(--accent-emerald);color:#fff;" : ""}" onclick="toggleChapterComplete('${ch.id}')">
              ${isDone ? "✓ Bab Telah Selesai Dibaca (+50 XP)" : "Tandakan Bab Selesai (+50 XP)"}
            </button>
            <button class="btn-outline-blue" style="padding:0.45rem 0.95rem;font-size:0.78rem;" onclick="switchView('promosi')">
              ⚡ Jana Skrip 7 Hari
            </button>
          </div>
        </div>

        <div class="subtopics-grid">
          ${subtopicsHtml}
        </div>

        ${
          ch.caseStudy
            ? `
          <div class="case-study-box">
            <h4>💡 ${ch.caseStudy.title}</h4>
            <p>${ch.caseStudy.text}</p>
          </div>
        `
            : ""
        }

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.75rem;padding-top:1.25rem;border-top:1px solid var(--border-light);flex-wrap:wrap;gap:0.8rem;">
          ${
            prevChap
              ? `<button class="btn-outline-blue" onclick="selectChapter('${prevChap.id}')">← ${prevChap.shortTitle}</button>`
              : `<span></span>`
          }
          ${
            nextChap
              ? `<button class="btn-primary-blue" onclick="selectChapter('${nextChap.id}')">Seterusnya: ${nextChap.shortTitle} →</button>`
              : `<button class="btn-primary-blue" onclick="switchView('jalankerja')">Terus Ke Jalan Kerja Step-by-Step →</button>`
          }
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     3. JALAN KERJA STEP-BY-STEP INTERAKTIF (6 WORKFLOWS + LIVE WORKBENCH)
     ========================================================================== */
  function renderWorkflowTabs() {
    const bar = document.getElementById("workflowSelectorBar");
    if (!bar) return;

    bar.innerHTML = DATA.workflows
      .map((wf) => {
        const isActive = wf.id === state.activeWorkflowId;
        const doneCount = wf.steps.filter((_, idx) =>
          state.completedSteps.includes(`${wf.id}-${idx}`)
        ).length;
        return `
        <button class="wf-tab-card ${isActive ? "active" : ""}" onclick="selectWorkflow('${wf.id}')">
          <div class="wf-orb-num">${wf.num}</div>
          <div class="wf-tab-Title">
            ${wf.title}
            <small>${doneCount}/${wf.steps.length} langkah selesai</small>
          </div>
        </button>
      `;
      })
      .join("");
  }

  window.selectWorkflow = function (wfId) {
    state.activeWorkflowId = wfId;
    renderWorkflowTabs();
    renderWorkflowStage();
  };

  window.toggleStepDone = function (wfId, stepIdx) {
    const key = `${wfId}-${stepIdx}`;
    const pos = state.completedSteps.indexOf(key);
    if (pos === -1) {
      state.completedSteps.push(key);
      addXp(25, "Menyelesaikan langkah praktikal!");
    } else {
      state.completedSteps.splice(pos, 1);
      saveState();
    }
    renderWorkflowTabs();
    renderWorkflowStage();
  };

  function renderWorkflowStage() {
    const timelineEl = document.getElementById("workflowTimelineContainer");
    if (!timelineEl) return;
    const wf = DATA.workflows.find((w) => w.id === state.activeWorkflowId) || DATA.workflows[0];

    const doneCount = wf.steps.filter((_, idx) =>
      state.completedSteps.includes(`${wf.id}-${idx}`)
    ).length;
    const pct = Math.round((doneCount / wf.steps.length) * 100);

    const stepsHtml = wf.steps
      .map((st, idx) => {
        const isDone = state.completedSteps.includes(`${wf.id}-${idx}`);
        const escapedSnippet = st.snippet.replace(/'/g, "\\'").replace(/\n/g, "\\n");
        return `
        <div class="step-node-item ${isDone ? "done" : ""}">
          <button class="step-circle-btn" onclick="toggleStepDone('${wf.id}', ${idx})" title="Klik untuk tandakan selesai">
            ${isDone ? "✓" : `0${idx + 1}`}
          </button>
          <div class="step-box">
            <div class="step-box-top">
              <h4>Langkah ${idx + 1}: ${st.title}</h4>
              <button class="step-check-btn" onclick="toggleStepDone('${wf.id}', ${idx})">
                ${isDone ? "✓ Selesai" : "Tandakan Selesai"}
              </button>
            </div>
            <p style="font-size:0.89rem;color:var(--text-secondary);">${st.detail}</p>
            <div class="step-code-snippet">
              <span style="white-space:pre-line;font-family:monospace;">${st.snippet}</span>
              <button class="copy-mini-btn" onclick="copyWorkflowSnippet('${escapedSnippet}')">Salin</button>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    timelineEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:2px solid var(--border-light);">
        <div>
          <span style="font-size:0.74rem;font-weight:800;color:var(--blue-700);text-transform:uppercase;letter-spacing:0.1em;">
            ${wf.ref}
          </span>
          <h3 style="font-size:1.3rem;font-weight:900;color:var(--blue-900);">${wf.title}</h3>
          <p style="font-size:0.86rem;color:var(--text-secondary);">${wf.desc}</p>
        </div>
        <div style="text-align:right;min-width:140px;">
          <div style="font-size:0.78rem;font-weight:800;color:var(--blue-800);margin-bottom:4px;">
            Kemajuan Modul: ${pct}%
          </div>
          <div style="width:150px;height:10px;background:var(--border-light);border-radius:99px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--blue-700),var(--accent-emerald));transition:width 0.3s;"></div>
          </div>
        </div>
      </div>
      ${stepsHtml}
    `;
  }

  window.copyWorkflowSnippet = function (text) {
    copyText(text, "Contoh/Template langkah berjaya disalin!");
  };

  // Interactive Bio & Formula EMAS Builder in Workbench
  window.updateBioSimulator = function () {
    const handle = (document.getElementById("simHandleInput")?.value || "@beriani.azrul").trim();
    const line1 = (document.getElementById("simBioLine1")?.value || "Jual beriani homemade dari rumah 👨‍🍳").trim();
    const line2 = (document.getElementById("simBioLine2")?.value || "Order terus via link 👇👇").trim();
    const link = (document.getElementById("simBioLink")?.value || "taplink.cc/berianiazrul").trim();

    const previewEl = document.getElementById("bioSimulatorPreview");
    if (!previewEl) return;
    previewEl.innerHTML = `
      <div style="text-align:center;">
        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--blue-700),var(--blue-900));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.25rem;margin:0 auto 0.5rem;border:3px solid #fff;box-shadow:var(--orb-shadow-sm);">
          ${handle.replace("@", "").charAt(0).toUpperCase() || "T"}
        </div>
        <strong style="font-size:0.95rem;color:var(--blue-950);display:block;">${handle.startsWith("@") ? handle : "@" + handle}</strong>
        <span style="display:inline-block;font-size:0.68rem;background:var(--blue-100);color:var(--blue-800);padding:2px 8px;border-radius:99px;font-weight:800;margin:4px 0 8px;">Akaun Perniagaan (Business)</span>
        <p style="font-size:0.82rem;color:var(--text-main);white-space:pre-line;margin-bottom:0.45rem;">${line1}\n${line2}</p>
        <div style="font-size:0.78rem;font-weight:800;color:var(--blue-700);">🔗 ${link}</div>
      </div>
    `;
  };

  /* ==========================================================================
     4. PENJANA AYAT TRENDING PROMOSI 7 HARI SEMINGGU (ISNIN - AHAD)
     ========================================================================== */
  const DAY_BLUEPRINTS = [
    {
      dayNum: "01",
      dayName: "Isnin",
      seriesTag: "#MotivasiBisnes & Demo Produk",
      focusTitle: "Pembuka Minggu: Demo Penyelesaian Masalah",
      bestTime: "11:00 pagi – 1:00 tengah hari",
      visualTip: "Close-up produk / POV guna produk dalam 3 saat pertama + teks besar di atas skrin",
      audioTip: "Lagu instrumental semangat / Lo-fi trending (Volume 12%)"
    },
    {
      dayNum: "02",
      dayName: "Selasa",
      seriesTag: "#EduMarket & Tips Harian",
      focusTitle: "Didik Sambil Menjual (Education + Marketing)",
      bestTime: "5:00 petang – 7:00 malam",
      visualTip: "Tunjuk 3 langkah mudah selesaikan masalah pelanggan menggunakan produk",
      audioTip: "Audio Upbeat Edu-TikTok Trending (Volume 10%)"
    },
    {
      dayNum: "03",
      dayName: "Rabu",
      seriesTag: "#TipsTikTok & Bukti Sosial",
      focusTitle: "Bukti & Testimoni Pelanggan Sebenar",
      bestTime: "11:00 pagi – 1:00 tengah hari",
      visualTip: "Paparkan tangkap layar maklum balas positif / perubahan 'Before & After'",
      audioTip: "Audio Storytelling / Acoustic Hangat (Volume 12%)"
    },
    {
      dayNum: "04",
      dayName: "Khamis",
      seriesTag: "#LiveSelling & Flash Sale",
      focusTitle: "Jualan Langsung & Jemputan Sesi Live",
      bestTime: "9:00 malam – 11:00 malam",
      visualTip: "Tunjuk stok tersedia di atas meja + demonstrasi bungkusan pantas",
      audioTip: "Audio Rancak Viral FYP Malaysia (Volume 15%)"
    },
    {
      dayNum: "05",
      dayName: "Jumaat",
      seriesTag: "#TestimoniJumaat & Inspirasi",
      focusTitle: "Kisah Jujur & Sentuhan Emosi (Storytelling)",
      bestTime: "11:30 pagi – 1:00 tengah hari",
      visualTip: "Rakam proses di sebalik tabir dengan pencahayaan semula jadi yang tenang",
      audioTip: "Audio Instrumental Syahdu / Inspirasi Jumaat (Volume 10%)"
    },
    {
      dayNum: "06",
      dayName: "Sabtu",
      seriesTag: "#BehindTheScene & Hujung Minggu",
      focusTitle: "Proses Packing Order & Promosi Hujung Minggu",
      bestTime: "5:00 petang – 7:00 malam",
      visualTip: "POV bungkus order pelanggan (ASMR / Timelapse) sambil bercerita santai",
      audioTip: "Lagu Santai Hujung Minggu Trending (Volume 14%)"
    },
    {
      dayNum: "07",
      dayName: "Ahad",
      seriesTag: "#LiveQnA & Soft Close Komuniti",
      focusTitle: "Menjawab Soalan Komen & Soft Close Tanpa Paksaan",
      bestTime: "9:00 malam – 11:30 malam",
      visualTip: "Balas komen pelanggan menggunakan ciri 'Reply with Video' + tunjuk manfaat utama",
      audioTip: "Suara Asli Jelas + Muzik Latar Lembut (Volume 10%)"
    }
  ];

  window.applyNichePreset = function () {
    const key = document.getElementById("promoNicheSelect")?.value || "makanan";
    const preset = DATA.nichePresets[key];
    if (!preset) return;

    const customGroup = document.getElementById("customNicheGroup");
    if (customGroup) {
      customGroup.style.display = key === "lainlain" ? "block" : "none";
    }

    document.getElementById("promoProductName").value = preset.productName;
    document.getElementById("promoProblem").value = preset.problem;
    document.getElementById("promoBenefit").value = `${preset.benefit} (${preset.proof})`;
    document.getElementById("promoOffer").value = preset.offer;
    const customHashInput = document.getElementById("promoCustomHashtags");
    if (customHashInput) {
      customHashInput.value = preset.hashtags.join(" ");
    }
    generateSevenDaysPromo(true);
  };

  window.regeneratePromoVariations = function () {
    state.variationSeed = (state.variationSeed + 1) % 3;
    generateSevenDaysPromo(true);
    addXp(15, "Menjana variasi ayat promosi trending 7 hari!");
  };

  window.generateSevenDaysPromo = function (announce = false) {
    const nicheKey = document.getElementById("promoNicheSelect")?.value || "makanan";
    const preset = DATA.nichePresets[nicheKey] || DATA.nichePresets.makanan;

    const customNicheName = (document.getElementById("promoCustomNiche")?.value || "").trim();
    const rawProduct = (document.getElementById("promoProductName")?.value || preset.productName).trim();
    const product = (nicheKey === "lainlain" && customNicheName && rawProduct === preset.productName)
      ? `${rawProduct} (${customNicheName})`
      : rawProduct;
    const problem = (document.getElementById("promoProblem")?.value || preset.problem).trim();
    const benefit = (document.getElementById("promoBenefit")?.value || preset.benefit).trim();
    const offer = (document.getElementById("promoOffer")?.value || preset.offer).trim();
    const tone = document.getElementById("promoToneSelect")?.value || "emas";

    let activeHashtags = preset.hashtags;
    if (nicheKey === "lainlain") {
      const customHashStr = (document.getElementById("promoCustomHashtags")?.value || "").trim();
      if (customHashStr) {
        activeHashtags = customHashStr
          .split(/\s+/)
          .filter(Boolean)
          .map((h) => (h.startsWith("#") ? h : `#${h}`));
      }
      if (customNicheName) {
        const slugTag = "#" + customNicheName.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (slugTag.length > 2 && !activeHashtags.includes(slugTag)) {
          activeHashtags = [slugTag, ...activeHashtags.slice(0, 4)];
        }
      }
    }

    const v = state.variationSeed;

    const dayConfigs = [
      // HARI 1: ISNIN
      {
        hooks: [
          `Ramai orang silap bila nak selesaikan masalah ${problem}...`,
          `Kalau korang selalu hadapi masalah ${problem}, wajib tengok video ni sampai habis!`,
          `Jangan bazir duit lagi kalau belum cuba cara mudah atasi ${problem} ni!`
        ],
        e: `Berhenti scroll kejap! Siapa kat sini yang selalu pening sebab ${problem}?`,
        m: `Saya faham sangat perasaan tu, bila dah cuba macam-macam tapi hasilnya tetap mengecewakan.`,
        a: `Sebab tulah kami hasilkan ${product} — ${benefit}. Tengok sendiri betapa mudahnya bila guna setiap hari!`,
        s: `Nak cuba dengan ${offer}? Klik beg kuning kat bawah atau komen 'NAK' sekarang!`,
        caption: `Mulakan hari Isnin dengan solusi paling mudah untuk ${problem}! 🔥 ${product} kini dibuka untuk tempahan: ${offer}. Jangan lupa klik beg kuning ya 👇`
      },
      // HARI 2: SELASA (EDU-MARKET)
      {
        hooks: [
          `3 Tip Penting: Cara elak ${problem} tanpa pening kepala!`,
          `Rupanya ramai tak tahu rahsia sebenar untuk atasi ${problem} dengan cepat...`,
          `Ilmu 20 saat: Kenapa masalah ${problem} selalu berulang & cara atasinya!`
        ],
        e: `Nak tahu kenapa masalah ${problem} korang selalu berulang walaupun dah jaga elok-elok?`,
        m: `Punca utamanya sebab ramai terlepas pandang langkah asas yang nampak kecil tapi beri kesan besar.`,
        a: `Rahsianya, amalkan langkah ni dan gabungkan dengan ${product} sebab ia ada ${benefit}.`,
        s: `Simpan (Save) video ni supaya tak hilang, dan klik link kat bio kalau nak dapatkan ${offer}!`,
        caption: `Ilmu percuma hari Selasa! 💡 Simpan video ni untuk rujukan korang. Kalau nak jalan paling pantas dengan ${product}, terus klik beg kuning untuk ${offer} ✨`
      },
      // HARI 3: RABU (BUKTI SOSIAL / TESTIMONI)
      {
        hooks: [
          `Saya tak sangka feedback pelanggan lepas 3 hari guna ${product} jadi macam ni!`,
          `"Menyesal tak tahu pasal ${product} ni dari dulu lagi!" — Lihat bukti sebenar 👀`,
          `Kenapa ratusan pelanggan repeat order ${product} setiap minggu? Ini jawapannya.`
        ],
        e: `Jujur cakap, masa mula-mula dulu ramai ragu-ragu betul ke ${product} boleh bantu ${problem}?`,
        m: `Mana taknya, dekat luar sana banyak janji manis tapi bila beli langsung tak menjadi.`,
        a: `Tapi alhamdulillah, dengan ${benefit}, pelanggan kami sendiri yang kongsi perubahan ketara mereka!`,
        s: `Korang bila lagi nak rasa sendiri? Klik beg kuning sekarang sementara ada ${offer}!`,
        caption: `Biar bukti pelanggan berbicara! 🌟 Terima kasih kepada semua yang dah cuba ${product}. Hari Rabu ni ada ${offer} — klik beg kuning sebelum stok susut!`
      },
      // HARI 4: KHAMIS (LIVE SELLING & URGENCY)
      {
        hooks: [
          `💥 HARI INI SAHAJA: ${offer} khas untuk 20 orang terawal!`,
          `Stok ${product} dah tinggal sikit! Siapa cepat dia dapat harga promo Khamis ni!`,
          `JANGAN BELI ${product} pada harga asal! Tonton 15 saat ni untuk baucar khas!`
        ],
        e: `Berita baik untuk korang yang dah lama perhati ${product} dalam beg kuning!`,
        m: `Saya tahu ramai tunggu masa gaji atau tunggu promo berbaloi untuk selesaikan ${problem}.`,
        a: `Khas hari Khamis ni, selain dapat ${benefit}, kami buka ${offer} secara eksklusif!`,
        s: `Klik button kuning kat bawah sekarang atau masuk Live kami malam ni pukul 9:00 malam untuk tebus free gift!`,
        caption: `⚡ FLASH SALE KHAMIS! ⚡ Khas untuk yang nak selesaikan ${problem} dengan ${product}. Tebus ${offer} terus di beg kuning atau jumpa dalam Live malam ni!`
      },
      // HARI 5: JUMAAT (STORYTELLING EMOSI)
      {
        hooks: [
          `Dulu saya takut sangat nak mula... tapi satu mesej pelanggan ni ubah segalanya.`,
          `Kisah sebenar di sebalik ${product} yang ramai pengikut baru belum tahu...`,
          `Tak perlu menari pun di TikTok, cukup dengan niat jujur nak bantu orang yang ${problem}.`
        ],
        e: `Dulu saya selalu fikir, ada ke orang nak sokong usaha kecil kami dengan ${product} ni?`,
        m: `Tetapi bila teringat ramai kat luar sana yang masih tercari-cari solusi untuk ${problem}, saya kuatkan semangat.`,
        a: `Kami pastikan setiap unit ${product} memberikan ${benefit} supaya setiap sen korang berbaloi.`,
        s: `Terima kasih sebab sentiasa menyokong! Jemput klik link di bio untuk nikmati ${offer} penuh berkat hari Jumaat ni 🤲`,
        caption: `Salam Jumaat penuh barakah 🤍 Setiap perjalanan bermula dengan langkah kecil. Semoga ${product} terus memberi manfaat untuk anda semua. (${offer})`
      },
      // HARI 6: SABTU (BEHIND THE SCENE / PACKING)
      {
        hooks: [
          `POV: Sibuk siapkan order ${product} korang hujung minggu ni! 📦✨`,
          `Jom tengok sendiri proses di sebalik tabir macam mana kami sediakan ${product}!`,
          `Kenapa ${product} kami sentiasa segar & berkualiti? Ini rahsia belakang tabir kami!`
        ],
        e: `Hari Sabtu pun team kami tak menang tangan bungkus pesanan ${product} untuk pos ke seluruh Malaysia!`,
        m: `Ramai pelanggan mengadu sebelum ni susah nak jumpa kualiti yang betul-betul jaga ${problem}.`,
        a: `Tengok sendiri kualiti kami — ${benefit}. Setiap bungkusan kami semak satu per satu!`,
        s: `Nak parcel korang ikut trip pos hari ni juga? Terus checkout di beg kuning untuk ${offer}!`,
        caption: `Behind the scene hari Sabtu! 📦 Seronok tengok ramai dah mula dapat manfaat ${product}. Yang nak selit order dengan ${offer}, klik beg kuning sekarang ya!`
      },
      // HARI 7: AHAD (Q&A + SOFT CLOSE)
      {
        hooks: [
          `Menjawab soalan paling kerap ditanya minggu ni tentang ${product}! 💬`,
          `"Kak, betul ke ${product} sesuai untuk saya yang ${problem}?" — Ini jawapan jujur saya.`,
          `Persediaan minggu baru: Jangan biarkan ${problem} ganggu mood kerja esok!`
        ],
        e: `Ramai DM dan komen tanya: "Betul ke ${product} ni senang guna dan berbaloi?"`,
        m: `Saya faham kalau korang masih berkira-kira sebab nak pastikan ia betul-betul bantu ${problem}.`,
        a: `Jawapannya: Ya! Sebab ${product} direka khas dengan ${benefit} supaya sesiapa pun boleh guna dengan mudah.`,
        s: `Kalau anda dah bersedia nak cuba, boleh klik link kat bio ya. Tak beli hari ni pun tak apa, simpan video ni & tengok dulu pun dah cukup 😊`,
        caption: `Sesi Q&A & Soft Close Ahad 😊 Ada lagi soalan pasal ${product}? Tulis je kat ruangan komen, saya balas satu-satu! (${offer} masih dibuka di bio 👇)`
      }
    ];

    state.generatedDays = DAY_BLUEPRINTS.map((bp, idx) => {
      const cfg = dayConfigs[idx];
      let selectedHook = cfg.hooks[v % cfg.hooks.length];
      let sText = cfg.s;

      if (tone === "soft") {
        sText = `Kalau anda nak cuba ${product}, boleh klik link di bio ya. Tak beli sekarang pun tak apa, simpan dulu video ni 😊`;
      } else if (tone === "urgent") {
        sText = `⚡ Stok promosi ${offer} sangat terhad untuk hari ${bp.dayName} sahaja! Klik beg kuning sekarang sebelum habis!`;
      } else if (tone === "edumarket") {
        sText = `Semoga tip hari ${bp.dayName} ni bermanfaat! Nak mudahkan lagi kerja korang dengan ${product}? Klik beg kuning di bawah 👇`;
      }

      return {
        ...bp,
        product,
        offer,
        hook: selectedHook,
        emas: {
          e: cfg.e,
          m: cfg.m,
          a: cfg.a,
          s: sText
        },
        caption: cfg.caption,
        hashtags: activeHashtags
      };
    });

    renderPromoDays();
    renderPhonePreview(state.previewDayIndex);
    if (announce) {
      showToast("Pelan Promosi Trending 7 Hari berjaya dijana!");
    }
  };

  window.filterPromoDay = function (filterVal) {
    state.activeDayFilter = filterVal;
    document.querySelectorAll(".day-pill-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.day === filterVal);
    });
    renderPromoDays();
  };

  function renderPromoDays() {
    const grid = document.getElementById("daysCardsGrid");
    if (!grid) return;

    const list =
      state.activeDayFilter === "all"
        ? state.generatedDays
        : state.generatedDays.filter((_, idx) => String(idx) === state.activeDayFilter);

    grid.innerHTML = list
      .map((item) => {
        const realIdx = state.generatedDays.findIndex((d) => d.dayNum === item.dayNum);
        const hashtagsHtml = item.hashtags
          .map((h) => `<span class="hashtag-chip">${h}</span>`)
          .join("");

        return `
        <div class="day-promo-card">
          <div class="day-card-top">
            <div class="day-orb-badge">
              <small>HARI ${item.dayNum}</small>
              <strong>${item.dayName}</strong>
            </div>
            <div class="day-card-title-group">
              <span class="day-series-tag">${item.seriesTag}</span>
              <h3>${item.focusTitle}</h3>
              <p>⏰ Waktu Post: ${item.bestTime}</p>
            </div>
          </div>

          <div class="day-card-body">
            <div class="hook-highlight-box">
              <span class="hook-label">🎯 HOOK 3 SAAT PERTAMA (TEKS ATAS SKRIN)</span>
              <div class="hook-text">"${item.hook}"</div>
            </div>

            <div class="emas-breakdown">
              <div class="emas-row">
                <div class="emas-letter" title="Engage">E</div>
                <div><strong>Engage:</strong> ${item.emas.e}</div>
              </div>
              <div class="emas-row">
                <div class="emas-letter" title="Masalah">M</div>
                <div><strong>Masalah:</strong> ${item.emas.m}</div>
              </div>
              <div class="emas-row">
                <div class="emas-letter" title="Ajar / Aksi">A</div>
                <div><strong>Ajar/Aksi:</strong> ${item.emas.a}</div>
              </div>
              <div class="emas-row">
                <div class="emas-letter" title="Seru (CTA)">S</div>
                <div><strong>Seru (CTA):</strong> ${item.emas.s}</div>
              </div>
            </div>

            <div class="caption-preview-box">
              <strong>📝 Kapsyen & Hashtag (Bab 6.3):</strong>
              <p style="margin-top:4px;">${item.caption}</p>
              <div class="hashtag-list">${hashtagsHtml}</div>
            </div>

            <div class="day-meta-footer">
              <span>🎥 <strong>Visual:</strong> ${item.visualTip}</span>
              <span>🎵 <strong>Audio:</strong> ${item.audioTip}</span>
            </div>

            <div class="day-card-actions">
              <button class="btn-card-action primary" onclick="copyDayScript(${realIdx})">
                📋 Salin Skrip ${item.dayName}
              </button>
              <button class="btn-card-action" onclick="previewDayOnPhone(${realIdx})">
                📱 Pratonton Skrin TikTok
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  window.copyDayScript = function (idx) {
    const d = state.generatedDays[idx];
    if (!d) return;
    const formatted = [
      `=== JADUAL PROMOSI TIKTOK HARI ${d.dayNum}: ${d.dayName.toUpperCase()} (${d.seriesTag}) ===`,
      `Fokus: ${d.focusTitle}`,
      `Waktu Terbaik Post: ${d.bestTime}`,
      ``,
      `[HOOK 3 SAAT PERTAMA / ON-SCREEN TEXT]:`,
      `"${d.hook}"`,
      ``,
      `[SKRIP PENUH FORMULA E.M.A.S]:`,
      `• E (Engage): ${d.emas.e}`,
      `• M (Masalah): ${d.emas.m}`,
      `• A (Ajar/Aksi): ${d.emas.a}`,
      `• S (Seru/CTA): ${d.emas.s}`,
      ``,
      `[KAPSYEN VIDEO]:`,
      `${d.caption}`,
      `${d.hashtags.join(" ")}`,
      ``,
      `[PANDUAN RAKAMAN]:`,
      `• Visual: ${d.visualTip}`,
      `• Audio: ${d.audioTip}`
    ].join("\n");

    copyText(formatted, `Skrip penuh hari ${d.dayName} berjaya disalin!`);
    addXp(10, `Menyalin skrip promosi hari ${d.dayName}`);
  };

  window.copyAllSevenDays = function () {
    const allText = state.generatedDays
      .map((d) => {
        return [
          `==================================================`,
          `HARI ${d.dayNum} (${d.dayName.toUpperCase()}) - ${d.seriesTag}`,
          `Waktu Post: ${d.bestTime}`,
          `Hook 3 Saat: "${d.hook}"`,
          `E (Engage): ${d.emas.e}`,
          `M (Masalah): ${d.emas.m}`,
          `A (Ajar/Aksi): ${d.emas.a}`,
          `S (Seru/CTA): ${d.emas.s}`,
          `Kapsyen: ${d.caption} ${d.hashtags.join(" ")}`
        ].join("\n");
      })
      .join("\n\n");

    copyText(allText, "Keseluruhan pelan promosi 7 hari (Isnin–Ahad) telah disalin!");
    addXp(30, "Menyalin pelan lengkap 7 hari seminggu!");
  };

  window.previewDayOnPhone = function (idx) {
    state.previewDayIndex = idx;
    renderPhonePreview(idx);
    const phoneEl = document.getElementById("tiktokPhoneMockup");
    if (phoneEl) {
      phoneEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    showToast(`Memaparkan pratonton TikTok untuk hari ${state.generatedDays[idx].dayName}`);
  };

  function renderPhonePreview(idx) {
    const phoneEl = document.getElementById("tiktokPhoneMockup");
    if (!phoneEl) return;
    const d = state.generatedDays[idx] || state.generatedDays[0];
    if (!d) return;

    phoneEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:#e4e4e7;border-bottom:1px solid rgba(255,255,255,0.22);padding-bottom:0.5rem;">
        <span>Following | <strong style="color:#ffffff;border-bottom:2px solid #ffffff;padding-bottom:2px;">For You (FYP)</strong></span>
        <span style="background:#ffffff;color:#000000;padding:2px 8px;border-radius:99px;font-weight:900;">${d.dayName}</span>
      </div>

      <div class="phone-onscreen-hook">
        ${d.hook}
      </div>

      <div style="margin:1rem 0;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:12px;padding:0.8rem;font-size:0.78rem;line-height:1.45;color:#ffffff;">
        <div style="font-weight:900;color:#fbbf24;margin-bottom:4px;">🎙️ Dialog Suara (15–30s):</div>
        "${d.emas.e} ${d.emas.a} ${d.emas.s}"
      </div>

      <div class="phone-bottom-overlay">
        <div class="yellow-bag-pill">
          🛒 Beg Kuning: ${d.product} (${d.offer})
        </div>
        <div style="font-weight:900;font-size:0.84rem;color:#ffffff;margin-bottom:2px;">@usahawantiktok.my ✓</div>
        <div style="font-size:0.75rem;color:#f4f4f5;line-height:1.35;margin-bottom:4px;">
          ${d.caption}
        </div>
        <div style="font-size:0.72rem;color:#fbbf24;font-weight:800;">
          ${d.hashtags.join(" ")}
        </div>
        <div style="font-size:0.7rem;color:#ffffff;margin-top:6px;display:flex;align-items:center;gap:6px;">
          <span>🎵 ${d.audioTip}</span>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     5. MAKMAL INTERAKTIF PELAJAR: SIMULATOR FYP, KALKULATOR & KUIZ
     ========================================================================== */
  window.runFypSimulation = function () {
    const duration = parseInt(document.getElementById("simDuration")?.value || "20", 10);
    const hasHook = document.getElementById("simHasHook")?.checked ?? true;
    const hasTrendingAudio = document.getElementById("simTrendingAudio")?.checked ?? true;
    const hashtagCount = parseInt(document.getElementById("simHashtagCount")?.value || "4", 10);
    const violation = document.getElementById("simViolation")?.value || "none";

    let watchTimeScore = duration >= 12 && duration <= 32 ? 92 : duration <= 45 ? 74 : 52;
    let engageScore = hasHook ? 88 : 48;
    if (hasTrendingAudio) engageScore = Math.min(98, engageScore + 8);

    let fypScore = Math.round((watchTimeScore + engageScore) / 2);
    if (hashtagCount >= 3 && hashtagCount <= 5) {
      fypScore = Math.min(99, fypScore + 6);
    } else if (hashtagCount > 10 || hashtagCount === 0) {
      fypScore = Math.max(20, fypScore - 15);
    }

    let statusBanner = "";
    if (violation !== "none") {
      fypScore = 12;
      watchTimeScore = 25;
      engageScore = 18;
      statusBanner = `
        <div style="background:#fef2f2;border-left:5px solid var(--accent-rose);padding:0.9rem 1.1rem;border-radius:8px;color:#991b1b;font-size:0.86rem;margin-top:1rem;">
          <strong>⚠️ AMARAN SHADOWBAN / SEKATAN FYP (Rujukan Bab 7.7):</strong><br/>
          Video anda dikesan melanggar pantang larang (<em>${violation}</em>). Algoritma TikTok akan menyekat video ini daripada naik ke FYP. Sila patuhi etika & garis panduan komuniti!
        </div>
      `;
    } else {
      statusBanner = `
        <div style="background:#ecfdf5;border-left:5px solid var(--accent-emerald);padding:0.9rem 1.1rem;border-radius:8px;color:#065f46;font-size:0.86rem;margin-top:1rem;">
          <strong>✅ AUDIT LULUS & BERPOTENSI TINGGI NAIK FYP (Skor: ${fypScore}%):</strong><br/>
          Video berdurasi ${duration} saat dengan Hook 3 Saat, Audio Trending dan ${hashtagCount} Hashtag spesifik mematuhi 4 pilar algoritma Bab 6.1!
        </div>
      `;
    }

    document.getElementById("pillarWatchTime").textContent = `${watchTimeScore}%`;
    document.getElementById("pillarEngagement").textContent = `${engageScore}%`;
    document.getElementById("pillarFypScore").textContent = `${fypScore}%`;
    document.getElementById("fypSimStatusOutput").innerHTML = statusBanner;
  };

  window.runIncomeCalculator = function () {
    const dailyViews = parseInt(document.getElementById("calcDailyViews")?.value || "5000", 10);
    const convRate = parseFloat(document.getElementById("calcConvRate")?.value || "1.5");
    const price = parseFloat(document.getElementById("calcProductPrice")?.value || "35");
    const commPct = parseFloat(document.getElementById("calcCommission")?.value || "20");
    const followers = parseInt(document.getElementById("calcFollowers")?.value || "12000", 10);

    const dailyBuyers = (dailyViews * (convRate / 100));
    const monthlyUnits = Math.round(dailyBuyers * 30);
    const grossSales = Math.round(monthlyUnits * price);
    const affiliateIncome = Math.round(grossSales * (commPct / 100));

    let sponsoredRange = "RM0 (Fokus capai 1,000 followers dahulu)";
    if (followers >= 1000 && followers < 10000) {
      sponsoredRange = "RM50 – RM300 / video tajaan (Nano Influencer)";
    } else if (followers >= 10000 && followers < 100000) {
      sponsoredRange = "RM300 – RM1,500 / video tajaan (Micro Influencer)";
    } else if (followers >= 100000) {
      sponsoredRange = "RM1,500+ / video tajaan (Macro Influencer)";
    }

    const resEl = document.getElementById("incomeCalcResult");
    if (!resEl) return;
    resEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;margin-top:1rem;">
        <div style="background:var(--blue-50);padding:0.9rem;border-radius:10px;border:1px solid var(--blue-100);">
          <small style="font-size:0.72rem;font-weight:800;color:var(--text-secondary);">ANGGARAN JUALAN PRODUK SENDIRI (SEBULAN)</small>
          <div style="font-size:1.35rem;font-weight:900;color:var(--blue-800);">RM ${grossSales.toLocaleString()}</div>
          <span style="font-size:0.75rem;color:var(--text-secondary);">~${monthlyUnits} unit terjual / bulan</span>
        </div>
        <div style="background:#ecfdf5;padding:0.9rem;border-radius:10px;border:1px solid #a7f3d0;">
          <small style="font-size:0.72rem;font-weight:800;color:#065f46;">KOMISEN TIKTOK AFFILIATE (${commPct}%)</small>
          <div style="font-size:1.35rem;font-weight:900;color:#047857;">RM ${affiliateIncome.toLocaleString()}</div>
          <span style="font-size:0.75rem;color:#065f46;">Tanpa simpan stok & pos barang</span>
        </div>
      </div>
      <div style="margin-top:0.75rem;background:var(--surface-off);padding:0.75rem 1rem;border-radius:8px;border:1px solid var(--border-light);font-size:0.82rem;">
        <strong>🌟 Kadar Sponsored Content (Bab 4.5):</strong> ${sponsoredRange}
      </div>
    `;
  };

  /* ==========================================================================
     6. KUIZ INTERAKTIF 15 SOALAN
     ========================================================================== */
  function renderQuiz() {
    const box = document.getElementById("quizInteractiveBox");
    if (!box) return;

    const total = DATA.quizQuestions.length;
    const qObj = DATA.quizQuestions[state.quizIndex];
    const answeredChoice = state.quizAnswered[state.quizIndex];

    const optionsHtml = qObj.options
      .map((opt, oIdx) => {
        let cls = "";
        if (answeredChoice !== undefined) {
          if (oIdx === qObj.answer) cls = "correct";
          else if (oIdx === answeredChoice) cls = "wrong";
        }
        return `
        <button class="quiz-option-btn ${cls}" ${answeredChoice !== undefined ? "disabled" : ""} onclick="submitQuizAnswer(${oIdx})">
          <span style="width:28px;height:28px;border-radius:50%;background:var(--blue-100);color:var(--blue-800);display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:0.78rem;flex-shrink:0;">
            ${String.fromCharCode(65 + oIdx)}
          </span>
          <span>${opt}</span>
        </button>
      `;
      })
      .join("");

    const answeredCount = Object.keys(state.quizAnswered).length;

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem;padding-bottom:0.8rem;border-bottom:1px solid var(--border-light);">
        <div>
          <span style="background:var(--blue-100);color:var(--blue-800);font-size:0.74rem;font-weight:800;padding:0.25rem 0.7rem;border-radius:99px;">
            Rujukan ${qObj.chapter}
          </span>
          <strong style="margin-left:0.5rem;font-size:0.86rem;color:var(--text-secondary);">
            Soalan ${state.quizIndex + 1} daripada ${total}
          </strong>
        </div>
        <div style="font-weight:900;color:var(--blue-800);font-size:0.9rem;">
          Skor Semasa: ${state.quizScore} / ${total}
        </div>
      </div>

      <h3 style="font-size:1.1rem;font-weight:800;color:var(--blue-950);margin-bottom:1.1rem;">
        ${qObj.q}
      </h3>

      <div>${optionsHtml}</div>

      ${
        answeredChoice !== undefined
          ? `
        <div style="margin-top:1rem;padding:1rem 1.2rem;border-radius:10px;background:${
          answeredChoice === qObj.answer ? "#ecfdf5" : "#fffbeb"
        };border-left:5px solid ${
              answeredChoice === qObj.answer ? "var(--accent-emerald)" : "var(--accent-gold)"
            };font-size:0.88rem;">
          <strong>${
            answeredChoice === qObj.answer ? "✅ Tepat Sekali!" : "💡 Penerangan Jawapan Sebenar:"
          }</strong><br/>
          ${qObj.explanation}
        </div>
      `
          : ""
      }

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.35rem;padding-top:1rem;border-top:1px solid var(--border-light);flex-wrap:wrap;gap:0.65rem;">
        <div style="display:flex;gap:0.5rem;">
          <button class="btn-outline-blue" style="padding:0.5rem 1rem;font-size:0.8rem;" ${
            state.quizIndex === 0 ? "disabled" : ""
          } onclick="navQuiz(-1)">
            ← Soalan Sebelum
          </button>
          <button class="btn-primary-blue" style="padding:0.5rem 1.1rem;font-size:0.8rem;" ${
            state.quizIndex === total - 1 ? "disabled" : ""
          } onclick="navQuiz(1)">
            Soalan Seterusnya →
          </button>
        </div>

        <button class="step-check-btn" onclick="resetQuiz()">
          🔄 Ulang Semula Kuiz (${answeredCount}/${total} Dijawab)
        </button>
      </div>
    `;
  }

  window.submitQuizAnswer = function (choiceIdx) {
    if (state.quizAnswered[state.quizIndex] !== undefined) return;
    state.quizAnswered[state.quizIndex] = choiceIdx;
    const qObj = DATA.quizQuestions[state.quizIndex];
    if (choiceIdx === qObj.answer) {
      state.quizScore++;
      addXp(20, "Jawapan kuiz tepat!");
    }
    renderQuiz();
  };

  window.navQuiz = function (delta) {
    const next = state.quizIndex + delta;
    if (next >= 0 && next < DATA.quizQuestions.length) {
      state.quizIndex = next;
      renderQuiz();
    }
  };

  window.resetQuiz = function () {
    state.quizIndex = 0;
    state.quizScore = 0;
    state.quizAnswered = {};
    renderQuiz();
    showToast("Kuiz telah ditetapkan semula.");
  };

  /* ==========================================================================
     7. CHATBOT PINTAR AI "CIKGU TIKTOK BOT"
     ========================================================================== */
  window.askChatbotQuick = function (promptText) {
    const input = document.getElementById("chatInputField");
    if (input) input.value = promptText;
    window.switchView("chatbot");
    handleChatSubmit();
  };

  window.handleChatSubmit = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById("chatInputField");
    const msgBox = document.getElementById("chatMessagesContainer");
    if (!input || !msgBox) return;

    const userText = input.value.trim();
    if (!userText) return;
    input.value = "";

    appendChatBubble(userText, "user");

    setTimeout(() => {
      const reply = generateBotResponse(userText);
      appendChatBubble(reply, "bot");
    }, 260);
  };

  function appendChatBubble(htmlText, sender) {
    const msgBox = document.getElementById("chatMessagesContainer");
    if (!msgBox) return;
    const div = document.createElement("div");
    div.className = `chat-bubble ${sender}`;
    div.innerHTML = htmlText;
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  function generateBotResponse(query) {
    const q = query.toLowerCase();

    if (q.includes("emas") || q.includes("formula") || q.includes("struktur")) {
      return `
        <strong>💎 Formula E.M.A.S (Rujukan Bab 3.2):</strong><br/>
        Formula mudah untuk bina video berdurasi 15–30 saat yang memukau penonton:<br/>
        • <strong>E – Engage (0–3s):</strong> Tarik perhatian dalam 3 saat pertama (Contoh: <em>"Ramai orang silap bila buat ni..."</em>)<br/>
        • <strong>M – Masalah (3–10s):</strong> Nyatakan masalah yang biasa penonton hadapi.<br/>
        • <strong>A – Ajar / Aksi (10–22s):</strong> Beri penyelesaian atau demonstrasi produk secara jelas.<br/>
        • <strong>S – Seru / CTA (22–30s):</strong> Ajak penonton untuk like, komen, simpan atau klik beg kuning.<br/><br/>
        <em>Contoh penuh: "Saya selalu alami muka berminyak waktu tengah hari. Lepas cuba produk ni selama 3 hari, minyak berkurang 80%. Nak tahu produk apa? Tonton sampai habis!"</em>
      `;
    }

    if (q.includes("malu") || q.includes("menari") || q.includes("muka") || q.includes("pemula")) {
      return `
        <strong>🙌 Konsep "TikTok Tapi Tak Menari" (Prakata & Bab 3.3):</strong><br/>
        Anda langsung <strong>tidak perlu menari</strong> atau menjadi selebriti untuk berjaya di TikTok! Berikut 4 gaya video tanpa perlu menari:<br/>
        1. <strong>POV / Behind The Scene (BTS):</strong> Rakam tangan anda membungkus order (packing) atau menyediakan produk.<br/>
        2. <strong>Demo Produk Sebelum & Selepas:</strong> Fokus kamera terus pada hasil penggunaan produk + tambah <em>Voiceover</em> atau teks di skrin.<br/>
        3. <strong>Edu-Market (Bab 2.4):</strong> Kongsi 3 tip ringkas menggunakan slaid/teks sambil berlatarkan muzik trending.<br/>
        4. <strong>Testimoni Sosial (Bab 2.5):</strong> Tunjukkan maklum balas pelanggan sebenar yang berpuas hati.
      `;
    }

    if (q.includes("fyp") || q.includes("algoritma") || q.includes("view") || q.includes("rating")) {
      return `
        <strong>🚀 4 Pilar Algoritma FYP TikTok (Rujukan Bab 6.1 – 6.8):</strong><br/>
        Algoritma TikTok menolak video anda ke FYP berdasarkan:<br/>
        1. <strong>Watch Time:</strong> Berapa lama orang menonton video anda.<br/>
        2. <strong>Completion Rate:</strong> Video 15 saat yang ditonton sampai habis jauh lebih mudah masuk FYP berbanding video 60 saat yang ditonton separuh jalan!<br/>
        3. <strong>Engagement:</strong> Jumlah Like, Komen, Share & Save.<br/>
        4. <strong>Konsistensi:</strong> Kekerapan post (minimum 1 sehari) & balas komen dalam 24 jam.<br/><br/>
        <strong>Tip Tambahan:</strong> Gunakan <strong>3–5 hashtag spesifik</strong> (bukan puluhan hashtag rawak) dan lagu berlabel <em>Trending</em> pada kelantangan rendah!
      `;
    }

    if (q.includes("waktu") || q.includes("masa") || q.includes("jam") || q.includes("bila post")) {
      return `
        <strong>⏰ Waktu Posting Terbaik Di Malaysia (Bab 3.6 & Bab 6.7):</strong><br/>
        • <strong>Sesi Tengah Hari:</strong> 11:00 pagi – 1:00 tengah hari (Waktu rehat makan tengah hari)<br/>
        • <strong>Sesi Petang:</strong> 5:00 petang – 7:00 malam (Waktu tamat kerja / santai petang)<br/>
        • <strong>Sesi Malam (Puncak):</strong> 9:00 malam – 11:30 malam (Waktu pengguna paling aktif scroll sebelum tidur)<br/><br/>
        <em>Pastikan anda turut menyemak tab <strong>TikTok Analytics</strong> di Business Account untuk melihat waktu sebenar pengikut anda aktif!</em>
      `;
    }

    if (q.includes("pantang") || q.includes("larang") || q.includes("shadowban") || q.includes("sekat")) {
      return `
        <strong>⚠️ 7 Pantang Larang Utama Mengelakkan Shadowban (Bab 7.7):</strong><br/>
        1. ❌ Jangan guna bahasa kesat, kasar atau lucah (walaupun bergurau).<br/>
        2. ❌ Jangan guna muzik tanpa hak cipta dari luar TikTok.<br/>
        3. ❌ Jangan spam ayat jualan (<em>hard selling</em>) berulang kali.<br/>
        4. ❌ Jangan post testimoni palsu atau tuntutan melampau (<em>overclaim</em>).<br/>
        5. ❌ Elakkan berpakaian terlalu seksi / mendedahkan aurat keterlaluan.<br/>
        6. ❌ Jangan sentuh isu politik ekstrem atau sensitiviti di Malaysia.<br/>
        7. ❌ Jangan guna teknik <em>clickbait</em> yang menipu penonton.
      `;
    }

    if (q.includes("close") || q.includes("jualan") || q.includes("live") || q.includes("dm")) {
      return `
        <strong>💰 Teknik Close Sale & Seni 'Soft Close' (Bab 7.2 – 7.8):</strong><br/>
        • <strong>Dalam Video:</strong> Gabungkan <em>Urgency</em> ("Hari ni last free postage!"), <em>Bukti Sosial</em> ("500 pelanggan dah cuba") & CTA jelas.<br/>
        • <strong>Semasa Live TikTok:</strong> Panggil nama & negeri penonton (<em>"Kak Min dari Kedah..."</em>), tunjuk proses packing secara live, buat Flash Sale, dan ingatkan klik beg kuning.<br/>
        • <strong>Seni Soft Close (Bab 7.8):</strong> Buat pelanggan rasa selesa tanpa dipaksa: <em>"Kalau anda nak cuba, boleh klik link ya. Tak beli pun tak apa, tengok dulu pun dah cukup 😊"</em>
      `;
    }

    if (q.includes("affiliate") || q.includes("duit") || q.includes("pendapatan") || q.includes("komisen") || q.includes("sponsored")) {
      return `
        <strong>💵 7 Cara Menjana Pendapatan Di TikTok (Bab 4.1 – 4.7):</strong><br/>
        1. <strong>Jual Produk Sendiri:</strong> Homemade, dropship, bundle, makanan.<br/>
        2. <strong>TikTok Shop:</strong> Transaksi automatik melalui Beg Kuning.<br/>
        3. <strong>TikTok Affiliate:</strong> Tanpa simpan stok! Daftar di Affiliate Centre → Pilih produk → <em>Add to Showcase</em> → Jana komisen <strong>10% hingga 30%</strong>.<br/>
        4. <strong>Live & Gifts:</strong> Syarat umur 18+ tahun & minimum 1,000 followers.<br/>
        5. <strong>Sponsored Content:</strong> 1k–10k followers (RM50–RM300/video), 10k–100k followers (RM300–RM1,500/video), 100k+ (RM1,500+).<br/>
        6. <strong>Produk Digital:</strong> Jual eBook, kelas Zoom atau bengkel.<br/>
        7. <strong>Optimasi Link Bio:</strong> Guna Taplink / Linktree untuk WhatsApp & Shopee.
      `;
    }

    if (q.includes("90 hari") || q.includes("3 bulan") || q.includes("strategi") || q.includes("jangka panjang")) {
      return `
        <strong>🗓️ Pelan Perancangan 90 Hari / 3 Bulan Pertama (Bab 8.9):</strong><br/>
        • <strong>Bulan 1 (Asas & Eksperimen):</strong> Siapkan akaun Business, bio & branding. Post 3–5 video seminggu dan uji pelbagai gaya konten.<br/>
        • <strong>Bulan 2 (Optimasi & Komuniti):</strong> Kenal pasti konten paling berkesan, mula buat Live secara konsisten, dan bina grup WhatsApp/Telegram pelanggan.<br/>
        • <strong>Bulan 3 (Scale & Siri Tetap):</strong> Buat siri kandungan mingguan (<em>#MotivasiBisnes, #TipsTikTok, #TestimoniJumaat, #LiveQnA</em>), ulang konten berjaya dengan gaya baru, jalankan TikTok Ads (Spark Ads) & kolaborasi micro-influencer!
      `;
    }

    if (q.includes("hook") || q.includes("promosi") || q.includes("7 hari") || q.includes("ayat")) {
      return `
        <strong>🔥 5 Contoh Ayat Hook Promosi Trending (3 Saat Pertama):</strong><br/>
        1. <em>"Ramai orang silap bila buat ni masa nak selesaikan masalah..."</em><br/>
        2. <em>"Saya pernah rugi masa & duit sebab tak tahu rahsia ni dari awal..."</em><br/>
        3. <em>"Jangan beli [Produk] selagi korang belum tengok 3 bukti ni!"</em><br/>
        4. <em>"3 cara mudah untuk dapatkan [Manfaat] dalam masa 3 hari sahaja!"</em><br/>
        5. <em>"Kenapa lebih 500 pelanggan kami repeat order setiap minggu? Tengok ni 👀"</em><br/><br/>
        👉 Anda juga boleh klik tab <strong>"03 Penjana 7 Hari"</strong> di atas untuk menjana jadual skrip lengkap Isnin hingga Ahad secara automatik!
      `;
    }

    // Default comprehensive helpful response
    return `
      <strong>🤖 Jawapan Cikgu TikTok Bot (Berdasarkan eBook TikTok: Kaedah Pemasaran Bisnes):</strong><br/>
      Soalan yang sangat bagus tentang <em>"${query}"</em>! Mengikut prinsip utama dalam eBook tulisan <strong>Mohd Azrulnizam & Razlan</strong>:<br/>
      • <strong>Fokus Nilai & Penyelesaian Masalah:</strong> Penonton TikTok membeli kerana <em>"Proof Through Content"</em> (Bab 1.2) dan pendekatan <em>Edu-Market</em> (Bab 2.4).<br/>
      • <strong>Gunakan Struktur E.M.A.S (Bab 3.2):</strong> Mulakan dengan <strong>E</strong>ngage (Hook 3 saat), sebutkan <strong>M</strong>asalah, tunjukkan <strong>A</strong>jar/Aksi, dan akhiri dengan <strong>S</strong>eru (CTA).<br/>
      • <strong>Kekal Konsisten:</strong> Post pada waktu puncak Malaysia (11pg–1tgh, 5ptg–7mlm, 9mlm–11:30mlm) dengan 3–5 hashtag berkaitan.<br/><br/>
      💡 <em>Cuba tanya saya tentang: "Formula EMAS", "Cara elak shadowban", "Komisen Affiliate", "Teknik Soft Close", atau "Pelan 90 Hari"!</em>
    `;
  }

  /* ==========================================================================
     INITIALIZATION ON DOM LOAD
     ========================================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    updateXpUI();
    renderChapterList();
    renderChapterReader();
    renderWorkflowTabs();
    renderWorkflowStage();
    window.updateBioSimulator();
    window.generateSevenDaysPromo(false);
    window.runFypSimulation();
    window.runIncomeCalculator();
    renderQuiz();

    // Search input listener for notes
    const searchInput = document.getElementById("chapterSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        renderChapterList(e.target.value);
      });
    }
  });
})();
