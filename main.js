import { WORD_BANK } from './src/words.js';

class ViviGame {
    constructor() {
        this.state = {
            screen: 'welcome',
            mode: 'Clásico',
            players: [
                { id: 1, name: 'Jugador 1' },
                { id: 2, name: 'Jugador 2' },
                { id: 3, name: 'Jugador 3' }
            ],
            impostorsCount: 1,
            duration: 5,
            themes: [], // Default empty as requested
            currentGame: null,
            draggedIndex: null
        };

        this.categoryIcons = {
            "Animales y Naturaleza": "🐾",
            "Comida y Bebidas": "🍕",
            "Vida Cotidiana": "🏠",
            "Deportes": "⚽",
            "Escuela": "📚",
            "Moda y Ropa": "👕",
            "Marcas": "🏷️",
            "Mundo y Lugares": "🌍",
            "Música": "🎵",
            "Personajes": "👤",
            "Tecnología": "💻",
            "Trabajo y Oficio": "🔨",
            "Transporte": "🚀",
            "Verano": "☀️",
            "Fantasía": "🧙",
            "Para Adultos +18": "🔞"
        };

        this.init();
    }

    init() {
        window.app = this;
        this.renderPlayers();
        this.renderCategories();
        this.renderModes();
        this.setupEventListeners();
        this.setupSwipeReveal();
        this.updateMenuDisplays();

        // Register Service Worker for PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('SW Registered!', reg))
                    .catch(err => console.log('SW Failed!', err));
            });
        }
    }

    toScreen(screenId) {
        console.log('--- Screen Transition ---');
        console.log('Next:', screenId);

        // Aggressive overlay cleanup
        document.querySelectorAll('.modal-overlay, .screen').forEach(el => el.classList.remove('active'));

        const next = document.getElementById(`screen-${screenId}`);
        if (!next) {
            console.error('Screen not found:', screenId);
            return;
        }

        next.classList.add('active');
        this.state.screen = screenId;

        // Reveal Screen Specifics
        if (screenId === 'reveal') {
            this.state.isOpened = false;
            const cover = document.getElementById('reveal-image-cover');
            const hint = document.getElementById('reveal-hint');
            const nextBtn = document.getElementById('btn-next-player');

            if (cover) cover.style.transform = 'translateY(0)';
            if (hint) {
                hint.style.opacity = '1';
                hint.style.display = 'flex';
            }
            if (nextBtn) {
                nextBtn.style.opacity = '0';
                nextBtn.style.pointerEvents = 'none';
            }
        }

        // Hide start message
        const msgBox = document.getElementById('start-who-msg');
        if (msgBox) msgBox.style.opacity = '0';
    }

    resetGame() {
        console.log('Vivi: Hard Resetting...');

        // Stop all timers
        if (this.state.currentGame?.timerId) clearInterval(this.state.currentGame.timerId);
        if (this.state.msgTimeout) clearTimeout(this.state.msgTimeout);

        // Clear critical state
        this.state.currentGame = null;
        this.state.selectedTarget = null;
        this.state.isOpened = false;

        // UI Reset
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        const nextBtn = document.getElementById('btn-next-player');
        if (nextBtn) {
            nextBtn.style.opacity = '0';
            nextBtn.style.pointerEvents = 'none';
        }

        // Return to menu
        this.toScreen('menu');
    }

    openModal(id) {
        const modal = document.getElementById(`modal-${id}`);
        if (modal) modal.classList.add('active');
    }

    closeModal(id) {
        document.getElementById(`modal-${id}`).classList.remove('active');
        this.updateMenuDisplays();
    }

    updateMenuDisplays() {
        document.getElementById('display-mode').innerText = this.state.mode;
        document.getElementById('display-players').innerText = `${this.state.players.length} Jugadores`;
        document.getElementById('display-impostors').innerText = this.state.impostorsCount;
        document.getElementById('display-duration').innerText = `${this.state.duration} MIN`;
        document.getElementById('display-themes').innerText = this.state.themes.length === 0 ? 'SELECCIONAR' : `${this.state.themes.length} CATEGORÍAS`;
    }

    // --- MODES ---
    renderModes() {
        const items = document.querySelectorAll('#mode-list .selection-item');
        items.forEach(item => {
            const modeName = item.querySelector('h4').innerText;
            item.classList.toggle('selected', modeName.toLowerCase() === this.state.mode.toLowerCase());
            item.onclick = () => {
                this.state.mode = modeName.charAt(0).toUpperCase() + modeName.slice(1).toLowerCase();
                this.renderModes();
            };
        });
    }

    setMode(mode) {
        this.state.mode = mode;
        this.renderModes();
    }

    // --- PLAYERS ---
    renderPlayers() {
        const container = document.getElementById('player-list');
        container.innerHTML = '';
        this.state.players.forEach((p, index) => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.draggable = true;
            div.innerHTML = `
                <span class="drag-handle">☰</span>
                <input type="text" value="${p.name}" onchange="app.editPlayer(${p.id}, this.value)">
                <div class="actions">
                    <button onclick="app.removePlayer(${p.id})" ${this.state.players.length <= 3 ? 'disabled' : ''} style="background:none; border:none; color:var(--accent); font-size:1.2rem;">🗑️</button>
                </div>
            `;

            div.addEventListener('dragstart', () => {
                this.state.draggedIndex = index;
                div.classList.add('dragging');
            });

            div.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingElement = document.querySelector('.dragging');
                const siblings = [...container.querySelectorAll('.list-item:not(.dragging)')];
                const nextSibling = siblings.find(sibling => {
                    return e.clientY <= sibling.offsetTop + sibling.offsetHeight / 2;
                });
                container.insertBefore(draggingElement, nextSibling);
            });

            div.addEventListener('dragend', () => {
                div.classList.remove('dragging');
                const newOrder = [...container.querySelectorAll('.list-item input')].map((input, idx) => {
                    const originalId = this.state.players.find(p => p.name === input.defaultValue)?.id || Date.now() + idx;
                    return { id: originalId, name: input.value };
                });
                // Find a better way to map names back or just rebuild from DOM
                this.state.players = newOrder;
                this.renderPlayers();
            });

            // Touch support for reordering (basic)
            div.addEventListener('touchstart', (e) => {
                this.state.draggedIndex = index;
            }, { passive: true });

            container.appendChild(div);
        });
        this.updateMenuDisplays();
    }

    addPlayer() {
        if (this.state.players.length >= 25) return;
        const input = document.getElementById('new-player-name');
        const name = input.value.trim().toUpperCase() || `JUGADOR ${this.state.players.length + 1}`;
        const newId = Date.now();
        this.state.players.push({ id: newId, name: name });
        this.renderPlayers();
        input.value = '';
    }

    editPlayer(id, newName) {
        const p = this.state.players.find(p => p.id === id);
        if (p) {
            p.name = newName.toUpperCase();
            // Don't re-render immediately to avoid losing focus during typing
        }
    }

    removePlayer(id) {
        if (this.state.players.length <= 3) return;
        this.state.players = this.state.players.filter(p => p.id !== id);
        this.renderPlayers();
    }

    // --- SETTINGS ---
    updateImpostors(delta) {
        const newVal = this.state.impostorsCount + delta;
        if (newVal >= 1 && newVal <= 12 && newVal < this.state.players.length) {
            this.state.impostorsCount = newVal;
        }
        this.updateMenuDisplays();
    }

    renderCategories() {
        const container = document.getElementById('category-list');
        container.innerHTML = '';
        Object.keys(WORD_BANK).forEach(cat => {
            const div = document.createElement('div');
            const isSelected = this.state.themes.includes(cat);
            div.className = `category-item ${isSelected ? 'selected' : ''}`;
            div.innerHTML = `
                <span class="category-icon">${this.categoryIcons[cat] || '❓'}</span>
                <span style="font-size: 0.8rem; font-weight: 700;">${cat.toUpperCase()}</span>
            `;
            div.onclick = () => {
                if (this.state.themes.includes(cat)) {
                    this.state.themes = this.state.themes.filter(t => t !== cat);
                } else {
                    this.state.themes.push(cat);
                }
                this.renderCategories();
            };
            container.appendChild(div);
        });
        this.updateMenuDisplays();
    }

    setupEventListeners() {
        const slider = document.getElementById('duration-slider');
        slider.oninput = (e) => {
            this.state.duration = parseInt(e.target.value);
            document.getElementById('duration-val').innerText = this.state.duration;
            this.updateMenuDisplays();
        };
    }

    // --- GAME LOGIC ---
    prepareGame() {
        if (this.state.themes.length === 0) {
            alert('Por favor selecciona al menos una categoría.');
            this.openModal('themes');
            return;
        }
        const details = document.getElementById('preview-details');
        details.innerHTML = `
            <p>👥 <strong style="color:var(--accent)">JUGADORES:</strong> ${this.state.players.length}</p>
            <p>🕵️ <strong style="color:var(--accent)">IMPOSTORES:</strong> ${this.state.impostorsCount}</p>
            <p>⏱️ <strong style="color:var(--accent)">DURACIÓN:</strong> ${this.state.duration} MIN</p>
            <p>🎮 <strong style="color:var(--accent)">MODO:</strong> ${this.state.mode}</p>
            <p>🎭 <strong style="color:var(--accent)">TEMAS:</strong> ${this.state.themes.length} SELECCIONADOS</p>
        `;
        this.toScreen('preview');
    }

    startGame() {
        const randomCat = this.state.themes[Math.floor(Math.random() * this.state.themes.length)];
        const words = WORD_BANK[randomCat];
        const mainWord = words[Math.floor(Math.random() * words.length)];

        let players = [...this.state.players].map(p => ({ ...p, isImpostor: false, word: mainWord, found: false }));

        let impCount = this.state.impostorsCount;
        if (this.state.mode === 'Caos') {
            impCount = Math.floor(Math.random() * (players.length)) + 1;
        }

        let shuffled = [...players].sort(() => 0.5 - Math.random());
        const usedWords = new Set([mainWord]);

        for (let i = 0; i < impCount; i++) {
            const playerIndex = players.findIndex(p => p.id === shuffled[i].id);
            players[playerIndex].isImpostor = true;

            if (this.state.mode === 'Clásico') {
                players[playerIndex].word = 'VIVI LA IMPOSTOR';
            } else if (this.state.mode === 'Misterioso') {
                let mysteryWord = words[Math.floor(Math.random() * words.length)];
                while (mysteryWord === mainWord) mysteryWord = words[Math.floor(Math.random() * words.length)];
                players[playerIndex].word = mysteryWord;
            } else if (this.state.mode === 'Caos') {
                let chaosWord = words[Math.floor(Math.random() * words.length)];
                while (usedWords.has(chaosWord)) chaosWord = words[Math.floor(Math.random() * words.length)];
                players[playerIndex].word = chaosWord;
                usedWords.add(chaosWord);
            }
        }

        this.state.currentGame = {
            players,
            mainWord,
            currentPlayerIndex: 0,
            remainingTime: this.state.duration * 60,
            timerId: null,
            totalFound: 0,
            totalImpostors: impCount
        };

        this.showReveal();
    }

    showReveal() {
        const game = this.state.currentGame;
        const p = game.players[game.currentPlayerIndex];
        const nextBtn = document.getElementById('btn-next-player');

        document.getElementById('revealed-word').innerText = p.word;
        document.getElementById('player-reveal-name').innerText = p.name;

        // Change text for last player
        if (game.currentPlayerIndex === game.players.length - 1) {
            nextBtn.innerText = 'COMENZAR';
        } else {
            nextBtn.innerText = 'SIGUIENTE JUGADOR';
        }

        this.toScreen('reveal');
    }

    setupSwipeReveal() {
        const cover = document.getElementById('reveal-image-cover');
        const hint = document.getElementById('reveal-hint');
        const nextBtn = document.getElementById('btn-next-player');

        this.REVEAL_PCT = 37; // Ajuste manual del usuario (37%)
        let startY = 0;

        const handleStart = (y) => {
            startY = y;
        };

        const handleMove = (y) => {
            let diff = startY - y;
            if (diff > 0 && !this.state.isOpened) {
                // Use pixels for smooth dragging, but cap at the reveal percentage
                const maxPx = window.innerHeight * (this.REVEAL_PCT / 100);
                cover.style.transform = `translateY(-${Math.min(diff, maxPx)}px)`;
                hint.style.opacity = (150 - diff) / 150;
            } else if (diff < 0 && this.state.isOpened) {
                // Dragging back down
                const currentShift = window.innerHeight * (this.REVEAL_PCT / 100);
                cover.style.transform = `translateY(calc(-${this.REVEAL_PCT}% + ${Math.min(Math.abs(diff), currentShift)}px))`;
            }
        };

        const handleEnd = (y) => {
            let diff = startY - y;
            if (!this.state.isOpened) {
                if (diff > 80) {
                    cover.style.transform = `translateY(-${this.REVEAL_PCT}%)`;
                    hint.style.opacity = '0';
                    hint.style.display = 'none'; // Hide hint when peered
                    this.state.isOpened = true;
                    nextBtn.style.opacity = '0';
                    nextBtn.style.pointerEvents = 'none';
                } else {
                    cover.style.transform = 'translateY(0)';
                    hint.style.opacity = '1';
                    hint.style.display = 'flex';
                }
            } else {
                if (diff < -50) {
                    cover.style.transform = 'translateY(0)';
                    hint.style.opacity = '0'; // Keep hint hidden while button is visible
                    hint.style.display = 'none';
                    this.state.isOpened = false;
                    nextBtn.style.opacity = '1';
                    nextBtn.style.pointerEvents = 'all';
                } else {
                    cover.style.transform = `translateY(-${this.REVEAL_PCT}%)`;
                    hint.style.display = 'none';
                }
            }
        };

        // Touch
        cover.addEventListener('touchstart', (e) => handleStart(e.touches[0].clientY), { passive: true });
        cover.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientY), { passive: true });
        cover.addEventListener('touchend', (e) => handleEnd(e.changedTouches[0].clientY));

        // Mouse
        cover.addEventListener('mousedown', (e) => {
            handleStart(e.clientY);
            const move = (me) => handleMove(me.clientY);
            const up = (ue) => {
                handleEnd(ue.clientY);
                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', up);
            };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
        });
    }

    nextPlayer() {
        const game = this.state.currentGame;
        game.currentPlayerIndex++;
        if (game.currentPlayerIndex < game.players.length) {
            this.showReveal();
        } else {
            this.startTimer();
        }
    }

    // --- TIMER ---
    startTimer() {
        this.toScreen('timer');

        // Who starts? (Only first time)
        const game = this.state.currentGame;
        if (!game.starterShown) {
            const msgBox = document.getElementById('start-who-msg');
            const activePlayers = game.players.filter(p => !p.found);
            const starter = activePlayers[Math.floor(Math.random() * activePlayers.length)];

            msgBox.innerHTML = `EMPIEZA JUGANDO:<br><span style="font-size: 2rem; color: #fff;">${starter.name}</span>`;
            msgBox.style.opacity = '1';

            game.starterShown = true;

            if (this.state.msgTimeout) clearTimeout(this.state.msgTimeout);
            this.state.msgTimeout = setTimeout(() => {
                msgBox.style.opacity = '0';
            }, 10000);
        }

        this.runTimer();
    }

    runTimer() {
        const display = document.getElementById('timer-display');
        const game = this.state.currentGame;
        if (game.timerId) clearInterval(game.timerId);

        game.timerId = setInterval(() => {
            game.remainingTime--;
            if (game.remainingTime <= 0) {
                clearInterval(game.timerId);
                this.openVote();
            }
            const mins = Math.floor(game.remainingTime / 60);
            const secs = game.remainingTime % 60;
            display.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }, 1000);
    }

    openVote() {
        clearInterval(this.state.currentGame.timerId);
        const container = document.getElementById('vote-grid');
        container.innerHTML = '';

        this.state.currentGame.players.forEach(p => {
            if (p.found) return;
            const div = document.createElement('div');
            div.className = 'selection-item';
            div.style.textAlign = 'center';
            div.innerHTML = `<h4>${p.name}</h4>`;
            div.onclick = () => {
                container.querySelectorAll('.selection-item').forEach(v => v.classList.remove('selected'));
                div.classList.add('selected');
                this.state.selectedTarget = p.id;
            };
            container.appendChild(div);
        });

        this.toScreen('vote');
    }

    confirmVote() {
        if (!this.state.selectedTarget) return;

        const target = this.state.currentGame.players.find(p => p.id === this.state.selectedTarget);
        const title = document.getElementById('result-title');
        const msg = document.getElementById('result-msg');
        const img = document.getElementById('result-img');
        const btnContinue = document.getElementById('btn-continue');

        // Mark player as found (eliminated) in any case as requested
        target.found = true;

        if (target.isImpostor) {
            this.state.currentGame.totalFound++;
            img.src = 'vivitriste.png';
            title.innerText = '¡LA ENCONTRASTE!';
            msg.innerText = `${target.name} ERA VIVI LA IMPOSTOR.`;

            if (this.state.currentGame.totalFound >= this.state.currentGame.totalImpostors) {
                title.innerText = '¡GANASTE!';
                msg.innerText = 'TODOS LOS IMPOSTORES FUERON CAPTURADOS.';
                btnContinue.style.display = 'none';
            } else {
                btnContinue.style.display = 'block';
            }
        } else {
            img.src = 'vivilibre.jpg';
            title.innerText = 'VIVI SIGUE SUELTA';
            msg.innerText = `${target.name} ERA INOCENTE. EL TIEMPO SIGUE CORRIENDO.`;
            btnContinue.style.display = 'block';
        }

        this.toScreen('result');
        this.state.selectedTarget = null;
    }

    continueTimer() {
        this.toScreen('timer');
        this.runTimer();
    }
}

new ViviGame();
