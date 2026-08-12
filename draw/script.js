(function(){
  "use strict";

  /* ---------------- data model ---------------- */
  const SPORTS = {
    football:{
      key:"football", label:"Football", icon:"⚽", type:"team", count:8,
      roundName:"QUARTER FINALS",
      defaults:["Team A","Team B","Team C","Team D","Team E","Team F","Team G","Team H"]
    },
    basketball:{
      key:"basketball", label:"Basketball", icon:"🏀", type:"team", count:4,
      roundName:"SEMI FINALS",
      defaults:["Team A","Team B","Team C","Team D"]
    },
    tabletennis:{
      key:"tabletennis", label:"Table Tennis", icon:"🏓", type:"player", count:16,
      roundName:"ROUND OF 16",
      defaults:Array.from({length:16},(_,i)=>"Player "+(i+1))
    },
    badminton:{
      key:"badminton", label:"Badminton", icon:"🏸", type:"player", count:8,
      roundName:"QUARTER FINALS",
      defaults:Array.from({length:8},(_,i)=>"Player "+(i+1))
    }
  };

  function defaultSportState(key){
    return {
      participants:[...SPORTS[key].defaults],
      pool:[],
      matches:[],
      matchIndex:0,
      done:false,
      stage:"idle",       // idle | drawing | results
      rounds:[],
      champion:null,
      liveDrawing:false
    };
  }

  // dbState[key] mirrors Firebase in real time for every connected device
  const dbState = {};
  Object.keys(SPORTS).forEach(k=> dbState[k] = defaultSportState(k));

  // local-only draft used while an admin is editing names before a draw starts
  const draftParticipants = {};

  let currentSportKey = null;
  let muted = false;
  let isAdmin = false;

  /* ---------------- helpers ---------------- */
  const $ = id => document.getElementById(id);
  function showScreen(id){
    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
    $(id).classList.add("active");
  }
  function secureRandomInt(maxExclusive){
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % maxExclusive;
  }
  function pickRandomFrom(arr){
    const idx = secureRandomInt(arr.length);
    return { value:arr[idx], index:idx };
  }
  function asArray(v){ return Array.isArray(v) ? v : (v ? Object.values(v) : []); }

  /* ---------------- Firebase live sync ---------------- */
  let db = null;
  let fbReady = false;
  const dbRefs = {};

  function initFirebase(){
    try{
      if(typeof FIREBASE_CONFIG === "undefined" || FIREBASE_CONFIG.apiKey.indexOf("PASTE_YOUR") === 0){
        console.warn("Firebase is not configured yet — see firebase-config.js");
        return;
      }
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.database();
      fbReady = true;

      Object.keys(SPORTS).forEach(key=>{
        dbRefs[key] = db.ref("tournament/" + key);
        dbRefs[key].once("value").then(snap=>{
          if(!snap.exists()){ dbRefs[key].set(defaultSportState(key)); }
        });
        dbRefs[key].on("value", snap=>{
          const val = snap.val();
          dbState[key] = val ? normalizeIncoming(val, key) : defaultSportState(key);
          onSportStateChanged(key);
        });
      });

      db.ref(".info/connected").on("value", snap=>{
        updateRoleBadge(!!snap.val());
      });
    }catch(e){
      console.error("Firebase init failed", e);
    }
  }

  // Firebase turns pure sequential-index arrays back into arrays automatically,
  // but guards against odd shapes just in case.
  function normalizeIncoming(val, key){
    return {
      participants: asArray(val.participants).length ? asArray(val.participants) : [...SPORTS[key].defaults],
      pool: asArray(val.pool),
      matches: asArray(val.matches).map(m=> asArray(m)),
      matchIndex: val.matchIndex || 0,
      done: !!val.done,
      stage: val.stage || "idle",
      rounds: asArray(val.rounds).map(r=> asArray(r)),
      champion: val.champion || null,
      liveDrawing: !!val.liveDrawing
    };
  }

  function writeSportState(key, partial){
    if(!fbReady){ Object.assign(dbState[key], partial); onSportStateChanged(key); return; }
    dbRefs[key].update(partial);
  }
  function setSportState(key, full){
    if(!fbReady){ dbState[key] = full; onSportStateChanged(key); return; }
    dbRefs[key].set(full);
  }

  function onSportStateChanged(key){
    renderHome();
    if(currentSportKey === key){
      const activeId = document.querySelector(".screen.active")?.id;
      if(activeId === "screen-draw") renderDraw(key);
      if(activeId === "screen-results") renderResults(key);
    }
  }

  /* ---------------- audio (WebAudio, no external files) ---------------- */
  let actx = null;
  function audioCtx(){
    if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)();
    return actx;
  }
  function beep(freq, dur, type, gainVal){
    if(muted) return;
    try{
      const ctx = audioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type||"square";
      osc.frequency.value = freq;
      gain.gain.value = gainVal||0.05;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.stop(ctx.currentTime + dur);
    }catch(e){}
  }
  function sfxTick(){ beep(520 + Math.random()*260, 0.05, "square", 0.045); }
  function sfxLock(){ beep(660,0.09,"triangle",0.07); setTimeout(()=>beep(990,0.14,"triangle",0.07),90); }
  function sfxFanfare(){
    [523,659,784,1046].forEach((f,i)=> setTimeout(()=>beep(f,0.18,"square",0.06), i*110));
  }

  /* ---------------- fullscreen / mute wiring ---------------- */
  function toggleFullscreen(){
    if(!document.fullscreenElement){ document.documentElement.requestFullscreen().catch(()=>{}); }
    else{ document.exitFullscreen().catch(()=>{}); }
  }
  ["btn-fullscreen-home","btn-fullscreen-setup","btn-fullscreen-draw","btn-fullscreen-results"]
    .forEach(id=> $(id).addEventListener("click", toggleFullscreen));

  function toggleMute(){
    muted = !muted;
    document.querySelectorAll("#btn-mute-home,#btn-mute-draw").forEach(b=> b.textContent = muted ? "🔇" : "🔊");
  }
  $("btn-mute-home").addEventListener("click", toggleMute);
  $("btn-mute-draw").addEventListener("click", toggleMute);

  /* ---------------- ADMIN ROLE ---------------- */
  function updateRoleBadge(online){
    const badge = $("role-badge");
    const dotClass = online === undefined ? "" : (online ? " online" : "");
    if(isAdmin){
      badge.className = "role-badge is-admin";
      badge.innerHTML = `<span class="dot${dotClass || " online"}"></span> 🛡 ADMIN MODE — click again to log out`;
      badge.style.pointerEvents = "auto";
      badge.style.cursor = "pointer";
    } else {
      badge.className = "role-badge";
      badge.innerHTML = `<span class="dot${dotClass}"></span> 🔒 VIEW ONLY — LIVE`;
      badge.style.pointerEvents = "none";
    }
    document.body.classList.toggle("role-admin", isAdmin);
    document.body.classList.toggle("role-viewer", !isAdmin);
  }
  $("role-badge").addEventListener("click", ()=>{
    if(isAdmin){
      isAdmin = false;
      localStorage.removeItem("ieee_draw_admin");
      updateRoleBadge();
      renderHome();
    }
  });

  function openAdminModal(){
    $("admin-login-err").textContent = "";
    $("admin-pass-input").value = "";
    $("modal-admin").classList.add("active");
    setTimeout(()=> $("admin-pass-input").focus(), 50);
  }
  $("btn-admin-login").addEventListener("click", ()=>{
    if(isAdmin){ // acts as quick logout from the home icon too
      isAdmin = false;
      localStorage.removeItem("ieee_draw_admin");
      updateRoleBadge();
      renderHome();
    } else {
      openAdminModal();
    }
  });
  $("admin-cancel").addEventListener("click", ()=> $("modal-admin").classList.remove("active"));
  function attemptAdminLogin(){
    const val = $("admin-pass-input").value;
    if(typeof ADMIN_PASSWORD !== "undefined" && val === ADMIN_PASSWORD){
      isAdmin = true;
      localStorage.setItem("ieee_draw_admin", "1");
      $("modal-admin").classList.remove("active");
      updateRoleBadge();
      renderHome();
    } else {
      $("admin-login-err").textContent = "Incorrect password. Try again.";
    }
  }
  $("admin-submit").addEventListener("click", attemptAdminLogin);
  $("admin-pass-input").addEventListener("keydown", e=>{ if(e.key === "Enter") attemptAdminLogin(); });

  /* ---------------- HOME ---------------- */
  function statusLabel(st){
    if(st.done) return { text:"✓ DRAW COMPLETE", cls:"done" };
    if(st.stage === "drawing") return { text:"🎲 DRAW IN PROGRESS", cls:"pending" };
    return { text:"AWAITING DRAW", cls:"pending" };
  }

  function renderHome(){
    const wrap = $("tiles");
    wrap.innerHTML = "";
    Object.values(SPORTS).forEach(sport=>{
      const st = dbState[sport.key];
      const s = statusLabel(st);
      const div = document.createElement("div");
      div.className = "tile";
      div.innerHTML = `
        <span class="ic">${sport.icon}</span>
        <div class="nm">${sport.label.toUpperCase()}</div>
        <div class="mt">${sport.count} ${sport.type==="team"?"TEAMS":"PLAYERS"} · ${sport.roundName}</div>
        <div class="status ${s.cls}">${s.text}</div>
      `;
      div.addEventListener("click", ()=> openSport(sport.key));
      wrap.appendChild(div);
    });
  }

  function openSport(key){
    currentSportKey = key;
    const st = dbState[key];
    if(isAdmin){
      if(st.done){ renderResults(key); showScreen("screen-results"); }
      else if(st.stage === "drawing"){ renderDraw(key); showScreen("screen-draw"); }
      else { draftParticipants[key] = [...st.participants]; renderSetup(key); showScreen("screen-setup"); }
    } else {
      if(st.done){ renderResults(key); showScreen("screen-results"); }
      else { renderDraw(key); showScreen("screen-draw"); }
    }
  }

  $("btn-back-home").addEventListener("click", ()=>{ renderHome(); showScreen("screen-home"); });
  $("btn-home-from-results").addEventListener("click", ()=>{ renderHome(); showScreen("screen-home"); });

  /* ---------------- SETUP (admin only) ---------------- */
  function renderSetup(key){
    const sport = SPORTS[key];
    $("setup-sport-label").textContent = sport.label.toUpperCase();
    $("setup-title").textContent = `CONFIRM ${sport.type==="team"?"TEAMS":"PLAYERS"} BEFORE THE DRAW`;
    const grid = $("setup-grid");
    grid.innerHTML = "";
    draftParticipants[key].forEach((name,i)=>{
      const field = document.createElement("div");
      field.className = "p-field";
      field.innerHTML = `<label>${sport.type==="team"?"TEAM":"PLAYER"} ${String(i+1).padStart(2,"0")}</label>
        <input type="text" data-idx="${i}" value="${name.replace(/"/g,'&quot;')}" maxlength="26">`;
      grid.appendChild(field);
    });
    $("setup-err").textContent = "";
    grid.querySelectorAll("input").forEach(inp=>{
      inp.addEventListener("input", e=>{
        draftParticipants[key][+e.target.dataset.idx] = e.target.value;
      });
    });
  }

  $("btn-reset-names").addEventListener("click", ()=>{
    if(!currentSportKey) return;
    draftParticipants[currentSportKey] = [...SPORTS[currentSportKey].defaults];
    renderSetup(currentSportKey);
  });

  $("btn-start-draw").addEventListener("click", ()=>{
    const key = currentSportKey;
    const names = draftParticipants[key].map(n=>n.trim());
    if(names.some(n=>n.length===0)){
      $("setup-err").textContent = "Every name must be filled in before the draw can start.";
      return;
    }
    const lower = names.map(n=>n.toLowerCase());
    if(new Set(lower).size !== lower.length){
      $("setup-err").textContent = "Names must be unique — two entries cannot share the same name.";
      return;
    }
    setSportState(key, {
      participants:names, pool:[...names], matches:[], matchIndex:0,
      done:false, stage:"drawing", rounds:[], champion:null, liveDrawing:false
    });
    showScreen("screen-draw");
  });

  /* ---------------- DRAW ---------------- */
  let spinLock = false;

  function totalMatches(key){ return SPORTS[key].count/2; }

  function renderDotTrail(key){
    const total = totalMatches(key);
    const st = dbState[key];
    const wrap = $("dot-trail");
    wrap.innerHTML = "";
    for(let i=0;i<total;i++){
      if(i < st.matchIndex){
        const d = document.createElement("div");
        d.className = "dot eaten";
        wrap.appendChild(d);
      } else if(i === st.matchIndex){
        const pac = document.createElement("div");
        pac.className = "pac";
        wrap.appendChild(pac);
      } else {
        const d = document.createElement("div");
        d.className = "dot";
        wrap.appendChild(d);
      }
    }
  }

  function renderPoolPanel(key){
    const st = dbState[key];
    const wrap = $("pool-panel");
    wrap.innerHTML = "";
    st.participants.forEach(name=>{
      const inPool = st.pool.includes(name);
      const chip = document.createElement("div");
      chip.className = "chip" + (inPool ? "" : " used");
      chip.textContent = name;
      wrap.appendChild(chip);
    });
  }

  function renderCompletedList(key){
    const st = dbState[key];
    const wrap = $("completed-list");
    wrap.innerHTML = "";
    if(st.matches.length===0){
      wrap.innerHTML = `<div class="foot-note">No matches confirmed yet.</div>`;
      return;
    }
    st.matches.forEach((m,i)=>{
      const item = document.createElement("div");
      item.className = "completed-item";
      item.innerHTML = `<span>MATCH ${String(i+1).padStart(2,"0")}</span><span><b>${m[0]}</b> vs <b>${m[1]}</b></span>`;
      wrap.appendChild(item);
    });
  }

  function renderDraw(key){
    const sport = SPORTS[key];
    const st = dbState[key];
    $("draw-sport-label").textContent = sport.label.toUpperCase();
    $("draw-round-label").textContent = sport.roundName;
    $("match-count").textContent = `MATCH ${Math.min(st.matchIndex+1, totalMatches(key))} / ${totalMatches(key)}`;
    if(isAdmin) resetSlots();
    renderDotTrail(key);
    renderPoolPanel(key);
    renderCompletedList(key);
    if(isAdmin){
      $("btn-spin").disabled = false;
      $("btn-spin").textContent = "🎲 SPIN / DRAW";
    }
    const viewerStatus = $("viewer-draw-status");
    if(st.liveDrawing){
      viewerStatus.innerHTML = `<div class="pulse-dot"></div> 🎲 LIVE — drawing match ${st.matchIndex+1} now…`;
    } else {
      viewerStatus.innerHTML = `⏳ Waiting for the next match to be drawn…`;
    }
  }

  function resetSlots(){
    ["a","b"].forEach(s=>{
      const slot = $("slot-"+s);
      slot.classList.remove("spinning","locked");
      $("slot-"+s+"-val").textContent = "— · — · —";
    });
  }

  function spinSlot(slotLetter, candidates, onDone){
    const slot = $("slot-"+slotLetter);
    const valEl = $("slot-"+slotLetter+"-val");
    slot.classList.add("spinning");
    slot.classList.remove("locked");
    let ticks = 0;
    const totalTicks = 16 + secureRandomInt(6);
    const interval = setInterval(()=>{
      const {value} = pickRandomFrom(candidates);
      valEl.textContent = value;
      sfxTick();
      ticks++;
      if(ticks >= totalTicks){
        clearInterval(interval);
        const final = pickRandomFrom(candidates);
        valEl.textContent = final.value;
        slot.classList.remove("spinning");
        slot.classList.add("locked");
        sfxLock();
        onDone(final.value, final.index);
      }
    }, 70);
  }

  $("btn-spin").addEventListener("click", ()=>{
    if(!isAdmin || spinLock) return;
    const key = currentSportKey;
    const st = dbState[key];
    if(st.pool.length < 2) return;
    spinLock = true;
    $("btn-spin").disabled = true;
    resetSlots();
    writeSportState(key, { liveDrawing:true });

    spinSlot("a", st.pool, (valueA, idxA)=>{
      const remaining = st.pool.filter((_,i)=> i!==idxA);
      spinSlot("b", remaining, (valueB)=>{
        const newPool = st.pool.filter(n=> n!==valueA && n!==valueB);
        const newMatches = [...st.matches, [valueA, valueB]];
        const newIndex = st.matchIndex + 1;

        const update = { pool:newPool, matches:newMatches, matchIndex:newIndex, liveDrawing:false };
        if(newPool.length === 0){
          update.done = true;
          update.stage = "results";
          update.rounds = [ newMatches.map(m=>({a:m[0], b:m[1], winner:null})) ];
        }
        Object.assign(st, update); // keep local mirror in sync immediately for the admin
        writeSportState(key, update);

        setTimeout(()=>{
          if(newPool.length === 0){
            sfxFanfare();
            renderResults(key);
            showScreen("screen-results");
          } else {
            $("match-count").textContent = `MATCH ${newIndex+1} / ${totalMatches(key)}`;
            resetSlots();
            $("btn-spin").disabled = false;
          }
          spinLock = false;
        }, 900);
      });
    });
  });

  /* ---------------- RESULTS ---------------- */
  function renderResults(key){
    const sport = SPORTS[key];
    const st = dbState[key];
    $("results-sport-label").textContent = sport.label.toUpperCase();
    $("results-round-label").textContent = sport.roundName + " · LIVE DRAW RESULT";
    const grid = $("results-grid");
    grid.innerHTML = "";
    st.matches.forEach((m,i)=>{
      const card = document.createElement("div");
      card.className = "match-card";
      card.innerHTML = `
        <div class="mno">MATCH ${String(i+1).padStart(2,"0")}</div>
        <div class="row">
          <div class="team">${m[0]}</div>
          <div class="vsx">VS</div>
          <div class="team" style="text-align:right;">${m[1]}</div>
        </div>`;
      grid.appendChild(card);
    });
    renderBracket(key);
  }

  /* ---------------- BRACKET PROGRESSION (round 2 through the Final) ---------------- */
  function roundNameForCount(matchCount){
    if(matchCount === 1) return "FINAL";
    if(matchCount === 2) return "SEMI FINALS";
    if(matchCount === 4) return "QUARTER FINALS";
    if(matchCount === 8) return "ROUND OF 16";
    if(matchCount === 16) return "ROUND OF 32";
    return "ROUND OF " + (matchCount*2);
  }

  function renderBracket(key){
    const st = dbState[key];
    const container = $("bracket-container");
    container.innerHTML = "";

    st.rounds.forEach((round, rIdx)=>{
      const section = document.createElement("div");
      section.className = "round-section" + (round.length===1 ? " final" : "");
      const label = document.createElement("div");
      label.className = "round-label";
      label.textContent = roundNameForCount(round.length) + (round.length===1 ? " 🏆" : "");
      section.appendChild(label);

      const roundGrid = document.createElement("div");
      roundGrid.className = "round-grid";

      round.forEach((match, mIdx)=>{
        const card = document.createElement("div");
        card.className = "pick-card" + (match.winner ? " decided" : "");
        const mno = document.createElement("div");
        mno.className = "mno";
        mno.textContent = "MATCH " + String(mIdx+1).padStart(2,"0");
        card.appendChild(mno);

        if(match.winner){
          const row = document.createElement("div");
          row.className = "decided-row";
          const teamAEl = document.createElement("div");
          teamAEl.className = "decided-team " + (match.winner===match.a ? "winner" : "loser");
          teamAEl.innerHTML = match.a + (match.winner===match.a ? '<span class="wtag">WINNER →</span>' : "");
          const vsEl = document.createElement("div");
          vsEl.className = "decided-vs";
          vsEl.textContent = "VS";
          const teamBEl = document.createElement("div");
          teamBEl.className = "decided-team " + (match.winner===match.b ? "winner" : "loser");
          teamBEl.style.textAlign = "right";
          teamBEl.innerHTML = match.b + (match.winner===match.b ? '<span class="wtag">WINNER →</span>' : "");
          row.appendChild(teamAEl); row.appendChild(vsEl); row.appendChild(teamBEl);
          card.appendChild(row);
        } else if(isAdmin){
          const pickRow = document.createElement("div");
          pickRow.className = "pick-row";
          [match.a, match.b].forEach(name=>{
            const btn = document.createElement("button");
            btn.className = "pick-btn";
            btn.innerHTML = `<span>${name}</span><span class="chevron">MARK WINNER →</span>`;
            btn.addEventListener("click", ()=> selectWinner(key, rIdx, mIdx, name));
            pickRow.appendChild(btn);
          });
          const vsTag = document.createElement("div");
          vsTag.className = "pick-vs";
          vsTag.textContent = "VS";
          pickRow.insertBefore(vsTag, pickRow.children[1]);
          card.appendChild(pickRow);
        } else {
          const row = document.createElement("div");
          row.className = "decided-row";
          row.innerHTML = `
            <div class="decided-team">${match.a}</div>
            <div class="decided-vs">VS</div>
            <div class="decided-team" style="text-align:right;">${match.b}</div>`;
          card.appendChild(row);
          const waiting = document.createElement("div");
          waiting.className = "foot-note";
          waiting.style.marginTop = "10px";
          waiting.textContent = "⏳ Waiting for the admin to confirm the winner";
          card.appendChild(waiting);
        }
        roundGrid.appendChild(card);
      });

      section.appendChild(roundGrid);
      container.appendChild(section);
    });

    if(st.champion){
      $("champion-banner").style.display = "block";
      $("champion-name").textContent = st.champion;
    } else {
      $("champion-banner").style.display = "none";
    }
  }

  function selectWinner(key, roundIdx, matchIdx, teamName){
    if(!isAdmin) return;
    const st = dbState[key];
    const rounds = st.rounds.map(r=> r.map(m=> ({...m})));
    const round = rounds[roundIdx];
    if(round[matchIdx].winner) return;
    round[matchIdx].winner = teamName;
    sfxLock();

    let champion = st.champion;
    const allDecided = round.every(m=> m.winner);
    if(allDecided){
      if(round.length === 1){
        champion = round[0].winner;
        sfxFanfare();
      } else if(roundIdx === rounds.length - 1){
        const winners = round.map(m=> m.winner);
        const nextRound = [];
        for(let i=0; i<winners.length; i+=2){
          nextRound.push({ a:winners[i], b:winners[i+1], winner:null });
        }
        rounds.push(nextRound);
      }
    }
    st.rounds = rounds;
    st.champion = champion;
    writeSportState(key, { rounds, champion });
    renderBracket(key);
  }

  /* ---------------- RESET (with modal confirm, admin only) ---------------- */
  let resetTargetKey = null;
  function askReset(key){
    if(!isAdmin) return;
    resetTargetKey = key;
    $("modal-reset-text").textContent =
      `This will permanently erase the current draw for ${SPORTS[key].label}, including every confirmed match. This cannot be undone. Continue?`;
    $("modal-reset").classList.add("active");
  }
  $("btn-reset-results").addEventListener("click", ()=> askReset(currentSportKey));
  $("modal-cancel").addEventListener("click", ()=> $("modal-reset").classList.remove("active"));
  $("modal-confirm").addEventListener("click", ()=>{
    const key = resetTargetKey;
    setSportState(key, defaultSportState(key));
    $("modal-reset").classList.remove("active");
    currentSportKey = key;
    draftParticipants[key] = [...SPORTS[key].defaults];
    renderSetup(key);
    showScreen("screen-setup");
  });

  /* ---------------- boot ---------------- */
  isAdmin = localStorage.getItem("ieee_draw_admin") === "1";
  updateRoleBadge();
  renderHome();
  initFirebase();
})();
