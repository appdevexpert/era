// HTML recreations of ERA app screens (393x852 points), built from the RN source specs.
// Usage: Screens.mount('view-id', 'home') fills <div class="view" id="view-id"> with that screen.
(function () {
  const A = '../../assets';
  const ring = (id, size, r, stroke, dash) => `
    <svg width="${size}" height="${size}"><defs><linearGradient id="g-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FCF3C0"/><stop offset=".35" stop-color="#F7E06F"/><stop offset=".7" stop-color="#C9A84C"/><stop offset="1" stop-color="#8B7332"/></linearGradient></defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="rgba(201,168,76,.18)" stroke-width="${stroke}" fill="none"/>
      <circle id="${id}" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="url(#g-${id})" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${dash}"/></svg>`;

  const logHeader = (name, eyebrow, prog = '3/6 Exercises', setsRow = true, timeId = '') => `
    <div class="hdr">
      <div class="nav"><img src="${A}/icons/arrow-back.svg"><span class="eyebrow">${prog}</span></div>
      <div class="info">
        <div><div class="eyebrow">${eyebrow}</div><div class="name">${name}</div></div>
        <div class="timer"><b ${timeId ? `id="${timeId}"` : ''}>04:12</b><span>Session Time</span></div>
      </div>
      ${setsRow ? `<div class="sets"><div class="bars"><div class="row"><div class="bar"><i style="width:100%"></i></div><div class="bar"><i style="width:35%"></i></div><div class="bar"><i></i></div></div>
        <div class="lbl"><span>SET 1</span><span class="on">SET 2</span><span>SET 3</span></div></div><div class="plus">+</div></div>` : ''}
    </div>`;

  // simple gold duotone tab icons
  const ic = {
    home: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="#C9A84C" fill-opacity=".65"/><path d="M9 21v-6h6v6" fill="#F7CE45"/></svg>',
    dumbbell: '<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="9" width="3" height="6" rx="1" fill="#C9A84C" fill-opacity=".65"/><rect x="5" y="6.5" width="3.2" height="11" rx="1.2" fill="#F7CE45"/><rect x="8.2" y="11" width="7.6" height="2" fill="#C9A84C" fill-opacity=".65"/><rect x="15.8" y="6.5" width="3.2" height="11" rx="1.2" fill="#F7CE45"/><rect x="19" y="9" width="3" height="6" rx="1" fill="#C9A84C" fill-opacity=".65"/></svg>',
    lunch: '<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="12" r="9" fill="#C9A84C" fill-opacity=".65"/><circle cx="12" cy="12" r="5" fill="#F7CE45"/></svg>',
    chart: '<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="12" width="4" height="9" rx="1" fill="#C9A84C" fill-opacity=".65"/><rect x="10" y="7" width="4" height="14" rx="1" fill="#F7CE45"/><rect x="17" y="3" width="4" height="18" rx="1" fill="#C9A84C" fill-opacity=".65"/></svg>',
  };
  const tabbar = active => {
    const tabs = [['home', 'Workout'], ['dumbbell', 'Weights'], ['lunch', 'Nutrition'], ['chart', 'Progress']];
    return `<div class="tabbar">${tabs.map(([k, l]) => k === active
      ? `<div class="tab on">${ic[k].replace(/28/g, '24')}<span>${l}</span></div>`
      : `<div class="tab">${ic[k]}</div>`).join('')}</div>`;
  };
  const avatar = (l, s = 48, border = '') => `<div class="avatar" style="width:${s}px;height:${s}px;font-size:${s * .42}px;${border ? `border:1.5px solid ${border}` : ''}">${l}</div>`;
  const pill = (day, date, st) => `<div class="dpill ${st}"><span>${day}</span><b>${st === 'done' ? '✓' : st === 'miss' ? '✕' : date}</b></div>`;

  const T = {
    home: () => `
      <div style="position:absolute;inset:0;padding:75px 20px 0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:-8px">
          <div style="font-size:20px;font-weight:500;color:rgba(240,240,240,.6)">Hi, <span style="color:rgba(240,240,240,.9)">Alex</span></div>${avatar('A')}
        </div>
        <div class="disp" style="font-size:40px;line-height:48px;width:250px;color:rgba(240,240,240,.85);margin-bottom:20px">Ready to train today?</div>
        <div class="chips">
          <div class="chip" style="background:rgba(201,168,76,.25)"><span class="cic" style="background:rgba(255,255,255,.15)"><img src="${A}/icons/stat-coin.svg" style="width:24px"></span>340 pts</div>
          <div class="chip" style="background:linear-gradient(90deg,rgba(221,62,68,.08),rgba(247,224,111,.08))"><span class="cic" style="background:rgba(224,85,85,.1)"><img src="${A}/icons/stat-fire.svg" style="width:32px"></span>5D streak</div>
          <div class="chip" style="background:linear-gradient(90deg,rgba(4,95,16,.3),rgba(225,182,0,.3))"><img src="${A}/icons/stat-workout-plan.svg" style="width:32px">Workout Plan</div>
        </div>
        <div class="week">${pill('Mon', '05', 'today')}${pill('Tue', '06', 'fut')}${pill('Wed', '07', 'fut')}${pill('Thu', '08', 'fut')}${pill('Fri', '09', 'fut')}${pill('Sat', '10', 'fut')}${pill('Sun', '11', 'fut')}</div>
        <div class="wcard">
          <img src="${A}/images/workoutcard.png" class="wbg">
          <div class="wtop">
            <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:16px;font-weight:500">Today's Workout</span>
              <span style="display:flex;gap:14px;font-size:14px;font-weight:500"><span><img src="${A}/icons/stat-stretching.svg" style="width:14px;vertical-align:-2px"> 6</span><span><img src="${A}/icons/stat-stopwatch.svg" style="width:14px;vertical-align:-2px"> 75min</span></span></div>
            <div class="disp" style="font-size:40px;line-height:48px">Push - Heavy</div>
            <div style="display:flex;gap:8px">${['Chest', 'Triceps', 'Shoulders', 'Core'].map(x => `<span class="tag">${x}</span>`).join('')}</div>
          </div>
          <div class="wbl">
            <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.6" stroke="rgba(255,255,255,.4)" stroke-width="4.7" fill="none"/><path d="M18 2.4 A15.6 15.6 0 0 1 31.5 10.2" stroke="#fff" stroke-width="4.7" fill="none" stroke-linecap="round"/><rect x="11" y="16.5" width="14" height="3" rx="1" fill="#fff"/></svg>
            <div><div style="font-size:16px;font-weight:700">HYPERTROPHY</div><div style="font-size:12px;font-weight:600;color:rgba(240,240,240,.6);margin-top:4px">Week 1/12 • Day 1</div></div>
          </div>
          <div class="wstart">Start</div>
        </div>
      </div>${tabbar('home')}`,

    exlist: () => {
      const row = (n, line, w) => `<div class="exrow"><div class="handle"><i></i><i></i><i></i><i></i></div><div style="flex:1;min-width:0;padding:12px 0;display:flex;flex-direction:column;gap:8px"><div class="exn">${n}</div><div class="eyebrow">${line}</div></div>${w ? `<div style="text-align:right;display:flex;flex-direction:column;gap:8px"><span style="font-size:12px;color:rgba(240,240,240,.8)">INITIAL WT.</span><span style="font-size:20px;font-weight:500">${w}</span></div>` : ''}</div>`;
      const sec = t => `<div class="sech"><i></i><span>${t}</span><i></i></div>`;
      return `
      <div class="exbody" id="exscroll">
        <div class="stats"><div><b style="font-size:20px">6</b><span class="eyebrow" style="color:rgba(240,240,240,.6)">Exercises</span></div><div><b style="font-size:20px">75</b><span class="eyebrow" style="color:rgba(240,240,240,.6)">Minutes</span></div></div>
        ${sec('Exercises')}
        ${row('Incline Dumbbell Press', '3 Sets • 6-8 Reps', '32 kg')}
        ${row('Smith Machine Incline Bench Press', '3 Sets • 6-8 Reps', '70 kg')}
        ${row('Bench Press', '3 Sets • 6-8 Reps', '80 kg')}
        ${row('Overhead Press', '3 Sets • 6 Reps', '50 kg')}
        ${row('Rope Pushdown', '3 Sets • 10-12 Reps', '30 kg')}
        ${row('Skull Crushers', '3 Sets • 10-12 Reps', '35 kg')}
        ${sec('Finisher')}
        ${row('Leg Raises', '3 Sets • 15-20 Reps', '')}
        ${row('Cable Crunch', '3 Sets • 15-20 Reps', '40 kg')}
        ${sec('Treadmill Walk')}
        ${row('Incline Walk', '20 min', '')}
      </div>
      <div class="phdr">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div><img src="${A}/icons/arrow-back.svg" style="width:24px;height:24px"><div class="disp" style="font-size:28px;line-height:33.6px;margin-top:16px">Push - Heavy</div><div class="eyebrow" style="margin-top:6px">Week 1 • Day 1</div></div>
          <div class="mgrid">${['chest', 'arm', 'shoulders', 'abs'].map(m => `<span><img src="${A}/icons/focus-muscle-${m}.svg"></span>`).join('')}</div>
        </div>
      </div>
      <div class="fade" style="background:linear-gradient(180deg,rgba(10,10,10,0),rgba(10,10,10,.92) 58%)"></div>
      <div class="btn-gold" style="position:absolute;left:18px;right:18px;bottom:46px;height:56px;z-index:12">Start Now</div>`;
    },

    infosheet: () => `
      <div class="sbd"></div>
      <div class="isheet">
        <div class="handle2"></div>
        <div class="disp" style="font-size:22px;line-height:26.4px">Bench Press</div>
        <div class="eyebrow" style="margin-top:12px">Chest • Compound</div>
        <div style="display:flex;gap:12px;margin-top:24px">
          <div class="itile"><b>3</b><span>SETS</span></div><div class="itile"><b>6-8</b><span>REPS</span></div><div class="itile"><b>80 kg</b><span>INITIAL WT.</span></div>
        </div>
        <div style="margin-top:24px;font-size:12px;color:rgba(255,255,255,.4)">FORM DETAIL</div>
        <div style="margin-top:8px;font-size:16px;line-height:22.4px">Squeeze your shoulder blades together and keep your feet planted. Lower the bar to mid-chest with control, then press up and slightly back until your arms are straight.</div>
      </div>`,

    count: () => `
      <img class="bg" src="${A}/images/workout-countdown-bg.png" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(0,0,0,.85) 85%)"></div>
      <div style="position:absolute;left:24px;right:24px;bottom:58px;display:flex;align-items:center;gap:18px">
        <div style="flex:1;display:flex;flex-direction:column;gap:8px"><div class="eyebrow">Week 1 • Day 1</div><div class="disp" style="font-size:32px;line-height:38.4px">Push - Heavy</div><div style="font-size:20px;font-weight:500">Incline Dumbbell Press starting in</div></div>
        <div class="ring" style="width:92px;height:92px">${ring('cring', 92, 44.5, 3, 279.6)}<div class="mid"><span id="cnum" style="font-size:36px;font-weight:500">3</span></div></div>
      </div>`,

    log: () => `
      <div class="body">
        <div class="stats"><div><b>30 kg x 8 Reps</b><span class="eyebrow">Last Set</span></div><div><b>32 kg x 8 Reps</b><span class="eyebrow">Best Set</span></div></div>
        <div class="ruler"><div class="rtitle">Next set: 32 kg</div><div class="rval">32 kg</div>
          <div class="rarea"><div class="ticks">${Array.from({ length: 80 }, (_, i) => `<i style="left:${i * 18}px;height:${i % 10 ? i % 5 ? 10 : 18 : 26}px;background:rgba(240,240,240,${i % 10 ? i % 5 ? .2 : .35 : .55})"></i>`).join('')}</div><div class="rind"></div></div></div>
        <div class="reps"><div class="rtitle">Reps</div><div class="rpick"><div class="rhl"></div><div class="rnums" style="transform:translateX(${196.5 - 28 - 7 * 70}px)">${Array.from({ length: 12 }, (_, i) => { const d = Math.abs(i - 7); return `<span style="left:${i * 70}px;color:${d ? '#F0F0F0' : '#C9A84C'};opacity:${[1, .25, .1, .04][Math.min(d, 3)]}">${i + 1}</span>`; }).join('')}</div></div></div>
        <div class="fb"><h4>How did the set feel?</h4><p>Weight for the next set will be adjusted accordingly.</p>
          <div class="fbrow"><div class="fbc">Light Weight<img src="${A}/icons/feedback-light.svg"></div><div class="fbc" style="border-color:#C9A84C">Correct Weight<img src="${A}/icons/feedback-correct.svg"></div><div class="fbc">Felt Heavy<img src="${A}/icons/feedback-heavy.svg"></div></div></div>
      </div>
      ${logHeader('Incline Dumbbell Press', 'Compound', '1/6 Exercises')}
      <div class="fade"></div>
      <div class="bbar"><div class="btn-gold">Complete Set</div><div class="circ gold-grad"><img src="${A}/icons/skip-next.svg"></div></div>`,

    rest: () => `
      <div class="eyebrow" style="font-size:14px;letter-spacing:.56px;text-align:center;margin-top:71px">1/6 Exercises</div>
      <div style="position:absolute;left:0;right:0;top:160px;display:flex;flex-direction:column;align-items:center;gap:36px">
        <div style="text-align:center"><div class="disp" style="font-size:28px">Rest Timer</div><div style="font-size:20px;color:rgba(240,240,240,.6);margin-top:12px">Set 3 starting in...</div></div>
        <div class="ring" style="width:260px;height:260px">${ring('rring', 260, 120, 20, 754)}<div class="mid" style="gap:8px"><span id="rnum" style="font-size:76px;font-weight:500;line-height:1">90</span><span style="font-size:20px;font-weight:500;color:rgba(255,255,255,.6)">Seconds</span></div></div>
        <div class="pill">+ 30 sec</div>
      </div>
      <div class="upnext"><div style="flex:1;display:flex;flex-direction:column;gap:8px"><span style="font-size:14px;color:rgba(240,240,240,.6)">Up Next</span><span class="disp" style="font-size:20px">Incline Dumbbell Press</span><span class="eyebrow" style="font-size:14px;letter-spacing:.56px">3/3 Set</span></div>
        <div class="chev"><img src="${A}/icons/chevron-back.svg" style="width:20px;height:20px;transform:rotate(180deg)"></div></div>`,

    timer: () => `
      <div class="body" style="top:255px">
        <div class="stats"><div><b>01:00</b><span class="eyebrow">Ideal Set</span></div><div><b>01:15</b><span class="eyebrow">Top Set</span></div></div>
        <div id="sw" style="padding:60px 0;text-align:center;font-size:80px;font-weight:100;letter-spacing:-.8px;font-variant-numeric:tabular-nums">00:00.00</div>
        <div style="display:flex;justify-content:space-between;padding:0 8px">
          <div class="rc" style="background:#111;border:1px solid #1E1E1E;color:rgba(240,240,240,.6)">Reset</div>
          <div class="rc" style="background:rgba(140,60,60,.4);color:#E67777">Stop</div>
        </div>
      </div>
      ${logHeader('Plank', 'Core', '8/9 Exercises')}
      <div class="fade"></div>
      <div class="bbar"><div class="btn-gold">Complete Set</div><div class="circ gold-grad"><img src="${A}/icons/skip-next.svg"></div></div>`,

    cardio: () => `
      <div class="body" style="top:205px">
        <div class="stats"><div><b>20:00</b><span class="eyebrow">Ideal Set</span></div><div><b>22:30</b><span class="eyebrow">Top Set</span></div></div>
        <div style="padding:40px 0;display:flex;justify-content:center"><div class="ring" style="width:260px;height:260px">${ring('kring', 260, 120, 20, 754)}<div class="mid"><span id="knum" style="font-size:56px;font-weight:500;font-variant-numeric:tabular-nums">20:00</span></div></div></div>
        <div style="display:flex;justify-content:space-between;padding:0 8px">
          <div class="rc" style="background:#111;border:1px solid #1E1E1E;color:rgba(240,240,240,.6)">Cancel</div>
          <div class="rc" style="background:rgba(140,60,60,.4);color:#E67777">Stop</div>
        </div>
      </div>
      ${logHeader('Incline Walk', 'Cardio', '9/9 Exercises', false)}
      <div class="fade"></div>
      <div class="btn-soft" style="position:absolute;left:16px;right:16px;bottom:46px;z-index:12">Complete Session</div>`,

    done: (pts = '+420', sets = '18') => `
      <div class="topgrad"></div><img class="tr" src="${A}/images/trophy.png">
      <div style="position:absolute;left:20px;right:20px;top:367px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px"><div class="disp" style="font-size:32px;line-height:38.4px">Session Complete</div><span class="eyebrow">Push Heavy • Week 1 • Day 1</span></div>
      <div class="grid" style="position:absolute;left:20px;right:20px;top:450px">
        <div><span class="eyebrow">Session Duration</span><b class="dd1">68:12</b></div><div><span class="eyebrow">Sets Logged</span><b class="dd2">${sets}</b></div>
        <div><span class="eyebrow">ERA Points</span><b class="dd3">${pts}</b></div><div><span class="eyebrow">New PRs</span><b class="dd4">1</b></div></div>
      <div style="position:absolute;left:20px;right:20px;bottom:50px;display:flex;flex-direction:column;gap:12px"><div class="glassbtn"><img src="${A}/icons/camera.svg" style="width:24px;height:24px">Capture Progress</div><div class="btn-soft">Continue</div></div>`,

    getstarted: () => `
      <img src="${A}/images/intro-bg.png" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:right bottom">
      <div style="position:absolute;top:153px;left:0;right:0;text-align:center;font-family:Playfair;font-size:101px;line-height:110px;background:linear-gradient(180deg,#DAA520,#DA9620);-webkit-background-clip:text;background-clip:text;color:transparent">ERA</div>
      <div class="slide"><img id="knob" src="${A}/images/get.png"><span>Get started</span></div>`,

    goal: () => {
      const g = (t, d, i, id) => `<div class="ocard" id="${id}"><div><div style="font-size:18px;font-weight:500;line-height:22px">${t}</div><div style="font-size:14px;line-height:18.2px;color:rgba(240,240,240,.5);margin-top:6px">${d}</div></div><img src="${A}/icons/${i}.svg" style="width:28px;align-self:flex-end"></div>`;
      return `<img src="${A}/images/onboarding.png" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
      <div style="position:absolute;inset:0;padding:67px 24px 0">
        <div style="display:flex;align-items:center;gap:24px"><span class="obk"><img src="${A}/icons/chevron-back.svg" style="width:20px"></span><div style="flex:1;height:6px;border-radius:100px;background:rgba(240,240,240,.08)"><div style="width:50%;height:100%;border-radius:100px;background:linear-gradient(90deg,#C9A84C,#F7E06F,#FCF3C0)"></div></div><span style="font-size:15px;font-weight:600;width:32px">4/8</span></div>
        <div style="margin-top:24px;display:flex;flex-direction:column;gap:8px"><span class="eyebrow">Primary Goal</span><span class="disp" style="font-size:24px">What drives you?</span><span style="font-size:14px;line-height:24px;color:rgba(240,240,240,.5)">We build everything around your goal.</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:24px;justify-content:space-between">
          ${g('Build Muscle', 'Mass, size, and strength combined', 'goal-build-muscle', 'og1')}${g('Lose Fat', 'Lean out while keeping muscle', 'goal-lose-fat', 'og2')}
          ${g('Get Stronger', 'Raw power, compound focus', 'goal-get-stronger', 'og3')}${g('General Fitness', 'Health, energy, and consistency', 'goal-general-fitness', 'og4')}
        </div>
      </div>
      <div class="btn-gold" style="position:absolute;left:24px;right:24px;bottom:50px;height:56px">Next</div>`;
    },

    plangen: () => {
      const steps = ['Analysing your Training Level', 'Creating Tailored Program for you', 'Building your 12 week Structure', 'Calculating Your Starting Weights', 'Preparing Your Diet Plan', 'Your ERA Program is Ready'];
      return `<img src="${A}/images/onboarding.png" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
      <div style="position:absolute;inset:0;padding:119px 32px 0">
        <div class="disp" style="font-size:26px;line-height:36px;margin-bottom:22px">Your Journey to a Stronger, Healthier You<br><span style="color:#C9A84C;font-weight:600">Starts Here.</span></div>
        <div id="pgpct" style="font-size:56px;font-weight:700;font-variant-numeric:tabular-nums">0%</div>
        <div style="font-size:14px;line-height:22px;margin:8px 0 24px">Our personalized plan is on the way, tailored to your fitness journey.</div>
        <div style="height:6px;border-radius:3px;background:rgba(240,240,240,.12);margin-bottom:32px"><div id="pgbar" style="height:100%;width:0;border-radius:3px;background:linear-gradient(90deg,#C9A84C,#F7E06F,#FCF3C0)"></div></div>
        <div style="display:flex;flex-direction:column;gap:24px">${steps.map((s, i) => `<div class="pgrow" id="pg${i}"><span class="pgic" id="pgi${i}"></span>${s}</div>`).join('')}</div>
      </div>
      <div style="position:absolute;bottom:74px;left:0;right:0;text-align:center;font-size:14px;font-weight:500">Estimated Time <span id="pgt" style="color:#C9A84C">01:32</span></div>`;
    },

    progress: () => `
      <div style="position:absolute;inset:0;padding:75px 16px 0;display:flex;flex-direction:column;gap:32px">
        <div style="display:flex;justify-content:space-between;align-items:center"><div><div class="disp" style="font-size:40px;line-height:48px;color:rgba(240,240,240,.85)">Progress</div><div class="eyebrow" style="margin-top:8px">Track how you're improving</div></div>${avatar('A')}</div>
        <div class="pstats"><img src="${A}/images/progress-stats-bg.png"><div class="ov"></div>
          <div style="position:relative;display:flex;flex-direction:column;gap:12px">
            <div class="disp" style="font-size:20px">Your Progress</div>
            <div style="display:flex;gap:12px"><div class="ptile"><b id="pv1">24</b><span>Workouts</span><i>↗</i></div><div class="ptile"><b id="pv2">5,840</b><span>ERA Points</span><i>↗</i></div></div>
            <div class="ptile" style="min-height:84px"><b id="pv3">48,230</b><span>Lifetime Volume</span><i>↗</i></div>
          </div></div>
        <div class="lbcard"><div class="disp" style="font-size:20px">Leaderboard</div><div class="eyebrow" style="margin-top:8px">See how you rank this week</div><img src="${A}/images/leaderboard-trophy.png" class="lbt"><img src="${A}/icons/leaderboard-chevron.svg" class="lbc"></div>
        <div><div class="disp" style="font-size:20px;margin-bottom:16px">History</div>
          <div class="card" style="border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:18px">
            <div><div style="display:flex;align-items:center;gap:8px"><img src="${A}/icons/icon-flag.svg" style="width:20px"><div class="seg"><i style="width:100%"></i></div><div class="seg"><i style="width:50%"></i></div><div class="seg"><i style="width:0"></i></div><img src="${A}/icons/medal-badge.svg" style="width:20px"></div>
              <div style="display:flex;gap:10px;padding:10px 28px 0;font-size:10px;letter-spacing:.4px"><span style="flex:1;text-align:center;color:rgba(240,240,240,.6)">HYPERTROPHY</span><span style="flex:1;text-align:center;color:#C9A84C">STRENGTH</span><span style="flex:1;text-align:center;color:rgba(240,240,240,.6)">PEAK</span></div></div>
            <div style="height:1px;background:rgba(240,240,240,.1)"></div>
            <div style="display:flex;justify-content:space-between"><div><div class="eyebrow">Day Streak</div><div style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:16px;font-weight:600"><img src="${A}/icons/fire-gold.svg" style="width:20px">07</div></div><div style="text-align:right"><div class="eyebrow">Personal Best</div><div style="margin-top:8px;font-size:16px;font-weight:600">12 days</div></div></div>
          </div></div>
      </div>${tabbar('chart')}`,

    leaderboard: () => {
      const col = (rank, name, pts, w, h, grad, cap, border, pc, tro, sz) => `<div class="pcol" style="width:${w}px">
          <div style="position:relative">${avatar(name[0], 80, border)}<img src="${A}/images/trophy-${tro}.png" style="position:absolute;right:-6px;bottom:-4px;width:36px"></div>
          <div class="disp" style="font-size:20px;margin-top:10px">${name}</div><div style="font-size:14px;font-weight:600;color:${pc};margin:4px 0 10px">${pts} pts</div>
          <div style="width:100%;height:32px;background:${cap};clip-path:polygon(12% 0,88% 0,100% 100%,0 100%)"></div>
          <div style="width:100%;height:${h}px;background:linear-gradient(180deg,${grad});display:flex;align-items:flex-start;justify-content:center;padding-top:22px;font-size:${sz}px;font-weight:500">${rank}</div></div>`;
      const row = (r, n, p, you) => `<div class="lrow${you ? ' you' : ''}"><span style="width:36px;color:#C9A84C;font-size:18px;letter-spacing:.72px">#${r}</span>${avatar(n[0], 52)}<span class="disp" style="flex:1;font-size:20px">${n}</span><span style="font-size:16px;color:rgba(240,240,240,.5)">${p} PTS</span>${you ? '<em>YOU</em>' : ''}</div>`;
      return `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(201,168,76,.18),transparent 60%)"></div>
      <div class="phdr" style="padding-bottom:20px"><img src="${A}/icons/profile-back-chevron.svg" style="width:24px;height:24px"><div class="eyebrow" style="margin-top:16px">#4</div><div class="disp" style="font-size:28px;line-height:33.6px;margin-top:6px">Leaderboard</div></div>
      <div style="position:absolute;left:0;right:0;top:205px;display:flex;justify-content:center;align-items:flex-end;gap:4px">
        ${col('2<sup>nd</sup>', 'Jonas', '6,920', 115, 163, '#979797,#3F3F3F', '#525252', '#F0F0F0', 'rgba(255,255,255,.6)', 'silver', 28)}
        ${col('1<sup>st</sup>', 'Mia', '7,450', 140, 204, '#C9A84C,#5E4B15', '#876B1D', '#C9A84C', '#C9A84C', 'gold', 40)}
        ${col('3<sup>rd</sup>', 'Erik', '6,310', 115, 139, 'rgba(173,88,30,.8),rgba(89,43,12,.8)', '#43210B', '#E67777', '#DB6F6F', 'bronze', 24)}
      </div>
      <div class="lsheet"><div class="handle2"></div>${row(4, 'Alex', '5,840', true)}${row(5, 'Sara', '5,515')}${row(6, 'Ola', '4,980')}${row(7, 'Ingrid', '4,610')}</div>`;
    },

    nutrition: () => {
      const segs = Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (1 - i / 10); const x = 110 + 92 * Math.cos(a), y = 110 - 92 * Math.sin(a); return `<rect class="nseg" data-i="${i}" x="${x - 6}" y="${y - 14}" width="12" height="28" rx="6" transform="rotate(${90 - i * 18} ${x} ${y})" fill="url(#ng)"/>`; }).join('');
      const mac = (l, ic, v, left) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px"><span class="eyebrow">${l}</span><div class="mring"><img src="${A}/icons/${ic}.svg" style="width:16px"><b>${v}</b></div><span style="font-size:12px;font-weight:500;color:rgba(240,240,240,.5)">${left}</span></div>`;
      return `<div style="position:absolute;inset:0;padding:75px 16px 0;display:flex;flex-direction:column;gap:24px">
        <div style="display:flex;justify-content:space-between;align-items:center"><div><div class="disp" style="font-size:40px;line-height:48px;color:rgba(240,240,240,.85)">Nutrition</div><div class="eyebrow" style="margin-top:8px">Fuel your performance</div></div>${avatar('A')}</div>
        <div style="display:flex;justify-content:space-between;align-items:center"><div><div class="disp" style="font-size:20px">Build Muscle</div><div class="eyebrow" style="font-size:10px;margin-top:4px">Nutrition Goal</div></div>
          <div style="display:flex;align-items:center;gap:12px"><span class="obk" style="color:#C9A84C">‹</span><div style="text-align:center"><div style="color:#C9A84C;font-size:12px;font-weight:600">1/12</div><div style="font-size:10px;color:rgba(240,240,240,.7)">WEEK</div></div><span class="obk" style="color:#C9A84C">›</span></div></div>
        <div><div class="disp" style="font-size:20px;margin-bottom:16px">Daily Targets</div>
          <div class="card" style="border-width:1.5px;border-radius:24px;padding:16px 16px 20px">
            <div style="font-size:13px;font-weight:500;color:rgba(240,240,240,.5)">Target <span style="color:#C9A84C;font-weight:600">2,800kCal</span></div>
            <div style="position:relative;width:220px;height:130px;margin:8px auto 0"><svg width="220" height="130"><defs><linearGradient id="ng" x1="1" x2="0"><stop offset="0" stop-color="#FCF3C0"/><stop offset=".2" stop-color="#F7E06F"/><stop offset=".83" stop-color="#C9A84C"/></linearGradient></defs>${segs}</svg>
              <div style="position:absolute;left:0;right:0;top:46px;text-align:center"><img src="${A}/icons/fire-gold.svg" style="width:36px"><div id="nkc" style="color:#C9A84C;font-size:24px;font-weight:700">1,840</div><div id="nrem" style="font-size:14px;font-weight:500;color:rgba(240,240,240,.75)">960kCal remaining</div></div></div>
            <div style="display:flex;margin-top:22px">${mac('Protein', 'nutrient-beans', '120g', '60g left')}${mac('Carbs', 'nutrient-wheat', '210g', '110g left')}${mac('Fats', 'nutrient-cheese', '55g', '30g left')}</div>
          </div></div>
      </div>${tabbar('lunch')}`;
    },
  };

  window.Screens = {
    mount(id, name, ...args) { document.getElementById(id).innerHTML = T[name](...args); },
  };
})();
