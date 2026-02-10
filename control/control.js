
        const API_BASE = 'https://the-room-api.vercel.app/api/timer';

        // Map des IDs pour l'API (0 = team, 1-5 = players)
        const timerIds = {
            'team': 0,
            'person1': 1,
            'person2': 2,
            'person3': 3,
            'person4': 4,
            'person5': 5
        };

        const timers = {
            team: { time: 1500, running: false, initial: 1500 },
            person1: { time: 300, running: false, initial: 300 },
            person2: { time: 300, running: false, initial: 300 },
            person3: { time: 300, running: false, initial: 300 },
            person4: { time: 300, running: false, initial: 300 },
            person5: { time: 300, running: false, initial: 300 }
        };

        const choices = {
            person1: null,
            person2: null,
            person3: null,
            person4: null,
            person5: null
        };

        // 1. Store interval IDs for each timer
            const countdownIntervals = {};

            // 2. When a timer is "running", start a local 1-second decrement
            function startLocalCountdown(timerId) {
                // Don't duplicate intervals
                if (countdownIntervals[timerId]) return;
                
                countdownIntervals[timerId] = setInterval(() => {
                    if (timers[timerId].running && timers[timerId].time > 0) {
                        timers[timerId].time--;
                        updateDisplay(timerId);
                    }
                }, 1000);
            }

            // 3. When a timer stops, clear the local countdown
            function stopLocalCountdown(timerId) {
                if (countdownIntervals[timerId]) {
                    clearInterval(countdownIntervals[timerId]);
                    delete countdownIntervals[timerId];
                }
            }

            // 4. In fetchTimers(), after updating from API, sync the countdowns:
            Object.keys(timers).forEach(key => {
                if (timers[key].running) {
                    startLocalCountdown(key);
                } else {
                    stopLocalCountdown(key);
                }
                updateDisplay(key);
            });


        async function fetchTimers() {
            try {
                const response = await fetch(API_BASE);
                if (!response.ok) throw new Error('Failed to fetch timers');
                const data = await response.json();
                console.log('📥 Fetched:', data);

                // Convertir le format API en format local
                data.chronos.forEach(chrono => {
                    const localKey = Object.keys(timerIds).find(key => timerIds[key] === chrono.id);
                    if (localKey && timers[localKey]) {
                        const wasRunning = timers[localKey].running;
                        const isRunning = chrono.status === 'running';

                        // Only update time from API if timer is NOT running
                        // (to avoid overwriting local countdown)
                        if (!isRunning) {
                            timers[localKey].time = Math.max(0, Math.floor(chrono.value / 1000));
                        }
                        timers[localKey].running = isRunning;
                    }
                });

                // Mettre à jour l'affichage et gérer les countdowns locaux
                Object.keys(timers).forEach(key => {
                    updateDisplay(key);
                    if (timers[key].running) {
                        startLocalCountdown(key);
                    } else {
                        stopLocalCountdown(key);
                    }
                });
            } catch (error) {
                console.error('❌ Error fetching timers:', error);
            }
        }

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        function updateDisplay(timerId) {
            const displayId = timerId === 'team' ? 'team-display' : `${timerId}-display`;
            const statusId = timerId === 'team' ? 'team-status' : `${timerId}-status`;

            document.getElementById(displayId).textContent = formatTime(timers[timerId].time);

            const statusEl = document.getElementById(statusId);
            if (timers[timerId].running) {
                statusEl.textContent = 'En cours';
                statusEl.className = 'status running';
            } else if (timers[timerId].time === timers[timerId].initial) {
                statusEl.textContent = 'Arrêté';
                statusEl.className = 'status stopped';
            } else {
                statusEl.textContent = 'Pause';
                statusEl.className = 'status paused';
            }
        }

        async function startTimer(timerId) {
            const apiId = timerIds[timerId];
            try {
                console.log('▶️ Starting timer:', apiId);
                const response = await fetch(`${API_BASE}/start/${apiId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                const data = await response.json();
                console.log('✅ Start response:', data);
                if (!response.ok) throw new Error('Failed to start timer');
                await fetchTimers();
            } catch (error) {
                console.error('❌ Error starting timer:', error);
            }
        }

        async function pauseTimer(timerId) {
            const apiId = timerIds[timerId];
            try {
                console.log('⏸️ Pausing timer:', apiId);
                const response = await fetch(`${API_BASE}/stop/${apiId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                const data = await response.json();
                console.log('✅ Pause response:', data);
                if (!response.ok) throw new Error('Failed to pause timer');
                await fetchTimers();
            } catch (error) {
                console.error('❌ Error pausing timer:', error);
            }
        }

        async function resetTimer(timerId) {
            const apiId = timerIds[timerId];
            try {
                console.log('🔄 Resetting timer:', apiId);
                const response = await fetch(`${API_BASE}/reset/${apiId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                const data = await response.json();
                console.log('✅ Reset response:', data);
                if (!response.ok) throw new Error('Failed to reset timer');
                await fetchTimers();
            } catch (error) {
                console.error('❌ Error resetting timer:', error);
            }
        }

        async function adjustTimer(timerId, action, unit) {
            const inputId = timerId === 'team' ? `team-adjust-${unit}` : `${timerId}-adjust-${unit}`;
            const input = document.getElementById(inputId);
            const value = parseInt(input.value) || 0;

            if (value <= 0) return;

            const seconds = unit === 'min' ? value * 60 : value;
            const milliseconds = seconds * 1000;
            const apiId = timerIds[timerId];

            try {
                console.log(`➕➖ ${action}ing ${milliseconds}ms to timer ${apiId}`);
                const endpoint = action === 'add' ? 'add' : 'subtract';
                const response = await fetch(`${API_BASE}/${endpoint}/${apiId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ amount: milliseconds })
                });

                const data = await response.json();
                console.log('✅ Adjust response:', data);

                if (!response.ok) throw new Error(`Failed to ${action} time`);

                input.value = '';
                await fetchTimers();
            } catch (error) {
                console.error(`❌ Error ${action}ing timer:`, error);
            }
        }

        // Synchroniser avec l'API toutes les secondes
        setInterval(fetchTimers, 1000);

        // Initialisation
        console.log('🚀 Starting timer control...');
        fetchTimers();

        function selectChoice(personId, choice) {
            const allCards = document.querySelectorAll('.person-timer');
            const personIndex = parseInt(personId.replace('person', '')) - 1;
            const card = allCards[personIndex];

            const cheatButton = card.querySelector('.cheat-btn');
            const winButton = card.querySelector('.win-btn');

            cheatButton.classList.remove('selected');
            winButton.classList.remove('selected');

            if (choice === 'cheat') {
                cheatButton.classList.add('selected');
                choices[personId] = 'cheat';
            } else {
                winButton.classList.add('selected');
                choices[personId] = 'win';
            }
        }

        async function calculateResults() {
            // Identifier les joueurs actifs (temps > 0)
            const activePlayers = [];
            for (let personId in choices) {
                if (timers[personId].time > 0) {
                    activePlayers.push(personId);
                }
            }

            if (activePlayers.length === 0) {
                document.getElementById('result-text').textContent = '⚠️ Aucun joueur actif!';
                return;
            }

            // Vérifier que tous les joueurs ACTIFS ont fait un choix
            const allActiveChosen = activePlayers.every(personId => choices[personId] !== null);
            if (!allActiveChosen) {
                const missingCount = activePlayers.filter(p => choices[p] === null).length;
                document.getElementById('result-text').textContent = `⚠️ ${missingCount} joueur(s) actif(s) doivent faire un choix!`;
                return;
            }

            // Compter les tricheurs et gagnants parmi les joueurs actifs
            const cheaters = activePlayers.filter(p => choices[p] === 'cheat').length;
            const winners = activePlayers.length - cheaters;

            let teamAdjust = 0;
            let cheatersAdjust = 0;
            let winnersAdjust = 0;
            let resultMessage = '';

            // Logique basée sur le nombre de joueurs actifs
            const totalActive = activePlayers.length;

            if (cheaters === 0) {
                // Tous les actifs gagnent
                resultMessage = `🏆 Tous les ${totalActive} joueurs gagnent! Aucun gain individuel.`;
            } else if (cheaters === 1 && winners === totalActive - 1) {
                // 1 tricheur
                teamAdjust = 60;
                cheatersAdjust = 60;
                winnersAdjust = -15;
                resultMessage = `1 Tricheur: +60s, ${winners} Gagnant(s): -15s chacun, Équipe: +60s`;
            } else if (cheaters === 2 && totalActive >= 2) {
                // 2 tricheurs
                cheatersAdjust = 30;
                winnersAdjust = winners > 0 ? -20 : 0;
                resultMessage = `2 Tricheurs: +30s chacun${winners > 0 ? `, ${winners} Gagnant(s): -20s chacun` : ''}`;
            } else if (cheaters === 3 && totalActive >= 3) {
                // 3 tricheurs
                cheatersAdjust = 20;
                winnersAdjust = winners > 0 ? -30 : 0;
                resultMessage = `3 Tricheurs: +20s chacun${winners > 0 ? `, ${winners} Gagnant(s): -30s chacun` : ''}`;
            } else if (cheaters === 4 && totalActive >= 4) {
                // 4 tricheurs
                cheatersAdjust = 15;
                winnersAdjust = winners > 0 ? -60 : 0;
                resultMessage = `4 Tricheurs: +15s chacun${winners > 0 ? `, ${winners} Gagnant(s): -60s` : ''}`;
            } else if (cheaters === totalActive) {
                // Tous les actifs trichent
                teamAdjust = -120;
                resultMessage = `💀 Tous les ${totalActive} joueurs trichent! Équipe: -120s`;
            } else {
                // Calcul proportionnel pour d'autres cas
                const cheatRatio = cheaters / totalActive;
                if (cheatRatio <= 0.2) { // 20% ou moins trichent
                    teamAdjust = 60;
                    cheatersAdjust = 60;
                    winnersAdjust = -15;
                } else if (cheatRatio <= 0.4) { // ~40% trichent
                    cheatersAdjust = 30;
                    winnersAdjust = -20;
                } else if (cheatRatio <= 0.6) { // ~60% trichent
                    cheatersAdjust = 20;
                    winnersAdjust = -30;
                } else if (cheatRatio < 1) { // Plus de 60% mais pas tous
                    cheatersAdjust = 15;
                    winnersAdjust = -60;
                }
                resultMessage = `${cheaters} Tricheur(s): ${cheatersAdjust > 0 ? '+' : ''}${cheatersAdjust}s, ${winners} Gagnant(s): ${winnersAdjust}s${teamAdjust !== 0 ? `, Équipe: ${teamAdjust > 0 ? '+' : ''}${teamAdjust}s` : ''}`;
            }

            try {
                console.log(`🎲 Calculating results for ${totalActive} active players (${cheaters} cheaters, ${winners} winners)...`);

                // Ajuster uniquement les joueurs actifs
                for (let personId of activePlayers) {
                    const adjust = choices[personId] === 'cheat' ? cheatersAdjust : winnersAdjust;
                    if (adjust !== 0) {
                        const apiId = timerIds[personId];
                        const endpoint = adjust > 0 ? 'add' : 'subtract';
                        const milliseconds = Math.abs(adjust) * 1000;
                        await fetch(`${API_BASE}/${endpoint}/${apiId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ amount: milliseconds })
                        });
                    }
                }

                // Ajuster l'équipe
                if (teamAdjust !== 0) {
                    const endpoint = teamAdjust > 0 ? 'add' : 'subtract';
                    const milliseconds = Math.abs(teamAdjust) * 1000;
                    await fetch(`${API_BASE}/${endpoint}/0`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ amount: milliseconds })
                    });
                }

                // Réinitialiser les choix
                const allCards = document.querySelectorAll('.person-timer');
                allCards.forEach(card => {
                    card.querySelectorAll('.choice-btn').forEach(btn => btn.classList.remove('selected'));
                });

                for (let personId in choices) {
                    choices[personId] = null;
                }

                document.getElementById('result-text').textContent = resultMessage;
                console.log('✅ Results calculated');

                // Rafraîchir l'affichage
                await fetchTimers();
            } catch (error) {
                console.error('❌ Error calculating results:', error);
                document.getElementById('result-text').textContent = '❌ Erreur lors du calcul';
            }
        }