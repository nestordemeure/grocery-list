// Default groups with colors
const defaultGroups = [
    { name: 'Whole Foods', color: '#4CAF50' },
    { name: 'Trader Joe\'s', color: '#FF5722' },
    { name: 'Indian Store', color: '#FF9800' }
];

// State
let items = [];
let groups = [];
let itemMemory = {}; // Maps normalized item key to { group, text }

// Heuristic English singularization so "Tomatoes" and "tomato" collide on
// the same key. The result doesn't need to be a real word, only stable:
// singular and plural forms of the same word must map to the same string.
function singularize(word) {
    if (word.length <= 3) return word;
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';   // berries -> berry
    if (word.endsWith('ie')) return word.slice(0, -2) + 'y';    // cookie -> cooky (= cookies)
    if (word.endsWith('shes') || word.endsWith('ches') ||
        word.endsWith('xes') || word.endsWith('sses') ||
        word.endsWith('oes')) return word.slice(0, -2);         // tomatoes -> tomato
    if (word.endsWith('ss') || word.endsWith('us') ||
        word.endsWith('is')) return word;                       // hummus, asparagus
    if (word.endsWith('s')) return word.slice(0, -1);           // eggs -> egg
    return word;
}

// Canonical key for an item: lowercase, collapsed whitespace, singularized
function normalizeKey(text) {
    return text.trim().toLowerCase().split(/\s+/).map(singularize).join(' ');
}

// Load from localStorage
function loadData() {
    const savedItems = localStorage.getItem('groceryItems');
    const savedGroups = localStorage.getItem('groceryGroups');
    const savedMemory = localStorage.getItem('itemMemory');

    items = savedItems ? JSON.parse(savedItems) : [];
    groups = savedGroups ? JSON.parse(savedGroups) : defaultGroups;
    itemMemory = savedMemory ? JSON.parse(savedMemory) : {};

    // Migrate memory entries: old format mapped raw lowercase text to a group
    // index; new format maps a normalized key to { group, text }. Normalizing
    // also merges plural/singular duplicates from old data.
    const migrated = {};
    for (const [key, value] of Object.entries(itemMemory)) {
        const entry = (value !== null && typeof value === 'object')
            ? value
            : { group: value === undefined ? null : value, text: key };
        const norm = normalizeKey(entry.text);
        const existing = migrated[norm];
        migrated[norm] = entry;
        if (existing && entry.group === null && existing.group !== null) {
            migrated[norm] = { group: existing.group, text: entry.text };
        }
    }
    itemMemory = migrated;
}

// Remember an item's group (null = no group) so autocomplete knows every
// item ever added. Re-inserting refreshes the key's position, so pruning
// drops the least recently used entries first.
const MEMORY_LIMIT = 500;
function rememberItem(text, groupValue) {
    const key = normalizeKey(text);
    delete itemMemory[key];
    itemMemory[key] = { group: groupValue, text: text.trim() };
    const keys = Object.keys(itemMemory);
    for (let i = 0; i < keys.length - MEMORY_LIMIT; i++) {
        delete itemMemory[keys[i]];
    }
}

// Save to localStorage
function saveData() {
    localStorage.setItem('groceryItems', JSON.stringify(items));
    localStorage.setItem('groceryGroups', JSON.stringify(groups));
    localStorage.setItem('itemMemory', JSON.stringify(itemMemory));
}

// Generate a random color for new groups
function getRandomColor() {
    const colors = ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3',
                  '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
                  '#FFC107', '#FF9800', '#FF5722', '#795548'];

    // Get colors that are already in use
    const usedColors = groups.map(g => g.color);

    // Filter out used colors
    const availableColors = colors.filter(c => !usedColors.includes(c));

    // If there are available colors, pick from those; otherwise pick any
    const colorPool = availableColors.length > 0 ? availableColors : colors;
    return colorPool[Math.floor(Math.random() * colorPool.length)];
}

// Update group dropdown
function updateGroupSelect() {
    const select = document.getElementById('groupSelect');
    select.innerHTML = '<option value="">🏷️</option>';

    groups.forEach((group, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `● ${group.name}`;
        option.style.color = group.color;
        select.appendChild(option);
    });

    const newGroupOption = document.createElement('option');
    newGroupOption.value = 'new';
    newGroupOption.textContent = '+ Create new group';
    select.appendChild(newGroupOption);
}

// Close any open group dropdown
function closeDropdowns() {
    document.querySelectorAll('.group-dropdown').forEach(d => d.remove());
}

// Build the group dropdown for an item
function showGroupDropdown(itemIndex, wrapper) {
    closeDropdowns();

    const dropdown = document.createElement('div');
    dropdown.className = 'group-dropdown';

    // "No group" option
    const noGroup = document.createElement('button');
    noGroup.className = 'group-dropdown-item';
    const noGroupDot = document.createElement('span');
    noGroupDot.className = 'bullet-dot';
    noGroupDot.style.backgroundColor = '#888';
    noGroup.appendChild(noGroupDot);
    noGroup.appendChild(document.createTextNode('No group'));
    noGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        changeItemGroup(itemIndex, null);
    });
    dropdown.appendChild(noGroup);

    // Group options
    groups.forEach((group, gi) => {
        const btn = document.createElement('button');
        btn.className = 'group-dropdown-item';
        const dot = document.createElement('span');
        dot.className = 'bullet-dot';
        dot.style.backgroundColor = group.color;
        btn.appendChild(dot);
        btn.appendChild(document.createTextNode(group.name));
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            changeItemGroup(itemIndex, gi);
        });
        dropdown.appendChild(btn);
    });

    // "Create new group" option
    const newGroup = document.createElement('button');
    newGroup.className = 'group-dropdown-item';
    newGroup.textContent = '+ New group';
    newGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDropdowns();
        const groupName = prompt('Enter new group name:');
        if (groupName && groupName.trim()) {
            groups.push({ name: groupName.trim(), color: getRandomColor() });
            saveData();
            updateGroupSelect();
            changeItemGroup(itemIndex, groups.length - 1);
        }
    });
    dropdown.appendChild(newGroup);

    wrapper.appendChild(dropdown);

    // Close on outside click (one-time listener)
    setTimeout(() => {
        document.addEventListener('click', function handler(e) {
            if (!wrapper.contains(e.target)) {
                closeDropdowns();
                document.removeEventListener('click', handler);
            }
        });
    }, 0);
}

// Change an item's group
function changeItemGroup(itemIndex, groupValue) {
    items[itemIndex].group = groupValue;
    rememberItem(items[itemIndex].text, groupValue);
    saveData();
    closeDropdowns();
    render();
}

// Render items
function render() {
    const list = document.getElementById('groceryList');
    list.innerHTML = '';

    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `grocery-item ${item.checked ? 'checked' : ''}`;
        div.dataset.index = index; // Read back after a drag to rebuild the order

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.checked;
        checkbox.id = `item-${index}`;
        checkbox.addEventListener('change', () => {
            // Update the row in place: re-rendering the whole list on
            // every tap is sluggish on older phones
            item.checked = checkbox.checked;
            div.classList.toggle('checked', item.checked);
            saveData();
        });

        const label = document.createElement('label');
        label.htmlFor = `item-${index}`;
        label.textContent = item.text;

        // Always show a group bullet
        const wrapper = document.createElement('div');
        wrapper.className = 'group-bullet-wrapper';

        const bullet = document.createElement('button');
        bullet.className = 'group-bullet';
        const hasGroup = item.group !== null && item.group !== undefined && groups[item.group];
        bullet.style.backgroundColor = hasGroup ? groups[item.group].color : '#888';
        bullet.textContent = hasGroup ? groups[item.group].name : '\u00A0\u00A0\u00A0';
        bullet.title = hasGroup ? groups[item.group].name : 'No group';
        bullet.addEventListener('click', (e) => {
            e.stopPropagation();
            // Toggle: close if already open, otherwise open
            if (wrapper.querySelector('.group-dropdown')) {
                closeDropdowns();
            } else {
                showGroupDropdown(index, wrapper);
            }
        });

        wrapper.appendChild(bullet);

        div.appendChild(checkbox);
        div.appendChild(label);
        div.appendChild(wrapper);

        list.appendChild(div);
    });
}

// --- Reorder by press and hold ---------------------------------------------
// Press an item and hold it, then move it up or down. Pointer events cover
// both touch and mouse. The hold delay keeps taps and page scrolling intact:
// any movement before the delay cancels the press.

const HOLD_DELAY = 350;      // ms of stillness that turns a press into a drag
const HOLD_TOLERANCE = 10;   // px of movement that cancels the press
const EDGE_ZONE = 70;        // px from a screen edge where the page scrolls
const EDGE_SPEED = 0.25;     // px scrolled per px inside the edge zone, per frame

let press = null;            // press waiting for the hold delay
let drag = null;             // drag in progress
let scrollFrame = 0;

// Midpoint of a row in layout coordinates. Layout ignores transforms, so a
// neighbour that is still sliding into place reports where it will land.
function midpoint(row) {
    return row.offsetTop + row.offsetHeight / 2;
}

// Move a row in the list, then animate it from where it used to be
function slide(row, moveInDom) {
    const before = row.getBoundingClientRect().top;
    moveInDom();
    const after = row.getBoundingClientRect().top;
    row.style.transition = 'none';
    row.style.transform = `translateY(${before - after}px)`;
    requestAnimationFrame(() => {
        row.style.transition = 'transform 0.15s ease';
        row.style.transform = '';
    });
}

// Keep the dragged row under the pointer and let it swap past any neighbour
// whose midpoint it crossed
function moveRow(clientY) {
    const row = drag.row;
    const wantTop = clientY - drag.grabOffset;

    row.style.transform = '';
    let shift = wantTop - row.getBoundingClientRect().top;
    row.style.transform = `translateY(${shift}px)`;

    const center = row.offsetTop + shift + row.offsetHeight / 2;

    // A fast move can pass several rows, so keep swapping until it settles
    for (let guard = 0; guard < 50; guard++) {
        const next = row.nextElementSibling;
        const prev = row.previousElementSibling;
        if (next && center > midpoint(next)) slide(next, () => next.after(row));
        else if (prev && center < midpoint(prev)) slide(prev, () => prev.before(row));
        else break;
        // The row kept its place on screen but changed place in the list
        row.style.transform = '';
        shift = wantTop - row.getBoundingClientRect().top;
        row.style.transform = `translateY(${shift}px)`;
    }
}

// Scroll the page when the pointer holds near the top or bottom edge
function autoScroll() {
    if (!drag) return;
    const y = drag.clientY;
    let dy = 0;
    if (y < EDGE_ZONE) dy = (y - EDGE_ZONE) * EDGE_SPEED;
    else if (y > window.innerHeight - EDGE_ZONE) dy = (y - window.innerHeight + EDGE_ZONE) * EDGE_SPEED;

    if (dy !== 0) {
        const before = window.scrollY;
        window.scrollBy(0, dy);
        if (window.scrollY !== before) moveRow(y);
    }
    scrollFrame = requestAnimationFrame(autoScroll);
}

function cancelPress() {
    if (!press) return;
    clearTimeout(press.timer);
    press = null;
}

function startDrag(p) {
    press = null;
    closeDropdowns();

    const rect = p.row.getBoundingClientRect();
    drag = {
        row: p.row,
        pointerId: p.pointerId,
        grabOffset: p.lastY - rect.top, // hold the row at the point it was grabbed
        clientY: p.lastY
    };

    p.row.classList.add('dragging');
    if (navigator.vibrate) navigator.vibrate(20);
    try { p.row.setPointerCapture(p.pointerId); } catch (e) { /* pointer already gone */ }

    moveRow(p.lastY);
    scrollFrame = requestAnimationFrame(autoScroll);
}

// The pointer that ends a drag also fires a click, which would tick the item
function swallowNextClick() {
    const swallow = (e) => {
        e.preventDefault();
        e.stopPropagation();
        stop();
    };
    const stop = () => document.removeEventListener('click', swallow, true);
    document.addEventListener('click', swallow, true);
    setTimeout(stop, 400);
}

function endDrag() {
    const row = drag.row;
    cancelAnimationFrame(scrollFrame);
    row.classList.remove('dragging');
    row.style.transform = '';
    drag = null;

    // The DOM holds the new order; each row still knows its old position
    const list = document.getElementById('groceryList');
    items = Array.from(list.children).map(el => items[Number(el.dataset.index)]);
    saveData();
    render();
    swallowNextClick();
}

document.getElementById('groceryList').addEventListener('pointerdown', (e) => {
    if (e.button > 0) return; // right or middle mouse button
    const row = e.target.closest('.grocery-item');
    // The checkbox and the group label keep their own tap behaviour
    if (!row || e.target.closest('input, .group-bullet, .group-dropdown')) return;

    cancelPress();
    const p = { row, pointerId: e.pointerId, startY: e.clientY, startX: e.clientX, lastY: e.clientY };
    p.timer = setTimeout(() => startDrag(p), HOLD_DELAY);
    press = p;
});

document.addEventListener('pointermove', (e) => {
    if (press && e.pointerId === press.pointerId) {
        if (Math.abs(e.clientY - press.startY) > HOLD_TOLERANCE ||
            Math.abs(e.clientX - press.startX) > HOLD_TOLERANCE) cancelPress();
        else press.lastY = e.clientY;
        return;
    }
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.clientY = e.clientY;
    moveRow(e.clientY);
});

document.addEventListener('pointerup', (e) => {
    if (press && e.pointerId === press.pointerId) cancelPress();
    else if (drag && e.pointerId === drag.pointerId) endDrag();
});

// A cancelled pointer (the browser took over the gesture) keeps the new order
document.addEventListener('pointercancel', (e) => {
    if (press && e.pointerId === press.pointerId) cancelPress();
    else if (drag && e.pointerId === drag.pointerId) endDrag();
});

// Hold the page still while a row is being dragged
document.addEventListener('touchmove', (e) => {
    if (drag) e.preventDefault();
}, { passive: false });

// No text selection menu on a long press
document.addEventListener('contextmenu', (e) => {
    if (drag || press) e.preventDefault();
});

// Add new item
function addItem(text, groupIndex) {
    if (!text.trim()) return;

    const groupValue = groupIndex !== '' ? parseInt(groupIndex) : null;
    const norm = normalizeKey(text);

    // Adding without a group shouldn't erase a remembered group
    const remembered = itemMemory[norm];
    const effectiveGroup = groupValue !== null ? groupValue
        : (remembered ? remembered.group : null);
    rememberItem(text, effectiveGroup);

    // Already on the list (possibly as singular/plural or different case)?
    // Revive it instead of adding a duplicate.
    const existingIndex = items.findIndex(item => normalizeKey(item.text) === norm);
    if (existingIndex !== -1) {
        const existing = items.splice(existingIndex, 1)[0];
        existing.checked = false;
        if (groupValue !== null) existing.group = groupValue;
        items.unshift(existing); // Move to top so the add visibly took effect
    } else {
        items.unshift({
            text: text.trim(),
            checked: false,
            group: effectiveGroup
        });
    }

    saveData();
    render();
}

// Clear checked items
function clearChecked() {
    items = items.filter(item => !item.checked);
    saveData();
    render();
}

// Handle new group creation
function handleGroupSelect() {
    const select = document.getElementById('groupSelect');
    if (select.value === 'new') {
        const groupName = prompt('Enter new group name:');
        if (groupName && groupName.trim()) {
            groups.push({
                name: groupName.trim(),
                color: getRandomColor()
            });
            saveData();
            updateGroupSelect();
            select.value = groups.length - 1; // Select the newly created group
        } else {
            select.value = ''; // Reset to "No group"
        }
    }
}

// Auto-select group based on item memory. Only clear a selection we made
// ourselves, so a group the user picked manually is left alone.
let groupAutoSelected = false;
function checkItemMemory() {
    const input = document.getElementById('newItemInput');
    const groupSelect = document.getElementById('groupSelect');
    const text = input.value.trim();
    const remembered = text ? itemMemory[normalizeKey(text)] : undefined;

    if (remembered !== undefined && remembered.group !== null) {
        groupSelect.value = remembered.group;
        groupAutoSelected = true;
    } else if (groupAutoSelected) {
        groupSelect.value = '';
        groupAutoSelected = false;
    }
}

// Fuzzy matching: score how well a query matches a candidate.
// Every query character must appear in the candidate, in order — otherwise
// returns 0 (no match). Higher score = better match.
function fuzzyScore(query, candidate) {
    const q = query.toLowerCase();
    const c = candidate.toLowerCase();

    if (c === q) return 0; // exact match = already fully typed, skip

    let score = 0;
    let ci = 0;
    let prevMatchIdx = -2;

    for (let qi = 0; qi < q.length; qi++) {
        const idx = c.indexOf(q[qi], ci);
        if (idx === -1) return 0;
        score += 1;
        // Consecutive character bonus
        if (idx === prevMatchIdx + 1) score += 3;
        // Word-start bonus ("pe" ranks "peanut butter" and "frozen peas" high)
        if (idx === 0 || c[idx - 1] === ' ') score += 2;
        prevMatchIdx = idx;
        ci = idx + 1;
    }

    // Strong prefix bonus
    if (c.startsWith(q)) score += q.length * 5;

    // Slight preference for shorter (closer-length) candidates
    score -= Math.abs(c.length - q.length) * 0.1;

    return score;
}

// Autocomplete: show suggestions from known items
let autocompleteIndex = -1;

function updateAutocomplete() {
    const input = document.getElementById('newItemInput');
    const dropdown = document.getElementById('autocompleteDropdown');
    const text = input.value.trim();

    if (!text) {
        dropdown.style.display = 'none';
        autocompleteIndex = -1;
        return;
    }

    // Fuzzy match known items against both the display text and the
    // normalized key (so "tomatoes" still finds "Tomato"). Ties break
    // toward the most recently used entry (memory is in recency order).
    const normText = normalizeKey(text);
    const matches = Object.entries(itemMemory)
        .map(([key, entry], recency) => ({
            entry,
            recency,
            score: Math.max(fuzzyScore(text, entry.text), fuzzyScore(normText, key))
        }))
        .filter(m => m.score > 0)
        .sort((a, b) => (b.score - a.score) || (b.recency - a.recency))
        .slice(0, 6);

    if (matches.length === 0) {
        dropdown.style.display = 'none';
        autocompleteIndex = -1;
        return;
    }

    dropdown.innerHTML = '';
    autocompleteIndex = -1;

    matches.forEach(({ entry }) => {
        const btn = document.createElement('button');
        btn.className = 'autocomplete-item';

        // Show group color dot if item has a remembered group
        const groupIdx = entry.group;
        if (groupIdx !== null && groups[groupIdx]) {
            const dot = document.createElement('span');
            dot.className = 'bullet-dot';
            dot.style.backgroundColor = groups[groupIdx].color;
            btn.appendChild(dot);
        }

        // Capitalize first letter for display
        const displayText = entry.text.charAt(0).toUpperCase() + entry.text.slice(1);
        btn.appendChild(document.createTextNode(displayText));

        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent input blur
            selectAutocomplete(displayText, groupIdx);
        });

        dropdown.appendChild(btn);
    });

    dropdown.style.display = 'block';
}

function selectAutocomplete(text, groupIdx) {
    const input = document.getElementById('newItemInput');
    const groupSelect = document.getElementById('groupSelect');
    const dropdown = document.getElementById('autocompleteDropdown');

    input.value = text;
    if (groupIdx !== undefined && groupIdx !== null) {
        groupSelect.value = groupIdx;
        groupAutoSelected = true;
    }
    dropdown.style.display = 'none';
    autocompleteIndex = -1;
    input.focus();
}

// Keyboard navigation for autocomplete
function handleAutocompleteKeys(e) {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (dropdown.style.display === 'none') return;

    const items = dropdown.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        autocompleteIndex = Math.min(autocompleteIndex + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle('selected', i === autocompleteIndex));
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        autocompleteIndex = Math.max(autocompleteIndex - 1, 0);
        items.forEach((el, i) => el.classList.toggle('selected', i === autocompleteIndex));
    } else if (e.key === 'Enter' && autocompleteIndex >= 0) {
        e.preventDefault();
        items[autocompleteIndex].dispatchEvent(new MouseEvent('mousedown'));
    }
}

// Event listeners
document.getElementById('newItemInput').addEventListener('input', () => {
    checkItemMemory();
    updateAutocomplete();
});

document.getElementById('newItemInput').addEventListener('keydown', handleAutocompleteKeys);

document.getElementById('newItemInput').addEventListener('blur', () => {
    document.getElementById('autocompleteDropdown').style.display = 'none';
    autocompleteIndex = -1;
});

document.getElementById('addItemForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('newItemInput');
    const groupSelect = document.getElementById('groupSelect');
    document.getElementById('autocompleteDropdown').style.display = 'none';
    addItem(input.value, groupSelect.value);
    input.value = '';
    groupSelect.value = ''; // Reset group selection
    groupAutoSelected = false;
});

document.getElementById('groupSelect').addEventListener('change', () => {
    groupAutoSelected = false; // user picked a group themselves
    handleGroupSelect();
});

document.getElementById('clearBtn').addEventListener('click', clearChecked);

// Initialize
loadData();
updateGroupSelect();
render();

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
