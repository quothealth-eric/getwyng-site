/**
 * WYNG TERMINAL - Building in Public
 * Main application JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the terminal
    init();
});

/**
 * Initialize the terminal application
 */
function init() {
    // Set up navigation
    setupNavigation();
    
    // Load initial content
    loadAllContent();
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Update last modified date
    updateLastModified();
}

/**
 * Set up navigation event listeners
 */
function setupNavigation() {
    // Navigation items in file list
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navigateTo(section);
        });
    });
    
    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            navigateTo(section);
        });
    });
}

/**
 * Navigate to a section
 */
function navigateTo(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Scroll to top of terminal body
        document.querySelector('.terminal-body').scrollTop = 0;
    }
    
    // Update URL hash (optional, for bookmarking)
    if (sectionId !== 'welcome') {
        history.pushState(null, '', `#${sectionId}`);
    } else {
        history.pushState(null, '', window.location.pathname);
    }
}

/**
 * Load all markdown content
 */
async function loadAllContent() {
    // Load metrics
    loadMarkdownContent('content/metrics.md', 'metrics-content');
    
    // Load milestones
    loadMarkdownContent('content/milestones.md', 'milestones-content');
    
    // Load roadmap
    loadMarkdownContent('content/roadmap.md', 'roadmap-content');
    
    // Load learnings
    loadMarkdownContent('content/learnings.md', 'learnings-content');
    
    // Load updates list
    loadUpdatesList();
}

/**
 * Load and render markdown content
 */
async function loadMarkdownContent(filePath, elementId) {
    const element = document.getElementById(elementId);
    
    try {
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}`);
        }
        
        const markdown = await response.text();
        element.innerHTML = marked.parse(markdown);
        
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error);
        element.innerHTML = `<p class="dim">Content not found. Check back soon!</p>`;
    }
}

/**
 * Load the updates list from updates.json
 */
async function loadUpdatesList() {
    const listElement = document.getElementById('updates-list');
    
    try {
        const response = await fetch('content/updates.json');
        
        if (!response.ok) {
            throw new Error('Failed to load updates');
        }
        
        const updates = await response.json();
        
        // Sort by date (newest first)
        updates.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Render the list
        let html = '';
        updates.forEach(update => {
            html += `
                <div class="update-item" data-file="${update.file}">
                    <span class="update-date">${formatDate(update.date)}</span>
                    <span class="update-title">${update.title}</span>
                    <span class="update-arrow">→</span>
                </div>
            `;
        });
        
        listElement.innerHTML = html;
        
        // Add click handlers
        document.querySelectorAll('.update-item').forEach(item => {
            item.addEventListener('click', () => {
                loadSingleUpdate(item.dataset.file);
            });
        });
        
    } catch (error) {
        console.error('Error loading updates:', error);
        listElement.innerHTML = `<p class="dim">No updates yet. Check back soon!</p>`;
    }
}

/**
 * Load a single update
 */
async function loadSingleUpdate(fileName) {
    const listElement = document.getElementById('updates-list');
    const detailElement = document.getElementById('update-detail');
    
    try {
        const response = await fetch(`content/updates/${fileName}`);
        
        if (!response.ok) {
            throw new Error('Failed to load update');
        }
        
        const markdown = await response.text();
        
        // Hide list, show detail
        listElement.style.display = 'none';
        detailElement.style.display = 'block';
        
        detailElement.innerHTML = `
            <div class="back-to-list" style="margin-bottom: 16px; cursor: pointer; color: var(--accent-cyan);">
                ← Back to updates
            </div>
            <div class="markdown-content">
                ${marked.parse(markdown)}
            </div>
        `;
        
        // Back to list handler
        detailElement.querySelector('.back-to-list').addEventListener('click', () => {
            listElement.style.display = 'block';
            detailElement.style.display = 'none';
        });
        
    } catch (error) {
        console.error('Error loading update:', error);
        detailElement.innerHTML = `<p class="dim">Update not found.</p>`;
    }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Set up keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Skip keyboard shortcuts if user is typing in an input/textarea/select
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.contentEditable === 'true'
        );

        // Escape to go back to welcome (always works)
        if (e.key === 'Escape') {
            navigateTo('welcome');
            return;
        }

        // Skip other shortcuts if typing in form fields
        if (isInputFocused) {
            return;
        }

        // Number keys for quick navigation (only when not in input fields)
        const shortcuts = {
            '1': 'pitch',
            '2': 'metrics',
            '3': 'updates',
            '4': 'milestones',
            '5': 'roadmap',
            '6': 'learnings',
            '7': 'contact',
            '8': 'demo'  // Added demo shortcut
        };

        if (shortcuts[e.key] && !e.ctrlKey && !e.metaKey) {
            navigateTo(shortcuts[e.key]);
        }
    });
}

/**
 * Update the last modified date in footer
 */
function updateLastModified() {
    const element = document.getElementById('last-updated');
    if (element) {
        const now = new Date();
        element.textContent = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
    }
}

/**
 * Handle URL hash navigation on page load
 */
window.addEventListener('load', () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
        navigateTo(hash);
    }
});

/**
 * Handle browser back/forward buttons
 */
window.addEventListener('popstate', () => {
    const hash = window.location.hash.slice(1);
    navigateTo(hash || 'welcome');
});
