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

        function formatTime(milliseconds) {
            const totalSeconds = Math.floor(milliseconds / 1000);
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
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
                
                // Convertir le format API en format local
                const timers = {};
                data.chronos.forEach(chrono => {
                    const localKey = Object.keys(timerIds).find(key => timerIds[key] === chrono.id);
                    if (localKey) {
                        timers[localKey] = {
                            time: Math.max(0, Math.floor(chrono.value / 1000)),
                            running: chrono.status === 'running',
                            initial: chrono.id === 0 ? 1500 : 300
                        };
                    }
                });
                
                console.log('📊 Converted timers:', timers);
                updateDisplay(timers);
                
            } catch (error) {
                console.error('❌ Error fetching timers:', error);
                console.log('Tentative de fetch via proxy...');
                
                // Fallback avec proxy si CORS échoue
                try {
                    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(API_URL);
                    const response = await fetch(proxyUrl);
                    const data = await response.json();
                    
                    if (data.chronos) {
                        const timers = {};
                        data.chronos.forEach(chrono => {
                            const localKey = Object.keys(timerIds).find(key => timerIds[key] === chrono.id);
                            if (localKey) {
                                timers[localKey] = {
                                    time: Math.max(0, Math.floor(chrono.value / 1000)),
                                    running: chrono.status === 'running',
                                    initial: chrono.id === 0 ? 1500 : 300
                                };
                            }
                        });
                        console.log('✅ Fetched via proxy:', timers);
                        updateDisplay(timers);
                    }
                } catch (proxyError) {
                    console.error('❌ Proxy also failed:', proxyError);
                }
            }
        }

        function updateDisplay(timers) {
            console.log('🖥️ Updating display with:', timers);
            
            const teamTime = document.getElementById('team-time');
            const teamStatus = document.getElementById('team-status');
            const teamSection = document.getElementById('team-section');
            
            if (timers.team) {
                const newTime = formatTime(timers.team.time * 1000);
                console.log('Team time:', newTime, 'Running:', timers.team.running);
                teamTime.textContent = newTime;
                
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
            }

            ['person1', 'person2', 'person3', 'person4', 'person5'].forEach(person => {
                if (!timers[person]) return;
                
                const timeEl = document.getElementById(`time-${person}`);
                const statusEl = document.getElementById(`status-${person}`);
                const cardEl = document.getElementById(`card-${person}`);
                
                timeEl.textContent = formatTime(timers[person].time * 1000);
                
                timeEl.classList.remove('warning', 'danger', 'zero');
                cardEl.classList.remove('warning', 'danger');
                
                if (timers[person].time === 0) {
                    timeEl.classList.add('zero');
                    cardEl.classList.add('danger');
                } else if (timers[person].time <= 30) {
                    timeEl.classList.add('danger');
                    cardEl.classList.add('danger');
                } else if (timers[person].time <= 60) {
                    timeEl.classList.add('warning');
                    cardEl.classList.add('warning');
                }
                
                if (timers[person].running) {
                    statusEl.textContent = 'EN COURS';
                    statusEl.className = 'person-status status-running';
                    cardEl.classList.add('running');
                } else if (timers[person].time === 0) {
                    statusEl.textContent = 'TERMINÉ';
                    statusEl.className = 'person-status status-paused';
                    cardEl.classList.remove('running');
                } else if (timers[person].time === timers[person].initial) {
                    statusEl.textContent = 'PRÊT';
                    statusEl.className = 'person-status status-stopped';
                    cardEl.classList.remove('running');
                } else {
                    statusEl.textContent = 'PAUSE';
                    statusEl.className = 'person-status status-paused';
                    cardEl.classList.remove('running');
                }
            });
        }

        // Poll l'API toutes les 500ms
        console.log('🚀 Starting timer display...');
        setInterval(fetchTimers, 500);
        fetchTimers();