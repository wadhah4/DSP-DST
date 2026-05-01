// Global variables
let map;
let markersLayer;
let allWells = [];
let filteredWells = [];
let markers = {};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    populateDropdowns();
    displayAllWells();
    updateStats();
    attachEventListeners();
});

// Initialize Leaflet Map with proper icon setup
function initializeMap() {
    map = L.map('map').setView([24.0, 53.5], 6);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    markersLayer = L.featureGroup().addTo(map);
}

// Create custom colored markers using SVG
function createColoredMarker(color) {
    const colorMap = {
        'Flowing': '#4caf50',      // Green
        'Down': '#ff9800',         // Orange
        'Shut In': '#f44336',      // Red
        'Drilled': '#2196f3'       // Blue
    };

    const markerColor = colorMap[color] || '#9e9e9e'; // Grey default

    const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
            <path d="M12 0C7.03 0 3 4.03 3 9c0 5.25 9 15 9 15s9-9.75 9-15c0-4.97-4.03-9-9-9z" 
                  fill="${markerColor}" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="9" r="3" fill="white"/>
        </svg>
    `;

    return L.icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(svgIcon)}`,
        iconSize: [32, 41],
        iconAnchor: [16, 41],
        popupAnchor: [0, -41]
    });
}

// Populate dropdown selectors
function populateDropdowns() {
    allWells = [...wellsData];
    
    // Load saved data from localStorage if exists
    const savedData = localStorage.getItem('wellsData');
    if (savedData) {
        allWells = JSON.parse(savedData);
    }
    
    // Well dropdown
    const wellDropdown = document.getElementById('wellDropdown');
    allWells.forEach(well => {
        const option = document.createElement('option');
        option.value = well.Well_Name;
        option.textContent = `${well.Well_Name} (${well.Field})`;
        wellDropdown.appendChild(option);
    });

    // Field dropdown
    const fieldFilter = document.getElementById('fieldFilter');
    const fields = [...new Set(allWells.map(w => w.Field))].sort();
    fields.forEach(field => {
        const option = document.createElement('option');
        option.value = field;
        option.textContent = field;
        fieldFilter.appendChild(option);
    });
}

// Display all wells on map
function displayAllWells() {
    markersLayer.clearLayers();
    markers = {};
    filteredWells = [...allWells];

    filteredWells.forEach(well => {
        addWellMarker(well);
    });

    // Fit map bounds
    if (filteredWells.length > 0) {
        const bounds = L.latLngBounds(
            filteredWells.map(w => [w.Latitude, w.Longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Add well marker to map with proper color coding
function addWellMarker(well) {
    const marker = L.marker([well.Latitude, well.Longitude], { 
        icon: createColoredMarker(well.Status)
    })
    .bindPopup(`<strong>${well.Well_Name}</strong><br/>${well.Field}<br/><em>${well.Status}</em>`)
    .on('click', () => showWellDetails(well));

    markersLayer.addLayer(marker);
    markers[well.Well_Name] = marker;
}

// Show well details modal with edit capability
function showWellDetails(well) {
    const surveyInfo = calculateSurveyUrgency(well);
    
    const html = `
        <div class="well-details">
            <div class="well-header">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h2>${well.Well_Name}</h2>
                        <p><strong>Pad:</strong> ${well.Pad_Name}</p>
                    </div>
                    <button class="btn-edit" onclick="enableEditMode('${well.Well_Name}')">✏️ Edit</button>
                </div>
                <span class="status-badge status-${getStatusClass(well.Status)}">
                    ${well.Status}
                </span>
            </div>

            <div id="well-view-${well.Well_Name}">
                <div class="details-section">
                    <h3>📍 Location Information</h3>
                    <div class="detail-row">
                        <span class="detail-label">Latitude:</span>
                        <span class="detail-value">${well.Latitude.toFixed(4)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Longitude:</span>
                        <span class="detail-value">${well.Longitude.toFixed(4)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Field:</span>
                        <span class="detail-value">${well.Field}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Block:</span>
                        <span class="detail-value">${well.Block}</span>
                    </div>
                </div>

                <div class="details-section">
                    <h3>⚙️ Well Details</h3>
                    <div class="detail-row">
                        <span class="detail-label">Target Layer:</span>
                        <span class="detail-value">${well.Target_Layer}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Operator:</span>
                        <span class="detail-value">${well.Operator}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value">${well.Type}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Well Type:</span>
                        <span class="detail-value">${well.PAD_or_Well}</span>
                    </div>
                </div>

                <div class="details-section">
                    <h3>📊 Current Conditions</h3>
                    <div class="detail-row">
                        <span class="detail-label">Pressure (psi):</span>
                        <span class="detail-value">${well.Pressure_psi}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Temperature (°F):</span>
                        <span class="detail-value">${well.Temperature_F}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Flow Rate (bbl/d):</span>
                        <span class="detail-value">${well.Flow_Rate_bbl_d}</span>
                    </div>
                </div>

                <div class="details-section">
                    <h3>📅 Survey Schedule</h3>
                    <div class="detail-row">
                        <span class="detail-label">Last Survey Date:</span>
                        <span class="detail-value">${well.Last_Survey_Date}</span>
                    </div>
                    <div class="survey-urgency urgency-${surveyInfo.urgencyClass}">
                        ${surveyInfo.message}
                    </div>
                </div>

                <div class="details-section">
                    <h3>📝 Notes</h3>
                    <p style="color: #666; line-height: 1.6;">${well.Notes}</p>
                </div>
            </div>

            <div id="well-edit-${well.Well_Name}" style="display: none;">
                <div class="edit-form">
                    <div class="form-group">
                        <label>Status:</label>
                        <select id="edit-status-${well.Well_Name}">
                            <option value="Flowing" ${well.Status === 'Flowing' ? 'selected' : ''}>Flowing</option>
                            <option value="Down" ${well.Status === 'Down' ? 'selected' : ''}>Down</option>
                            <option value="Shut In" ${well.Status === 'Shut In' ? 'selected' : ''}>Shut In</option>
                            <option value="Drilled" ${well.Status === 'Drilled' ? 'selected' : ''}>Drilled</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Pressure (psi):</label>
                        <input type="number" id="edit-pressure-${well.Well_Name}" value="${well.Pressure_psi}">
                    </div>

                    <div class="form-group">
                        <label>Temperature (°F):</label>
                        <input type="number" id="edit-temperature-${well.Well_Name}" value="${well.Temperature_F}">
                    </div>

                    <div class="form-group">
                        <label>Flow Rate (bbl/d):</label>
                        <input type="number" id="edit-flow-rate-${well.Well_Name}" value="${well.Flow_Rate_bbl_d}">
                    </div>

                    <div class="form-group">
                        <label>Last Survey Date:</label>
                        <input type="date" id="edit-survey-date-${well.Well_Name}" value="${well.Last_Survey_Date}">
                    </div>

                    <div class="form-group">
                        <label>Notes:</label>
                        <textarea id="edit-notes-${well.Well_Name}" rows="3">${well.Notes}</textarea>
                    </div>

                    <div class="form-actions">
                        <button class="btn-save" onclick="saveWellChanges('${well.Well_Name}')">💾 Save Changes</button>
                        <button class="btn-cancel" onclick="cancelEditMode('${well.Well_Name}')">❌ Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('wellDetailsContainer').innerHTML = html;
    document.getElementById('wellModal').style.display = 'block';
}

// Enable edit mode
function enableEditMode(wellName) {
    document.getElementById(`well-view-${wellName}`).style.display = 'none';
    document.getElementById(`well-edit-${wellName}`).style.display = 'block';
}

// Cancel edit mode
function cancelEditMode(wellName) {
    document.getElementById(`well-view-${wellName}`).style.display = 'block';
    document.getElementById(`well-edit-${wellName}`).style.display = 'none';
}

// Save well changes
function saveWellChanges(wellName) {
    const wellIndex = allWells.findIndex(w => w.Well_Name === wellName);
    if (wellIndex !== -1) {
        const status = document.getElementById(`edit-status-${wellName}`).value;
        const pressure = document.getElementById(`edit-pressure-${wellName}`).value;
        const temperature = document.getElementById(`edit-temperature-${wellName}`).value;
        const flowRate = document.getElementById(`edit-flow-rate-${wellName}`).value;
        const surveyDate = document.getElementById(`edit-survey-date-${wellName}`).value;
        const notes = document.getElementById(`edit-notes-${wellName}`).value;

        // Update the well data
        allWells[wellIndex].Status = status;
        allWells[wellIndex].Pressure_psi = parseInt(pressure);
        allWells[wellIndex].Temperature_F = parseInt(temperature);
        allWells[wellIndex].Flow_Rate_bbl_d = parseInt(flowRate);
        allWells[wellIndex].Last_Survey_Date = surveyDate;
        allWells[wellIndex].Notes = notes;

        // Save to localStorage
        localStorage.setItem('wellsData', JSON.stringify(allWells));

        // Refresh the map
        displayAllWells();
        updateStats();

        // Show the updated details
        const updatedWell = allWells[wellIndex];
        showWellDetails(updatedWell);

        alert('✅ Well data saved successfully!');
    }
}

// Calculate survey urgency
function calculateSurveyUrgency(well) {
    const lastSurveyDate = new Date(well.Last_Survey_Date);
    const today = new Date('2026-05-01'); // Current date in context
    const daysSinceLastSurvey = Math.floor((today - lastSurveyDate) / (1000 * 60 * 60 * 24));

    let dueDays;
    if (well.Status === 'Flowing') {
        dueDays = 30;
    } else if (well.Status === 'Down') {
        dueDays = 60;
    } else {
        return {
            message: '⏸️ Special Status - Survey not immediately required',
            urgencyClass: 'ok'
        };
    }

    const daysRemaining = dueDays - daysSinceLastSurvey;

    if (daysRemaining < 0) {
        return {
            message: `🔴 OVERDUE! Last surveyed ${daysSinceLastSurvey} days ago. Schedule immediately.`,
            urgencyClass: 'overdue'
        };
    } else if (daysRemaining < 7) {
        return {
            message: `🟡 DUE SOON! Survey due in ${daysRemaining} days`,
            urgencyClass: 'due'
        };
    } else {
        return {
            message: `🟢 OK - Next survey due in ${daysRemaining} days`,
            urgencyClass: 'ok'
        };
    }
}

// Get status CSS class
function getStatusClass(status) {
    switch(status) {
        case 'Flowing': return 'flowing';
        case 'Down': return 'down';
        case 'Shut In': return 'shutin';
        case 'Drilled': return 'drilled';
        default: return 'ok';
    }
}

// Apply filters
function applyFilters() {
    const wellName = document.getElementById('wellDropdown').value;
    const field = document.getElementById('fieldFilter').value;
    const status = document.getElementById('statusFilter').value;

    filteredWells = allWells.filter(well => {
        const matchWell = !wellName || well.Well_Name === wellName;
        const matchField = !field || well.Field === field;
        const matchStatus = !status || well.Status === status;
        return matchWell && matchField && matchStatus;
    });

    displayFilteredWells();
    updateStats();
}

// Display filtered wells
function displayFilteredWells() {
    markersLayer.clearLayers();
    
    filteredWells.forEach(well => {
        addWellMarker(well);
    });

    if (filteredWells.length > 0) {
        const bounds = L.latLngBounds(
            filteredWells.map(w => [w.Latitude, w.Longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Update statistics
function updateStats() {
    document.getElementById('totalWells').textContent = allWells.length;
    document.getElementById('activeWells').textContent = 
        allWells.filter(w => w.Status === 'Flowing').length;
    document.getElementById('inactiveWells').textContent = 
        allWells.filter(w => w.Status === 'Down').length;
    document.getElementById('shutInWells').textContent = 
        allWells.filter(w => w.Status === 'Shut In').length;
}

// Generate comprehensive report
function generateReport() {
    const reportDate = new Date().toLocaleDateString();
    let reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>UAE Well Survey Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #1a237e; text-align: center; }
                .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #1a237e; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                tr:hover { background: #f5f5f5; }
                .status-flowing { background: #e8f5e9; color: #2e7d32; }
                .status-down { background: #fff3e0; color: #e65100; }
                .status-shutin { background: #ffebee; color: #c62828; }
                .status-drilled { background: #e3f2fd; color: #1565c0; }
                .urgency-overdue { color: #f44336; font-weight: bold; }
                .urgency-due { color: #ff9800; font-weight: bold; }
                .urgency-ok { color: #4caf50; font-weight: bold; }
                .page-break { page-break-after: always; }
                .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
            </style>
        </head>
        <body>
            <h1>🛢️ UAE Oil & Gas Well Survey Program Report</h1>
            <p style="text-align: center; color: #666;">Generated: ${reportDate}</p>

            <div class="summary">
                <h2>Summary Statistics</h2>
                <p><strong>Total Wells:</strong> ${allWells.length}</p>
                <p><strong>Active (Flowing):</strong> ${allWells.filter(w => w.Status === 'Flowing').length}</p>
                <p><strong>Inactive (Down):</strong> ${allWells.filter(w => w.Status === 'Down').length}</p>
                <p><strong>Shut In:</strong> ${allWells.filter(w => w.Status === 'Shut In').length}</p>
                <p><strong>Drilled:</strong> ${allWells.filter(w => w.Status === 'Drilled').length}</p>
            </div>

            <h2>Well Status Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>Well Name</th>
                        <th>Field</th>
                        <th>Status</th>
                        <th>Type</th>
                        <th>Pressure (psi)</th>
                        <th>Temperature (°F)</th>
                        <th>Flow Rate (bbl/d)</th>
                        <th>Last Survey</th>
                        <th>Survey Status</th>
                    </tr>
                </thead>
                <tbody>
    `;

    allWells.forEach(well => {
        const surveyInfo = calculateSurveyUrgency(well);
        const statusClass = getStatusClass(well.Status);
        reportHTML += `
            <tr>
                <td><strong>${well.Well_Name}</strong></td>
                <td>${well.Field}</td>
                <td><span class="status-${statusClass}">${well.Status}</span></td>
                <td>${well.Type}</td>
                <td>${well.Pressure_psi}</td>
                <td>${well.Temperature_F}</td>
                <td>${well.Flow_Rate_bbl_d}</td>
                <td>${well.Last_Survey_Date}</td>
                <td><span class="urgency-${surveyInfo.urgencyClass}">${surveyInfo.message}</span></td>
            </tr>
        `;
    });

    reportHTML += `
                </tbody>
            </table>

            <div class="page-break"></div>
            <h2>Well Conditions Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>Well Name</th>
                        <th>Field</th>
                        <th>Block</th>
                        <th>Target Layer</th>
                        <th>Operator</th>
                        <th>Location (Lat, Long)</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
    `;

    allWells.forEach(well => {
        reportHTML += `
            <tr>
                <td><strong>${well.Well_Name}</strong></td>
                <td>${well.Field}</td>
                <td>${well.Block}</td>
                <td>${well.Target_Layer}</td>
                <td>${well.Operator}</td>
                <td>${well.Latitude.toFixed(4)}, ${well.Longitude.toFixed(4)}</td>
                <td>${well.Notes}</td>
            </tr>
        `;
    });

    reportHTML += `
                </tbody>
            </table>

            <div class="footer">
                <p>This report was automatically generated by the UAE Well Survey Program Tool</p>
            </div>
        </body>
        </html>
    `;

    // Open in new window for printing
    const newWindow = window.open();
    newWindow.document.write(reportHTML);
    newWindow.document.close();
}

// Export to CSV
function exportToCSV() {
    let csv = 'Well_Name,Pad_Name,Field,Block,Status,Type,Pressure_psi,Temperature_F,Flow_Rate_bbl_d,Last_Survey_Date,Latitude,Longitude,Notes\n';

    allWells.forEach(well => {
        csv += `"${well.Well_Name}","${well.Pad_Name}","${well.Field}","${well.Block}","${well.Status}","${well.Type}",${well.Pressure_psi},${well.Temperature_F},${well.Flow_Rate_bbl_d},"${well.Last_Survey_Date}",${well.Latitude},${well.Longitude},"${well.Notes}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UAE_Wells_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// Attach event listeners
function attachEventListeners() {
    document.getElementById('wellDropdown').addEventListener('change', applyFilters);
    document.getElementById('fieldFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('resetBtn').addEventListener('click', resetFilters);
    document.getElementById('reportBtn').addEventListener('click', generateReport);
    document.getElementById('csvBtn').addEventListener('click', exportToCSV);

    // Modal close handlers
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('wellModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Reset filters
function resetFilters() {
    document.getElementById('wellDropdown').value = '';
    document.getElementById('fieldFilter').value = '';
    document.getElementById('statusFilter').value = '';
    displayAllWells();
    updateStats();
}

// Close modal
function closeModal() {
    document.getElementById('wellModal').style.display = 'none';
}