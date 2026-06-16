document.addEventListener('DOMContentLoaded', () => {
    // App State
    let allReleases = []; // Holds the raw structured releases from the API
    let activeFilter = 'all'; // Current active pill filter
    let searchQuery = ''; // Search input text
    let selectedUpdate = null; // The update object currently active in the tweet modal

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterPills = document.getElementById('filter-pills');
    const resultsCount = document.getElementById('results-count');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const updatesTimeline = document.getElementById('updates-timeline');
    const emptyState = document.getElementById('empty-state');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const statusToast = document.getElementById('status-toast');
    const toastMessage = statusToast.querySelector('.toast-message');
    const toastClose = statusToast.querySelector('.toast-close');

    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalPreview = document.getElementById('modal-card-preview');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const copyTextBtn = document.getElementById('copy-text-btn');
    const sendTweetBtn = document.getElementById('send-tweet-btn');

    // Initialize Theme
    initTheme();

    // Fetch Initial Data
    fetchReleases();

    // --- EVENT LISTENERS ---

    // Refresh Button Click
    refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    // Theme Toggle Click
    themeToggle.addEventListener('click', toggleTheme);

    // Search Input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        if (searchQuery.length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        renderFeed();
    });

    // Clear Search Click
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderFeed();
    });

    // Filter Pills Click
    filterPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;

        // Update active class
        filterPills.querySelectorAll('.pill').forEach(btn => btn.classList.remove('active'));
        pill.classList.add('active');

        // Set active filter
        activeFilter = pill.getAttribute('data-type');
        renderFeed();
    });

    // Reset Filters Button
    resetFiltersBtn.addEventListener('click', () => {
        // Reset Search
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';

        // Reset Pills
        filterPills.querySelectorAll('.pill').forEach(btn => btn.classList.remove('active'));
        filterPills.querySelector('[data-type="all"]').classList.add('active');
        activeFilter = 'all';

        renderFeed();
    });

    // Toast Close Click
    toastClose.addEventListener('click', () => {
        statusToast.style.display = 'none';
    });

    // Close Modal Event Listeners
    closeModalBtn.addEventListener('click', () => {
        closeTweetModal();
    });

    // Close Modal on clicking backdrop
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Textarea character count tracker
    tweetTextarea.addEventListener('input', updateCharCount);

    // Copy to Clipboard Action
    copyTextBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        navigator.clipboard.writeText(text).then(() => {
            const originalHtml = copyTextBtn.innerHTML;
            copyTextBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied!</span>';
            showToast('Copied tweet text to clipboard!');
            setTimeout(() => {
                copyTextBtn.innerHTML = originalHtml;
            }, 2000);
        }).catch(err => {
            console.error('Clipboard copy failed: ', err);
            showToast('Failed to copy text. Please copy manually.');
        });
    });

    // Share to X (Twitter) click
    sendTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        if (text.length > 280) {
            showToast('Text exceeds the 280-character limit for standard X/Twitter accounts.');
            return;
        }
        
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank');
        closeTweetModal();
        showToast('Redirected to X / Twitter.');
    });

    // --- DATA FUNCTIONS ---

    // Fetch release notes from backend
    function fetchReleases(forceRefresh = false) {
        // Set loading state
        document.body.classList.add('loading');
        refreshBtn.disabled = true;
        skeletonLoader.style.display = 'flex';
        updatesTimeline.style.display = 'none';
        emptyState.style.display = 'none';
        resultsCount.textContent = 'Updating feed...';

        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                allReleases = data.releases || [];
                
                if (data.status === 'warning') {
                    showToast(data.message);
                } else if (forceRefresh) {
                    showToast('Release notes successfully updated!');
                }
                
                renderFeed();
            })
            .catch(err => {
                console.error('Fetch error:', err);
                showToast(`Error: ${err.message}. Showing empty dashboard.`);
                allReleases = [];
                renderFeed();
            })
            .finally(() => {
                document.body.classList.remove('loading');
                refreshBtn.disabled = false;
                skeletonLoader.style.display = 'none';
            });
    }

    // Filter, structure, and render notes to timeline
    function renderFeed() {
        updatesTimeline.innerHTML = '';
        
        // Flatten entries to individual updates: { date, link, type, html, text }
        let updates = [];
        allReleases.forEach(entry => {
            if (entry.updates && entry.updates.length > 0) {
                entry.updates.forEach(u => {
                    updates.push({
                        date: entry.date,
                        link: entry.link,
                        type: u.type,
                        html: u.html,
                        text: u.text
                    });
                });
            }
        });

        // Filter by Type
        if (activeFilter !== 'all') {
            updates = updates.filter(u => {
                const typeLower = u.type.toLowerCase();
                if (activeFilter === 'other') {
                    return !['feature', 'issue', 'deprecation'].includes(typeLower);
                }
                return typeLower === activeFilter.toLowerCase();
            });
        }

        // Filter by Search Query
        if (searchQuery) {
            updates = updates.filter(u => 
                u.text.toLowerCase().includes(searchQuery) ||
                u.type.toLowerCase().includes(searchQuery) ||
                u.date.toLowerCase().includes(searchQuery)
            );
        }

        // Render Cards
        if (updates.length === 0) {
            resultsCount.textContent = '0 updates found';
            updatesTimeline.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        resultsCount.textContent = `Showing ${updates.length} release note update${updates.length === 1 ? '' : 's'}`;
        emptyState.style.display = 'none';
        updatesTimeline.style.display = 'flex';

        updates.forEach((update, idx) => {
            const card = createUpdateCard(update, idx);
            updatesTimeline.appendChild(card);
        });
    }

    // HTML Generator for Update Cards
    function createUpdateCard(update, index) {
        const card = document.createElement('article');
        card.className = 'timeline-card';
        card.setAttribute('data-index', index);

        // Map badge class
        const typeLower = update.type.toLowerCase();
        let badgeClass = 'other';
        let badgeIcon = '<i class="fa-solid fa-circle-info"></i>';

        if (typeLower === 'feature') {
            badgeClass = 'feature';
            badgeIcon = '<i class="fa-solid fa-circle-plus"></i>';
        } else if (typeLower === 'issue') {
            badgeClass = 'issue';
            badgeIcon = '<i class="fa-solid fa-triangle-exclamation"></i>';
        } else if (typeLower === 'deprecation') {
            badgeClass = 'deprecation';
            badgeIcon = '<i class="fa-solid fa-ban"></i>';
        }

        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta-left">
                    <span class="badge ${badgeClass}">
                        ${badgeIcon} ${update.type}
                    </span>
                    <time class="card-date">${update.date}</time>
                </div>
                <a href="${update.link}" target="_blank" class="btn btn-icon" title="View official release notes" aria-label="View official release notes">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
            </div>
            <div class="card-body">
                ${update.html}
            </div>
            <div class="card-footer">
                <button class="btn btn-tweet card-tweet-btn">
                    <i class="fa-brands fa-x-twitter"></i>
                    <span>Tweet this</span>
                </button>
            </div>
        `;

        // Card Selection Toggle Handler
        card.addEventListener('click', (e) => {
            // Ignore click if it's on a link or button
            if (e.target.closest('a') || e.target.closest('button')) return;

            const isSelected = card.classList.contains('selected');
            document.querySelectorAll('.timeline-card').forEach(c => c.classList.remove('selected'));
            
            if (!isSelected) {
                card.classList.add('selected');
            }
        });

        // Card Tweet Button Click Handler
        const cardTweetBtn = card.querySelector('.card-tweet-btn');
        cardTweetBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid triggering selection
            openTweetModal(update);
        });

        return card;
    }

    // --- TWEET COMPOSE COMPONENT ---

    // Open Modal and pre-populate composition text
    function openTweetModal(update) {
        selectedUpdate = update;

        // Render card preview in the modal
        const typeLower = update.type.toLowerCase();
        let badgeClass = 'other';
        if (typeLower === 'feature') badgeClass = 'feature';
        else if (typeLower === 'issue') badgeClass = 'issue';
        else if (typeLower === 'deprecation') badgeClass = 'deprecation';

        modalPreview.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                <span class="badge ${badgeClass}" style="padding:0.15rem 0.5rem; font-size:0.65rem;">
                    ${update.type}
                </span>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${update.date}</span>
            </div>
            <p>${update.text}</p>
        `;

        // Generate character-count-aware default tweet text
        tweetTextarea.value = generateDefaultTweetText(update);
        updateCharCount();

        // Show Modal
        tweetModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Lock background scrolling
        tweetTextarea.focus();
    }

    // Close tweet composer modal
    function closeTweetModal() {
        tweetModal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scroll
        selectedUpdate = null;
    }

    // Smart Tweet Drafting (Ensures character limit adherence)
    function generateDefaultTweetText(update) {
        const prefix = `BigQuery Release Note (${update.date}) - [${update.type}]: `;
        const link = ` ${update.link}`;
        
        // Twitter/X allows 280 characters.
        // Let's determine how many characters are left for the description text.
        const maxLen = 280;
        const reservedLen = prefix.length + link.length;
        const availableLen = maxLen - reservedLen;

        let description = update.text;
        
        if (description.length > availableLen) {
            // We need to truncate the description.
            // Leaving 3 characters space for "..."
            const truncatedDesc = description.substring(0, availableLen - 3).trim();
            return `${prefix}${truncatedDesc}...${link}`;
        }
        
        return `${prefix}${description}${link}`;
    }

    // Character counter tracker
    function updateCharCount() {
        const len = tweetTextarea.value.length;
        charCounter.textContent = `${len} / 280`;

        // Style the counter warning/danger based on limits
        charCounter.className = 'char-count';
        if (len > 280) {
            charCounter.classList.add('danger');
            sendTweetBtn.disabled = true;
            sendTweetBtn.style.opacity = '0.5';
            sendTweetBtn.style.cursor = 'not-allowed';
        } else {
            sendTweetBtn.disabled = false;
            sendTweetBtn.style.opacity = '1';
            sendTweetBtn.style.cursor = 'pointer';
            
            if (len > 250) {
                charCounter.classList.add('warning');
            }
        }
    }

    // --- UI UTILS ---

    // Show small Toast notification
    function showToast(message) {
        toastMessage.textContent = message;
        statusToast.style.display = 'flex';
        
        // Auto hide after 5 seconds
        if (window.toastTimeout) clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(() => {
            statusToast.style.display = 'none';
        }, 5000);
    }

    // --- THEME MANAGEMENT ---

    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.documentElement.classList.remove('light-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }

    function toggleTheme() {
        const isLight = document.documentElement.classList.toggle('light-theme');
        if (isLight) {
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
            showToast('Switched to Light mode');
        } else {
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            showToast('Switched to Dark mode');
        }
    }
});
