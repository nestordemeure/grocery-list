// Default groups with colors
const defaultGroups = [
    { name: 'Whole Foods', color: '#4CAF50' },
    { name: 'Trader Joe\'s', color: '#FF5722' },
    { name: 'Indian Store', color: '#FF9800' }
];

// State
let items = [];
let groups = [];
let itemMemory = {}; // Maps item text (lowercase) to group index

// Load from localStorage
function loadData() {
    const savedItems = localStorage.getItem('groceryItems');
    const savedGroups = localStorage.getItem('groceryGroups');
    const savedMemory = localStorage.getItem('itemMemory');

    items = savedItems ? JSON.parse(savedItems) : [];
    groups = savedGroups ? JSON.parse(savedGroups) : defaultGroups;
    itemMemory = savedMemory ? JSON.parse(savedMemory) : {};
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

// Render items
function render() {
    const list = document.getElementById('groceryList');
    list.innerHTML = '';

    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `grocery-item ${item.checked ? 'checked' : ''}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.checked;
        checkbox.id = `item-${index}`;
        checkbox.addEventListener('change', () => toggleItem(index));

        const label = document.createElement('label');
        label.htmlFor = `item-${index}`;
        label.textContent = item.text;

        div.appendChild(checkbox);
        div.appendChild(label);

        if (item.group !== null && item.group !== undefined && groups[item.group]) {
            const groupLabel = document.createElement('span');
            groupLabel.className = 'group-label';
            groupLabel.textContent = groups[item.group].name;
            groupLabel.style.backgroundColor = groups[item.group].color;
            groupLabel.style.color = '#fff';
            div.appendChild(groupLabel);
        }

        list.appendChild(div);
    });
}

// Add new item
function addItem(text, groupIndex) {
    if (!text.trim()) return;

    const groupValue = groupIndex !== '' ? parseInt(groupIndex) : null;
    const item = {
        text: text.trim(),
        checked: false,
        group: groupValue
    };

    // Remember this item's group for future use
    if (groupValue !== null) {
        itemMemory[text.trim().toLowerCase()] = groupValue;
    }

    items.unshift(item); // Add to top
    saveData();
    render();
}

// Toggle item checked state
function toggleItem(index) {
    items[index].checked = !items[index].checked;
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

// Auto-select group based on item memory
function checkItemMemory() {
    const input = document.getElementById('newItemInput');
    const groupSelect = document.getElementById('groupSelect');
    const text = input.value.trim().toLowerCase();

    if (text && itemMemory[text] !== undefined) {
        groupSelect.value = itemMemory[text];
    }
}

// Event listeners
document.getElementById('newItemInput').addEventListener('input', checkItemMemory);

document.getElementById('addItemForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('newItemInput');
    const groupSelect = document.getElementById('groupSelect');
    addItem(input.value, groupSelect.value);
    input.value = '';
    groupSelect.value = ''; // Reset group selection
});

document.getElementById('groupSelect').addEventListener('change', handleGroupSelect);

document.getElementById('clearBtn').addEventListener('click', clearChecked);

// Initialize
loadData();
updateGroupSelect();
render();

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
