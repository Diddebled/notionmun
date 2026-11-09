(function () {
  const storageKey = "motion-dais-state-v1";

  const sampleDelegates = [
    { id: "argentina", country: "Argentina", name: "Lucia Ferro", status: "Voting", spoken: false },
    { id: "brazil", country: "Brazil", name: "Rafael Costa", status: "Voting", spoken: false },
    { id: "canada", country: "Canada", name: "Amelia Chen", status: "Voting", spoken: false },
    { id: "france", country: "France", name: "Noah Martin", status: "Voting", spoken: false },
    { id: "ghana", country: "Ghana", name: "Ama Mensah", status: "Voting", spoken: false },
    { id: "germany", country: "Germany", name: "Mia Schneider", status: "Voting", spoken: false },
    { id: "china", country: "China", name: "Li Wei", status: "Voting", spoken: false },
    { id: "egypt", country: "Egypt", name: "Nour Hassan", status: "Voting", spoken: false },
    { id: "india", country: "India", name: "Aarav Mehta", status: "Voting", spoken: false },
    { id: "indonesia", country: "Indonesia", name: "Dewi Putri", status: "Voting", spoken: false },
    { id: "italy", country: "Italy", name: "Giulia Romano", status: "Voting", spoken: false },
    { id: "japan", country: "Japan", name: "Hana Sato", status: "Voting", spoken: false },
    { id: "kenya", country: "Kenya", name: "Brian Otieno", status: "Voting", spoken: false },
    { id: "mexico", country: "Mexico", name: "Sofia Reyes", status: "Voting", spoken: false },
    { id: "netherlands", country: "Netherlands", name: "Lotte de Vries", status: "Voting", spoken: false },
    { id: "nigeria", country: "Nigeria", name: "Tomi Adeyemi", status: "Voting", spoken: false },
    { id: "norway", country: "Norway", name: "Ingrid Larsen", status: "Voting", spoken: false },
    { id: "rok", country: "Republic of Korea", name: "Minji Park", status: "Voting", spoken: false },
    { id: "south-africa", country: "South Africa", name: "Thabo Mokoena", status: "Voting", spoken: false },
    { id: "spain", country: "Spain", name: "Lucia Garcia", status: "Voting", spoken: false },
    { id: "turkey", country: "Turkey", name: "Deniz Kaya", status: "Voting", spoken: false },
    { id: "uk", country: "United Kingdom", name: "Eleanor Hughes", status: "Voting", spoken: false },
    { id: "usa", country: "United States", name: "Maya Johnson", status: "Voting", spoken: false },
    { id: "observer-eu", country: "European Union", name: "Observer", status: "Observer", spoken: false }
  ];

  const presets = {
    unmoderated: {
      label: "Unmoderated caucus",
      topic: "Unmoderated caucus for draft resolution blocs",
      totalMinutes: 10,
      speakerSeconds: 90
    },
    moderated: {
      label: "Moderated caucus",
      topic: "Discussing possible solutions to regional security",
      totalMinutes: 10,
      speakerSeconds: 90
    },
    cotw: {
      label: "Committee of the Whole",
      topic: "Committee of the Whole for clause-by-clause review",
      totalMinutes: 15,
      speakerSeconds: 60
    },
    gsl: {
      label: "General speakers list",
      topic: "General speakers list",
      totalMinutes: 30,
      speakerSeconds: 90
    }
  };

  const defaultState = {
    committee: "DISEC",
    topic: "Discussing possible solutions to regional security",
    mode: "Moderated caucus",
    delegates: sampleDelegates,
    queue: [
      { id: "brazil", type: "Moderated" },
      { id: "japan", type: "Moderated" },
      { id: "ghana", type: "Moderated" },
      { id: "france", type: "Moderated" }
    ],
    activeSpeaker: "uk",
    timer: {
      totalSeconds: 90,
      remainingSeconds: 90,
      speakerSeconds: 90,
      caucusMinutes: 10,
      running: false
    },
    votes: {
      forVotes: 14,
      againstVotes: 2,
      abstainVotes: 3,
      majorityMode: "simple"
    },
    resolutions: [
      {
        id: "dr-11",
        title: "Draft resolution 1.1",
        sponsors: "Brazil, Ghana, Japan",
        status: "Draft",
        body: "1. Calls for regional coordination hubs;\n2. Encourages transparent reporting channels;\n3. Requests a follow-up review at the next session."
      }
    ],
    selectedResolution: "dr-11",
    motionLog: [
      {
        label: "Moderated caucus",
        topic: "Discussing possible solutions to regional security",
        detail: "10 minutes, 90 seconds per speaker"
      }
    ],
    theme: "light",
    reducedMotion: false,
    waitlist: []
  };

  let state = loadState();
  let timerInterval = null;

  const $ = (selector) => document.querySelector(selector);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      if (stored && Array.isArray(stored.delegates)) {
        return {
          ...clone(defaultState),
          ...stored,
          timer: { ...clone(defaultState.timer), ...stored.timer, running: false },
          votes: { ...clone(defaultState.votes), ...stored.votes }
        };
      }
    } catch (error) {
      console.warn("Motion state could not be loaded", error);
    }
    return clone(defaultState);
  }

  function saveState() {
    const stored = clone(state);
    stored.timer.running = false;
    localStorage.setItem(storageKey, JSON.stringify(stored));
  }

  function makeId(value) {
    return `${String(value || "delegate").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
  }

  function delegateById(id) {
    return state.delegates.find((delegate) => delegate.id === id);
  }

  function votingMembers() {
    return state.delegates.filter((delegate) => delegate.status === "Voting").length;
  }

  function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
    const seconds = (safeSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function updateTimerProgress() {
    const progress = state.timer.totalSeconds > 0
      ? ((state.timer.totalSeconds - state.timer.remainingSeconds) / state.timer.totalSeconds) * 100
      : 0;
    $("#timerRing").style.setProperty("--progress", `${Math.min(100, Math.max(0, progress))}%`);
  }

  function startTimerLoop() {
    clearInterval(timerInterval);
    if (!state.timer.running) {
      return;
    }
    timerInterval = setInterval(() => {
      if (!state.timer.running) {
        clearInterval(timerInterval);
        return;
      }
      state.timer.remainingSeconds = Math.max(0, state.timer.remainingSeconds - 1);
      if (state.timer.remainingSeconds === 0) {
        state.timer.running = false;
        clearInterval(timerInterval);
      }
      renderTimer();
      saveState();
    }, 1000);
  }

  function renderTimer() {
    $("#timerDisplay").textContent = formatTime(state.timer.remainingSeconds);
    $("#timerCaption").textContent = state.timer.remainingSeconds === 0 ? "time elapsed" : "remaining";
    $("#startPause").textContent = state.timer.running ? "Pause" : "Start";
    $("#estimatedTime").textContent = `${state.timer.caucusMinutes} min`;
    $("#totalMinutes").value = state.timer.caucusMinutes;
    $("#speakerSeconds").value = state.timer.speakerSeconds;
    updateTimerProgress();
  }

  function renderDelegates() {
    const table = $("#delegateTable");
    table.innerHTML = "";
    state.delegates.forEach((delegate) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(delegate.country)}</td>
        <td>${escapeHtml(delegate.name)}</td>
        <td>${escapeHtml(delegate.status)}</td>
        <td><button class="text-button" type="button" data-action="remove-delegate" data-id="${delegate.id}">Remove</button></td>
      `;
      table.append(row);
    });

    const select = $("#queueDelegate");
    const currentValue = select.value;
    select.innerHTML = state.delegates
      .map((delegate) => `<option value="${delegate.id}">${escapeHtml(delegate.country)}</option>`)
      .join("");
    if (state.delegates.some((delegate) => delegate.id === currentValue)) {
      select.value = currentValue;
    }
  }

  function renderQueue() {
    const heroQueue = $("#heroQueue");
    const queueList = $("#queueList");
    heroQueue.innerHTML = "";
    queueList.innerHTML = "";

    if (state.queue.length === 0) {
      heroQueue.innerHTML = '<li><span>No speakers queued</span></li>';
      queueList.innerHTML = '<li class="empty-state">No speakers queued.</li>';
    }

    state.queue.forEach((item, index) => {
      const delegate = delegateById(item.id);
      if (!delegate) {
        return;
      }
      const heroItem = document.createElement("li");
      heroItem.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(delegate.country)}</strong>`;
      heroQueue.append(heroItem);

      const listItem = document.createElement("li");
      listItem.innerHTML = `
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(delegate.country)}</strong>
          <small>${escapeHtml(delegate.name)} / ${escapeHtml(item.type)}</small>
        </div>
        <div class="queue-actions">
          <button type="button" data-action="queue-up" data-index="${index}">Up</button>
          <button type="button" data-action="queue-down" data-index="${index}">Down</button>
          <button type="button" data-action="queue-speak" data-index="${index}">Speak</button>
          <button type="button" data-action="queue-remove" data-index="${index}">Remove</button>
        </div>
      `;
      queueList.append(listItem);
    });

    $("#queuedCount").textContent = String(state.queue.length).padStart(2, "0");
    $("#spokenCount").textContent = String(state.delegates.filter((delegate) => delegate.spoken).length).padStart(2, "0");
  }

  function renderSession() {
    const active = delegateById(state.activeSpeaker) || state.delegates[0];
    $("#committeeLabel").textContent = state.committee || "Committee";
    $("#committeeInput").value = state.committee;
    $("#topicInput").value = state.topic;
    $("#modeInput").value = state.mode;
    $("#activeCountry").textContent = active ? active.country : "No speaker";
    $("#activeMode").textContent = state.mode;
    $("#currentTopicText").textContent = `${state.topic} / ${state.timer.caucusMinutes} minutes / ${state.timer.speakerSeconds} sec per speaker`;
  }

  function renderVotes() {
    $("#forVotes").value = state.votes.forVotes;
    $("#againstVotes").value = state.votes.againstVotes;
    $("#abstainVotes").value = state.votes.abstainVotes;
    $("#majorityMode").value = state.votes.majorityMode;

    const forVotes = Number(state.votes.forVotes) || 0;
    const againstVotes = Number(state.votes.againstVotes) || 0;
    const abstainVotes = Number(state.votes.abstainVotes) || 0;
    const presentVoting = forVotes + againstVotes;
    const totalVoting = votingMembers();
    let required = Math.floor(presentVoting / 2) + 1;
    let basis = `${presentVoting} present and voting`;

    if (state.votes.majorityMode === "twoThirds") {
      required = Math.ceil((presentVoting * 2) / 3);
      basis = `${presentVoting} present and voting`;
    }
    if (state.votes.majorityMode === "substantive") {
      required = Math.floor(totalVoting / 2) + 1;
      basis = `${totalVoting} voting members`;
    }

    required = Math.max(1, required);
    const passes = forVotes >= required;
    const result = $("#voteResult");
    result.className = `vote-result ${passes ? "pass" : "fail"}`;
    result.innerHTML = `
      <strong>${passes ? "Motion passes" : "Motion fails"}</strong>
      <span>${required} required from ${basis}. For ${forVotes}, abstain ${abstainVotes}, against ${againstVotes}.</span>
    `;
  }

  function renderResolutions() {
    const list = $("#resolutionList");
    list.innerHTML = "";
    state.resolutions.forEach((resolution) => {
      const item = document.createElement("div");
      item.className = "resolution-item";
      item.innerHTML = `
        <div>
          <strong>${escapeHtml(resolution.title)}</strong>
          <small>${escapeHtml(resolution.status)} / ${escapeHtml(resolution.sponsors || "No sponsors")}</small>
        </div>
        <div class="queue-actions">
          <button type="button" data-action="present-resolution" data-id="${resolution.id}">Present</button>
          <button type="button" data-action="delete-resolution" data-id="${resolution.id}">Delete</button>
        </div>
      `;
      list.append(item);
    });

    if (state.resolutions.length === 0) {
      list.innerHTML = '<div class="empty-state">No resolutions saved.</div>';
    }

    const selected = state.resolutions.find((resolution) => resolution.id === state.selectedResolution) || state.resolutions[0];
    const display = $("#roomDisplay");
    if (!selected) {
      display.innerHTML = "<h4>Room display</h4><h3>No resolution selected</h3><pre>Add a draft resolution to present it here.</pre>";
      return;
    }
    state.selectedResolution = selected.id;
    display.innerHTML = `
      <h4>${escapeHtml(selected.status)}</h4>
      <h3>${escapeHtml(selected.title)}</h3>
      <p>Sponsors: ${escapeHtml(selected.sponsors || "None listed")}</p>
      <pre>${escapeHtml(selected.body || "No clauses added yet.")}</pre>
    `;
  }

  function renderMotions() {
    const log = $("#motionLog");
    log.innerHTML = state.motionLog
      .map((motion) => `
        <article>
          <strong>${escapeHtml(motion.label)}</strong>
          <p>${escapeHtml(motion.topic)} / ${escapeHtml(motion.detail)}</p>
        </article>
      `)
      .join("");
    if (!state.motionLog.length) {
      log.innerHTML = '<div class="empty-state">No motions recorded.</div>';
    }
  }

  function renderSettings() {
    document.documentElement.dataset.theme = state.theme;
    document.body.classList.toggle("reduced-motion", state.reducedMotion);
    $("#themeLabel").textContent = state.theme === "dark" ? "Light mode" : "Dark mode";
    $("#themeState").textContent = state.theme === "dark" ? "On" : "Off";
    $("#motionState").textContent = state.reducedMotion ? "On" : "Off";
  }

  function renderAll() {
    renderSettings();
    renderSession();
    renderTimer();
    renderDelegates();
    renderQueue();
    renderVotes();
    renderResolutions();
    renderMotions();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showImportStatus(message) {
    $("#importStatus").textContent = message;
  }

  function replaceDelegates(delegates) {
    state.delegates = delegates.map((delegate) => ({
      id: makeId(delegate.country),
      country: delegate.country,
      name: delegate.name || "Unassigned delegate",
      status: delegate.status === "Observer" ? "Observer" : "Voting",
      spoken: false
    }));
    state.activeSpeaker = state.delegates[0]?.id || null;
    state.queue = state.delegates.slice(1, 5).map((delegate) => ({ id: delegate.id, type: "GSL" }));
    saveState();
    renderAll();
  }

  async function importRoster(file) {
    const formData = new FormData();
    formData.append("roster", file);
    showImportStatus("Importing...");
    const response = await fetch("/api/import-roster", { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Import failed.");
    }
    replaceDelegates(payload.delegates);
    showImportStatus(`Imported ${payload.delegates.length} delegates from ${payload.file}.`);
  }

  function nextSpeaker(index = 0) {
    if (!state.queue.length) {
      return;
    }
    const selectedIndex = Math.max(0, Math.min(index, state.queue.length - 1));
    const current = delegateById(state.activeSpeaker);
    if (current) {
      current.spoken = true;
    }
    const [next] = state.queue.splice(selectedIndex, 1);
    state.activeSpeaker = next.id;
    state.mode = next.type === "GSL" ? "General speakers list" : state.mode;
    state.timer.remainingSeconds = state.timer.speakerSeconds;
    state.timer.totalSeconds = state.timer.speakerSeconds;
    saveState();
    renderAll();
  }

  function applyPreset(key) {
    const preset = presets[key];
    if (!preset) {
      return;
    }
    state.mode = preset.label;
    state.topic = preset.topic;
    state.timer.caucusMinutes = preset.totalMinutes;
    state.timer.speakerSeconds = preset.speakerSeconds;
    state.timer.totalSeconds = preset.speakerSeconds;
    state.timer.remainingSeconds = preset.speakerSeconds;
    state.motionLog.unshift({
      label: preset.label,
      topic: preset.topic,
      detail: `${preset.totalMinutes} minutes, ${preset.speakerSeconds} seconds per speaker`
    });
    state.motionLog = state.motionLog.slice(0, 8);
    saveState();
    renderAll();
  }

  function bindEvents() {
    $("#menuButton").addEventListener("click", () => {
      const popover = $("#settingsPopover");
      const expanded = $("#menuButton").getAttribute("aria-expanded") === "true";
      $("#menuButton").setAttribute("aria-expanded", String(!expanded));
      popover.hidden = expanded;
    });

    $("#themeToggle").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      saveState();
      renderSettings();
    });

    $("#motionToggle").addEventListener("click", () => {
      state.reducedMotion = !state.reducedMotion;
      saveState();
      renderSettings();
    });

    $("#committeeInput").addEventListener("input", (event) => {
      state.committee = event.target.value;
      saveState();
      renderSession();
    });

    $("#topicInput").addEventListener("input", (event) => {
      state.topic = event.target.value;
      saveState();
      renderSession();
    });

    $("#modeInput").addEventListener("change", (event) => {
      state.mode = event.target.value;
      saveState();
      renderSession();
    });

    $("#startPause").addEventListener("click", () => {
      state.timer.running = !state.timer.running;
      saveState();
      renderTimer();
      startTimerLoop();
    });

    $("#plusTime").addEventListener("click", () => {
      state.timer.totalSeconds += 15;
      state.timer.remainingSeconds += 15;
      saveState();
      renderTimer();
    });

    $("#minusTime").addEventListener("click", () => {
      state.timer.totalSeconds = Math.max(15, state.timer.totalSeconds - 15);
      state.timer.remainingSeconds = Math.min(state.timer.remainingSeconds, state.timer.totalSeconds);
      saveState();
      renderTimer();
    });

    $("#resetTimer").addEventListener("click", () => {
      state.timer.running = false;
      state.timer.totalSeconds = state.timer.speakerSeconds;
      state.timer.remainingSeconds = state.timer.speakerSeconds;
      saveState();
      renderTimer();
      startTimerLoop();
    });

    $("#applyTimer").addEventListener("click", () => {
      const minutes = Math.max(1, Number($("#totalMinutes").value) || 1);
      const seconds = Math.max(15, Number($("#speakerSeconds").value) || 90);
      state.timer.caucusMinutes = minutes;
      state.timer.speakerSeconds = seconds;
      state.timer.totalSeconds = seconds;
      state.timer.remainingSeconds = seconds;
      state.timer.running = false;
      saveState();
      renderAll();
      startTimerLoop();
    });

    $("#nextSpeaker").addEventListener("click", () => nextSpeaker(0));

    $("#loadSample").addEventListener("click", () => {
      replaceDelegates(clone(sampleDelegates));
      showImportStatus("Sample roster loaded.");
    });

    $("#rosterFile").addEventListener("change", async (event) => {
      const [file] = event.target.files;
      if (!file) {
        return;
      }
      try {
        await importRoster(file);
      } catch (error) {
        showImportStatus(error.message);
      } finally {
        event.target.value = "";
      }
    });

    $("#delegateForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const country = $("#countryInput").value.trim();
      if (!country) {
        return;
      }
      state.delegates.push({
        id: makeId(country),
        country,
        name: $("#delegateInput").value.trim() || "Unassigned delegate",
        status: $("#statusInput").value,
        spoken: false
      });
      event.target.reset();
      saveState();
      renderAll();
    });

    $("#delegateTable").addEventListener("click", (event) => {
      const button = event.target.closest("[data-action='remove-delegate']");
      if (!button) {
        return;
      }
      state.delegates = state.delegates.filter((delegate) => delegate.id !== button.dataset.id);
      state.queue = state.queue.filter((item) => item.id !== button.dataset.id);
      if (state.activeSpeaker === button.dataset.id) {
        state.activeSpeaker = state.delegates[0]?.id || null;
      }
      saveState();
      renderAll();
    });

    $("#queueForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const id = $("#queueDelegate").value;
      if (!id) {
        return;
      }
      state.queue.push({ id, type: $("#queueType").value });
      saveState();
      renderQueue();
    });

    $("#queueList").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }
      const index = Number(button.dataset.index);
      const action = button.dataset.action;
      if (action === "queue-up" && index > 0) {
        [state.queue[index - 1], state.queue[index]] = [state.queue[index], state.queue[index - 1]];
      }
      if (action === "queue-down" && index < state.queue.length - 1) {
        [state.queue[index + 1], state.queue[index]] = [state.queue[index], state.queue[index + 1]];
      }
      if (action === "queue-remove") {
        state.queue.splice(index, 1);
      }
      if (action === "queue-speak") {
        nextSpeaker(index);
        return;
      }
      saveState();
      renderQueue();
    });

    ["forVotes", "againstVotes", "abstainVotes", "majorityMode"].forEach((id) => {
      $(`#${id}`).addEventListener("input", (event) => {
        state.votes[id] = id === "majorityMode" ? event.target.value : Number(event.target.value) || 0;
        saveState();
        renderVotes();
      });
    });

    $("#resolutionForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const resolution = {
        id: makeId($("#resolutionTitle").value),
        title: $("#resolutionTitle").value.trim(),
        sponsors: $("#resolutionSponsors").value.trim(),
        status: $("#resolutionStatus").value,
        body: $("#resolutionBody").value.trim()
      };
      if (!resolution.title) {
        return;
      }
      state.resolutions.unshift(resolution);
      state.selectedResolution = resolution.id;
      event.target.reset();
      saveState();
      renderResolutions();
    });

    $("#resolutionList").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }
      if (button.dataset.action === "present-resolution") {
        state.selectedResolution = button.dataset.id;
      }
      if (button.dataset.action === "delete-resolution") {
        state.resolutions = state.resolutions.filter((resolution) => resolution.id !== button.dataset.id);
        if (state.selectedResolution === button.dataset.id) {
          state.selectedResolution = state.resolutions[0]?.id || null;
        }
      }
      saveState();
      renderResolutions();
    });

    $("#presetGrid").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-preset]");
      if (button) {
        applyPreset(button.dataset.preset);
      }
    });

    $("#waitlistForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const email = $("#emailInput").value.trim();
      if (!email) {
        return;
      }
      if (!state.waitlist.includes(email)) {
        state.waitlist.push(email);
      }
      $("#waitlistMessage").textContent = "You are on the Motion early access list.";
      event.target.reset();
      saveState();
    });
  }

  bindEvents();
  renderAll();
  startTimerLoop();
})();
