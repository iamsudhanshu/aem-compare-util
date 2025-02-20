document.addEventListener('DOMContentLoaded', () => {
    const compareBtn = document.getElementById('compareBtn');
    const comparePackagesBtn = document.getElementById('comparePackagesBtn');
    const json1 = document.getElementById('json1');
    const json2 = document.getElementById('json2');
    const result = document.getElementById('result');
    const file1 = document.getElementById('file1');
    const file2 = document.getElementById('file2');
    const modal = document.getElementById('helpModal');
    const helpBtn = document.getElementById('helpBtn');
    const closeBtn = document.querySelector('.close');
    
    function findDifferences(arr1, arr2) {
        const differences = [];
        const map1 = new Map(arr1.map(item => [item.symbolicName, item]));
        const map2 = new Map(arr2.map(item => [item.symbolicName, item]));

        // Check items in first array
        for (const [symbolicName, item1] of map1) {
            const item2 = map2.get(symbolicName);
            if (!item2) {
                differences.push({
                    symbolicName,
                    name: item1.name || '',
                    version1: item1.version || '',
                    state1: item1.state || '',
                    version2: '',
                    state2: '',
                    status: 'Only in First JSON'
                });
                continue;
            }

            // Compare version and state
            if (item1.version !== item2.version || item1.state !== item2.state) {
                differences.push({
                    symbolicName,
                    name: item1.name || item2.name || '',
                    version1: item1.version || '',
                    state1: item1.state || '',
                    version2: item2.version || '',
                    state2: item2.state || '',
                    status: 'Different Values'
                });
            }
        }

        // Check for items only in second array
        for (const [symbolicName, item2] of map2) {
            if (!map1.has(symbolicName)) {
                differences.push({
                    symbolicName,
                    name: item2.name || '',
                    version1: '',
                    state1: '',
                    version2: item2.version || '',
                    state2: item2.state || '',
                    status: 'Only in Second JSON'
                });
            }
        }

        return differences;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // Return original if invalid
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString; // Return original if parsing fails
        }
    }

    function formatSize(bytes) {
        if (!bytes || isNaN(bytes)) return '';
        
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = parseInt(bytes);
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        // Round to 2 decimal places
        return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
    }

    function findPackageDifferences(packages1, packages2) {
        const differences = [];
        
        // Create maps using composite key of name and group
        const map1 = new Map(packages1.results.map(item => [`${item.name}_${item.group}`, item]));
        const map2 = new Map(packages2.results.map(item => [`${item.name}_${item.group}`, item]));

        // Check items in first array
        for (const [key, item1] of map1) {
            const item2 = map2.get(key);
            if (!item2) {
                differences.push({
                    name: item1.name,
                    symbolicName: item1.group || '',
                    version1: item1.version || '',
                    created1: formatDate(item1.created) || '',
                    size1: formatSize(item1.size),
                    state1: item1.installed ? 'Installed' : 'Not Installed',
                    version2: '',
                    created2: '',
                    size2: '',
                    state2: '',
                    status: 'Only in First JSON'
                });
                continue;
            }

            // Compare versions, created date, size and installation state
            if (item1.version !== item2.version || 
                item1.created !== item2.created || 
                item1.size !== item2.size || 
                item1.installed !== item2.installed) {
                differences.push({
                    name: item1.name,
                    symbolicName: item1.group || '',
                    version1: item1.version || '',
                    created1: formatDate(item1.created) || '',
                    size1: formatSize(item1.size),
                    state1: item1.installed ? 'Installed' : 'Not Installed',
                    version2: item2.version || '',
                    created2: formatDate(item2.created) || '',
                    size2: formatSize(item2.size),
                    state2: item2.installed ? 'Installed' : 'Not Installed',
                    status: 'Different Values'
                });
            }
        }

        // Check for items only in second array
        for (const [key, item2] of map2) {
            if (!map1.has(key)) {
                differences.push({
                    name: item2.name,
                    symbolicName: item2.group || '',
                    version1: '',
                    created1: '',
                    size1: '',
                    state1: '',
                    version2: item2.version || '',
                    created2: formatDate(item2.created) || '',
                    size2: formatSize(item2.size),
                    state2: item2.installed ? 'Installed' : 'Not Installed',
                    status: 'Only in Second JSON'
                });
            }
        }

        return differences;
    }

    function sortData(data, key, direction = 'asc') {
        return [...data].sort((a, b) => {
            let valueA = a[key] || '';
            let valueB = b[key] || '';
            
            // Handle '' values
            if (valueA === '') valueA = direction === 'asc' ? '\uffff' : '';
            if (valueB === '') valueB = direction === 'asc' ? '\uffff' : '';
            
            if (valueA < valueB) return direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function getStatusIcon(status) {
        switch (status) {
            case 'Different Values':
                return '<i class="fas fa-exchange-alt" title="Different Values"></i>';
            case 'Only in First JSON':
                return '<i class="fas fa-minus-circle" title="Only in First JSON"></i>';
            case 'Only in Second JSON':
                return '<i class="fas fa-plus-circle" title="Only in Second JSON"></i>';
            default:
                return status;
        }
    }

    function createTable(differences, type = 'bundles') {
        if (differences.length === 0) {
            return '<p class="success">No differences found in the data arrays!</p>';
        }

        // Define columns configuration based on type
        let columns;
        if (type === 'bundles') {
            columns = [
                { key: 'name', label: 'Name', rowspan: 2 },
                { key: 'symbolicName', label: 'Symbolic Name', rowspan: 2 },
                { key: 'status', label: 'Status', rowspan: 2, format: (value) => getStatusIcon(value) },
                { key: 'version1', label: 'Version', group: 'First JSON' },
                { key: 'state1', label: 'State', group: 'First JSON' },
                { key: 'version2', label: 'Version', group: 'Second JSON' },
                { key: 'state2', label: 'State', group: 'Second JSON' }
            ];
        } else {
            columns = [
                { key: 'name', label: 'Name', rowspan: 2 },
                { key: 'symbolicName', label: 'Symbolic Name', rowspan: 2 },
                { key: 'status', label: 'Status', rowspan: 2, format: (value) => getStatusIcon(value) },
                { key: 'version1', label: 'Version', group: 'First JSON' },
                { key: 'created1', label: 'Created', group: 'First JSON' },
                { key: 'size1', label: 'Size', group: 'First JSON' },
                { key: 'version2', label: 'Version', group: 'Second JSON' },
                { key: 'created2', label: 'Created', group: 'Second JSON' },
                { key: 'size2', label: 'Size', group: 'Second JSON' }
            ];
        }

        // Group columns by their headers
        const groupedColumns = columns.reduce((acc, col) => {
            if (col.group) {
                if (!acc[col.group]) {
                    acc[col.group] = [];
                }
                acc[col.group].push(col);
            }
            return acc;
        }, {});

        return `
            <table id="diffTable">
                <thead>
                    <tr>
                        ${columns
                            .filter(col => !col.group)
                            .map(col => `
                                <th rowspan="${col.rowspan}" data-key="${col.key}">
                                    ${col.label}
                                    <span class="sort-icon">↕</span>
                                </th>
                            `).join('')}
                        ${Object.entries(groupedColumns)
                            .map(([group, cols]) => `
                                <th colspan="${cols.length}">${group}</th>
                            `).join('')}
                    </tr>
                    <tr>
                        ${Object.values(groupedColumns)
                            .flat()
                            .map(col => `
                                <th data-key="${col.key}">
                                    ${col.label}
                                    <span class="sort-icon">↕</span>
                                </th>
                            `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${differences.map(diff => {
                        if (type === 'bundles') {
                            return `
                                <tr>
                                    <td>${diff.name}</td>
                                    <td>${diff.symbolicName}</td>
                                    <td>${getStatusIcon(diff.status)}</td>
                                    <td class="${diff.status === 'Different Values' && diff.version1 !== diff.version2 ? 'different-value' : ''}">${diff.version1}</td>
                                    <td class="${diff.status === 'Different Values' && diff.state1 !== diff.state2 ? 'different-value' : ''}">${diff.state1}</td>
                                    <td class="${diff.status === 'Different Values' && diff.version1 !== diff.version2 ? 'different-value' : ''}">${diff.version2}</td>
                                    <td class="${diff.status === 'Different Values' && diff.state1 !== diff.state2 ? 'different-value' : ''}">${diff.state2}</td>
                                </tr>
                            `;
                        } else {
                            return `
                                <tr>
                                    <td>${diff.name}</td>
                                    <td>${diff.symbolicName}</td>
                                    <td>${getStatusIcon(diff.status)}</td>
                                    <td class="${diff.status === 'Different Values' && diff.version1 !== diff.version2 ? 'different-value' : ''}">${diff.version1}</td>
                                    <td>${diff.created1}</td>
                                    <td class="${diff.status === 'Different Values' && diff.size1 !== diff.size2 ? 'different-value' : ''}">${diff.size1}</td>
                                    <td class="${diff.status === 'Different Values' && diff.version1 !== diff.version2 ? 'different-value' : ''}">${diff.version2}</td>
                                    <td>${diff.created2}</td>
                                    <td class="${diff.status === 'Different Values' && diff.size1 !== diff.size2 ? 'different-value' : ''}">${diff.size2}</td>
                                </tr>
                            `;
                        }
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    function initializeTableSort(differences, type = 'bundles') {
        const table = document.getElementById('diffTable');
        if (!table) return;

        let currentSort = {
            key: null,
            direction: 'asc'
        };

        table.querySelectorAll('th').forEach(th => {
            th.style.cursor = 'pointer';
            
            th.addEventListener('click', () => {
                const key = th.dataset.key;
                
                // Update sort direction
                if (currentSort.key === key) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.key = key;
                    currentSort.direction = 'asc';
                }

                // Update sort icons
                table.querySelectorAll('.sort-icon').forEach(icon => {
                    icon.textContent = '↕';
                });
                th.querySelector('.sort-icon').textContent = 
                    currentSort.direction === 'asc' ? '↓' : '↑';

                // Sort the data
                const sortedDiffs = sortData(differences, key, currentSort.direction);
                
                // Update table body
                const tbody = table.querySelector('tbody');
                tbody.innerHTML = sortedDiffs.map(diff => {
                    if (type === 'bundles') {
                        return `
                            <tr>
                                <td>${diff.name}</td>
                                <td>${diff.symbolicName}</td>
                                <td>${getStatusIcon(diff.status)}</td>
                                <td class="${diff.status === 'Different Values' && diff.version1 !== diff.version2 ? 'different-value' : ''}">${diff.version1}</td>
                                <td class="${diff.status === 'Different Values' && diff.state1 !== diff.state2 ? 'different-value' : ''}">${diff.state1}</td>
                                <td class="${diff.status === 'Different Values' && diff.version1 !== diff.version2 ? 'different-value' : ''}">${diff.version2}</td>
                                <td class="${diff.status === 'Different Values' && diff.state1 !== diff.state2 ? 'different-value' : ''}">${diff.state2}</td>
                            </tr>
                        `;
                    } else {
                        return `
                            <tr>
                                <td>${diff.name}</td>
                                <td>${diff.symbolicName}</td>
                                <td>${getStatusIcon(diff.status)}</td>
                                <td class="${diff.status === 'Different Values' && diff.version1 !== diff.version2 ? 'different-value' : ''}">${diff.version1}</td>
                                <td>${diff.created1}</td>
                                <td class="${diff.status === 'Different Values' && diff.size1 !== diff.size2 ? 'different-value' : ''}">${diff.size1}</td>
                                <td class="${diff.status === 'Different Values' && diff.version1 !== diff.version2 ? 'different-value' : ''}">${diff.version2}</td>
                                <td>${diff.created2}</td>
                                <td class="${diff.status === 'Different Values' && diff.size1 !== diff.size2 ? 'different-value' : ''}">${diff.size2}</td>
                            </tr>
                        `;
                    }
                }).join('');
            });
        });
    }

    compareBtn.addEventListener('click', () => {
        try {
            const obj1 = JSON.parse(json1.value);
            const obj2 = JSON.parse(json2.value);

            if (!obj1.data || !obj2.data || !Array.isArray(obj1.data) || !Array.isArray(obj2.data)) {
                throw new Error("Both JSONs must contain a 'data' array");
            }

            const differences = findDifferences(obj1.data, obj2.data);

            result.style.display = 'block';
            result.innerHTML = createTable(differences, 'bundles');
            
            // Initialize sorting after creating the table
            initializeTableSort(differences, 'bundles');

        } catch (error) {
            result.style.display = 'block';
            result.className = 'error';
            result.textContent = 'Error: ' + error.message;
        }
    });

    comparePackagesBtn.addEventListener('click', () => {
        try {
            const obj1 = JSON.parse(json1.value);
            const obj2 = JSON.parse(json2.value);

            if (!obj1.results || !obj2.results || !Array.isArray(obj1.results) || !Array.isArray(obj2.results)) {
                throw new Error("Both JSONs must contain a 'results' array");
            }

            const differences = findPackageDifferences(obj1, obj2);
            result.style.display = 'block';
            result.innerHTML = createTable(differences, 'packages');
            
            // Initialize sorting after creating the table
            initializeTableSort(differences, 'packages');

        } catch (error) {
            result.style.display = 'block';
            result.className = 'error';
            result.textContent = 'Error: ' + error.message;
        }
    });

    // Add file upload handlers
    function handleFileUpload(file, textarea) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // Try to parse JSON to validate it
                JSON.parse(e.target.result);
                // If valid, set the textarea value
                textarea.value = e.target.result;
            } catch (error) {
                alert('Invalid JSON file: ' + error.message);
            }
        };
        
        reader.onerror = function() {
            alert('Error reading file');
        };
        
        if (file) {
            reader.readAsText(file);
        }
    }

    file1.addEventListener('change', (e) => {
        handleFileUpload(e.target.files[0], json1);
    });

    file2.addEventListener('change', (e) => {
        handleFileUpload(e.target.files[0], json2);
    });

    // Modal functionality
    helpBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });

    // Close modal on escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });

    // Add copy functionality
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const textToCopy = button.getAttribute('data-text');
            
            try {
                await navigator.clipboard.writeText(textToCopy);
                
                // Visual feedback
                button.classList.add('copied');
                const icon = button.querySelector('i');
                icon.classList.remove('fa-copy');
                icon.classList.add('fa-check');
                
                // Reset after 1.5 seconds
                setTimeout(() => {
                    button.classList.remove('copied');
                    icon.classList.remove('fa-check');
                    icon.classList.add('fa-copy');
                }, 1500);
                
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        });
    });

    // Add event listeners for both textareas and file inputs
    document.getElementById('json1').addEventListener('input', () => validateJson(1));
    document.getElementById('json2').addEventListener('input', () => validateJson(2));
    document.getElementById('file1').addEventListener('change', (e) => handleFileUpload(e, 1));
    document.getElementById('file2').addEventListener('change', (e) => handleFileUpload(e, 2));

    // Restructure the button group
    const buttonGroup = document.querySelector('.button-group');
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';

    // Move the buttons into the new container
    const buttons = buttonGroup.querySelectorAll('button');
    buttons.forEach(button => {
        buttonContainer.appendChild(button);
        // Initially disable all buttons
        button.disabled = true;
    });

    // Add the button container as the first child
    buttonGroup.insertBefore(buttonContainer, buttonGroup.firstChild);

    // Add validation message div after the button container
    const validationMsg = document.createElement('div');
    validationMsg.id = 'validationMessage';
    buttonGroup.appendChild(validationMsg);
    // Set initial validation message
    validationMsg.textContent = 'Provide valid Bundle/Package JSON for comparison';

    // Track JSON types
    let json1Type = '';
    let json2Type = '';

    function validateJson(inputNum) {
        const jsonInput = document.getElementById(`json${inputNum}`);
        const jsonLabel = jsonInput.closest('.textarea-wrapper').querySelector('h3');
        const baseLabel = `${inputNum === 1 ? 'First' : 'Second'} JSON`;
        
        try {
            const jsonData = JSON.parse(jsonInput.value);
            
            if (jsonData.data) {
                jsonLabel.innerHTML = `${baseLabel} <span style="color: green">(Valid Bundle JSON)</span>`;
                inputNum === 1 ? json1Type = 'bundle' : json2Type = 'bundle';
            } else if (jsonData.results) {
                jsonLabel.innerHTML = `${baseLabel} <span style="color: green">(Valid Package JSON)</span>`;
                inputNum === 1 ? json1Type = 'package' : json2Type = 'package';
            } else {
                jsonLabel.innerHTML = `${baseLabel} <span style="color: red">(Invalid JSON)</span>`;
                inputNum === 1 ? json1Type = '' : json2Type = '';
            }
        } catch (e) {
            if (jsonInput.value.trim() !== '') {
                jsonLabel.innerHTML = `${baseLabel} <span style="color: red">(Invalid JSON)</span>`;
            } else {
                jsonLabel.innerHTML = baseLabel;
            }
            inputNum === 1 ? json1Type = '' : json2Type = '';
        }

        updateButtonStates();
    }

    function updateButtonStates() {
        const compareBundlesBtn = document.getElementById('compareBtn');
        const comparePackagesBtn = document.getElementById('comparePackagesBtn');
        const validationMessage = document.getElementById('validationMessage');

        // Disable both buttons by default
        compareBundlesBtn.disabled = true;
        comparePackagesBtn.disabled = true;
        
        // Clear validation message
        validationMessage.textContent = '';

        // Enable appropriate button or show message
        if (json1Type === 'bundle' && json2Type === 'bundle') {
            compareBundlesBtn.disabled = false;
        } else if (json1Type === 'package' && json2Type === 'package') {
            comparePackagesBtn.disabled = false;
        } else if (json1Type && json2Type && json1Type !== json2Type) {
            validationMessage.textContent = 'Please provide same type of JSON (both Bundle or both Package) for comparison';
        } else if (json1Type || json2Type) {
            validationMessage.textContent = 'Please provide valid JSON in both inputs for comparison';
        }
    }

    function handleFileUpload(event, inputNum) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById(`json${inputNum}`).value = e.target.result;
                validateJson(inputNum);
            };
            reader.readAsText(file);
        }
    }
});