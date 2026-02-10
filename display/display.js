     const API_URL = 'https://the-room-api.vercel.app/api/timer';

        // Map des IDs pour l'API (0 = team, 1-5 = players)
        const timerIds = {
            'team': 0,
            'person1': 1,
            'person2': 2,
            'person3': 3,
            'person4': 4,
            'person5': 5
        };

        // Persistent timers state
        const timers = {
            team: { time: 1500, running: false, initial: 1500 },
            person1: { time: 300, running: false, initial: 300 },
            person2: { time: 300, running: false, initial: 300 },
            person3: { time: 300, running: false, initial: 300 },
            person4: { time: 300, running: false, initial: 300 },
            person5: { time: 300, running: false, initial: 300 }
        };

        // Local countdown intervals for visual feedback
        const countdownIntervals = {};

        function startLocalCountdown(timerId) {
            if (countdownIntervals[timerId]) return;
            countdownIntervals[timerId] = setInterval(() => {
                if (timers[timerId].running && timers[timerId].time > 0) {
                    timers[timerId].time--;
                    updateTimerDisplay(timerId);
                }
            }, 1000);
        }

        function stopLocalCountdown(timerId) {
            if (countdownIntervals[timerId]) {
                clearInterval(countdownIntervals[timerId]);
                delete countdownIntervals[timerId];
            }
        }

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        async function fetchTimers() {
            try {
                const response = await fetch(API_URL, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                if (!response.ok) {
                    console.error('Response not OK:', response.status);
                    return;
                }

                const data = await response.json();
                console.log('✅ Fetched data:', data);

                if (!data.chronos || !Array.isArray(data.chronos)) {
                    console.error('❌ Invalid data format:', data);
                    return;
                }

                // Update timers from API
                data.chronos.forEach(chrono => {
                    const localKey = Object.keys(timerIds).find(key => timerIds[key] === chrono.id);
                    if (localKey && timers[localKey]) {
                        const wasRunning = timers[localKey].running;
                        const isRunning = chrono.status === 'running';

                        // Update time from API when:
                        // - Timer is stopped (sync final value)
                        // - Timer just started (get initial value)
                        // Don't update when timer is STILL running (let local countdown handle it)
                        if (!isRunning || !wasRunning) {
                            timers[localKey].time = Math.max(0, Math.floor(chrono.value / 1000));
                        }
                        timers[localKey].running = isRunning;
                    }
                });

                // Update display and manage countdowns
                Object.keys(timers).forEach(key => {
                    updateTimerDisplay(key);
                    if (timers[key].running) {
                        startLocalCountdown(key);
                    } else {
                        stopLocalCountdown(key);
                    }
                });

            } catch (error) {
                console.error('❌ Error fetching timers:', error);
                console.log('Tentative de fetch via proxy...');

                // Fallback avec proxy si CORS échoue
                try {
                    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(API_URL);
                    const response = await fetch(proxyUrl);
                    const data = await response.json();

                    if (data.chronos) {
                        data.chronos.forEach(chrono => {
                            const localKey = Object.keys(timerIds).find(key => timerIds[key] === chrono.id);
                            if (localKey && timers[localKey]) {
                                const wasRunning = timers[localKey].running;
                                const isRunning = chrono.status === 'running';

                                if (!isRunning || !wasRunning) {
                                    timers[localKey].time = Math.max(0, Math.floor(chrono.value / 1000));
                                }
                                timers[localKey].running = isRunning;
                            }
                        });

                        Object.keys(timers).forEach(key => {
                            updateTimerDisplay(key);
                            if (timers[key].running) {
                                startLocalCountdown(key);
                            } else {
                                stopLocalCountdown(key);
                            }
                        });
                    }
                } catch (proxyError) {
                    console.error('❌ Proxy also failed:', proxyError);
                }
            }
        }

        function updateTimerDisplay(timerId) {
            if (timerId === 'team') {
                const teamTime = document.getElementById('team-time');
                const teamStatus = document.getElementById('team-status');
                const teamSection = document.getElementById('team-section');

                if (!teamTime || !teamStatus || !teamSection) return;

                teamTime.textContent = formatTime(timers.team.time);

                teamTime.classList.remove('warning', 'danger', 'zero');
                teamSection.classList.remove('danger');

                if (timers.team.time === 0) {
                    teamTime.classList.add('zero');
                    teamSection.classList.add('danger');
                } else if (timers.team.time <= 10) {
                    teamTime.classList.add('danger');
                    teamSection.classList.add('danger');
                } else if (timers.team.time <= 60) {
                    teamTime.classList.add('warning');
                }

                if (timers.team.running) {
                    teamStatus.textContent = 'EN COURS';
                    teamStatus.className = 'team-status status-running';
                } else if (timers.team.time === 0) {
                    teamStatus.textContent = 'TEMPS ÉCOULÉ!';
                    teamStatus.className = 'team-status status-paused';
                } else if (timers.team.time === timers.team.initial) {
                    teamStatus.textContent = 'PRÊT';
                    teamStatus.className = 'team-status status-stopped';
                } else {
                    teamStatus.textContent = 'PAUSE';
                    teamStatus.className = 'team-status status-paused';
                }
            } else {
                // Person timers
                const timeEl = document.getElementById(`time-${timerId}`);
                const statusEl = document.getElementById(`status-${timerId}`);
                const cardEl = document.getElementById(`card-${timerId}`);

                if (!timeEl || !statusEl || !cardEl) return;

                const timer = timers[timerId];

                timeEl.textContent = formatTime(timer.time);

                timeEl.classList.remove('warning', 'danger', 'zero');
                cardEl.classList.remove('warning', 'danger');

                if (timer.time === 0) {
                    timeEl.classList.add('zero');
                    cardEl.classList.add('danger');
                } else if (timer.time <= 30) {
                    timeEl.classList.add('danger');
                    cardEl.classList.add('danger');
                } else if (timer.time <= 60) {
                    timeEl.classList.add('warning');
                    cardEl.classList.add('warning');
                }

                if (timer.running) {
                    statusEl.textContent = 'EN COURS';
                    statusEl.className = 'person-status status-running';
                    cardEl.classList.add('running');
                } else if (timer.time === 0) {
                    statusEl.textContent = 'TERMINÉ';
                    statusEl.className = 'person-status status-paused';
                    cardEl.classList.remove('running');
                } else if (timer.time === timer.initial) {
                    statusEl.textContent = 'PRÊT';
                    statusEl.className = 'person-status status-stopped';
                    cardEl.classList.remove('running');
                } else {
                    statusEl.textContent = 'PAUSE';
                    statusEl.className = 'person-status status-paused';
                    cardEl.classList.remove('running');
                }
            }
        }

        // Poll l'API toutes les 500ms
        console.log('🚀 Starting timer display...');
        setInterval(fetchTimers, 500);
        fetchTimers();
