import { apiUrl } from './config.js';

function showError(containerId, message) {
    document.getElementById(containerId).innerHTML =
        `<div class="alert alert-danger">${message}</div>`;
}

function showLoading(containerId) {
    document.getElementById(containerId).innerHTML =
        '<div class="loading"><div class="spinner-border" role="status"></div><p>Loading plot...</p></div>';
}

function showPlot(containerId, plotData) {
    document.getElementById(containerId).innerHTML =
        `<img src="data:image/png;base64,${plotData}" class="plot-image" alt="Plot">`;
}

async function fetchVehiclesIds(apiUrl) {
    const url = apiUrl + '/api/vehicles';
    const vehicles = [];
    try {
        const response = await fetch(url);
        if (!response.ok) {
            showError('vehicle-selection', 'Failed to fetch vehicle IDs.');
            return [];
        }
        const data = await response.json();
        vehicles.push(...data.data.map(vehicle => vehicle));
    } catch (error) {
        showError('vehicle-selection', 'Network error while fetching vehicle IDs.');
        return [];
    }

    return vehicles;
}

export async function fillVehicleSelection(apiUrl) {
    let vehicles = await fetchVehiclesIds(apiUrl);
    const $select = $('#vehicle-selection');
    vehicles.forEach(vehicle_id => {
        const $div = `<div class="form-check"><input class="form-check-input vehicle-checkbox" type="checkbox" 
                        value="${vehicle_id}" id="vehicle_${vehicle_id}">
                        <label class="form-check-label" for="vehicle_${vehicle_id}">
                        Vehicle ${vehicle_id}
                        </label>
                        </div>`
        $select.append($div);
    });
}

async function fetchFields(apiUrl) {
    const url = apiUrl + '/api/fields';
    let data = {};
    try {
        const response = await fetch(url);
        if (!response.ok) {
            showError('field-selection', 'Failed to fetch fields.');
            return {};
        }
        data = await response.json();
    } catch (error) {
        showError('field-selection', 'Network error while fetching fields.');
        return {};
    }

    return data.data;
}

export async function fillFieldSelection(apiUrl) {
    var staticFields = await fetchFields(apiUrl);
    const $select = $('#fieldSelect');
    Object.entries(staticFields).forEach(([key, value]) => {
        const $option = `<option value="${key}">${value}</option>`;
        $select.append($option);
    });
}

// Select all functionality
document.getElementById('selectAll').addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('.vehicle-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
    });
})

function getSelectedVehicles() {
    const selected = [];
    document.querySelectorAll('.vehicle-checkbox:checked').forEach(checkbox => {
        selected.push(checkbox.value);
    });
    return selected;
}

function getSelectedField() {
    return document.getElementById('fieldSelect').value;
}

export async function generateTimeSeriesPlot() {
    const vehicles = getSelectedVehicles();
    const _field = getSelectedField();
    if (vehicles.length === 0) {
        alert('Please select at least one vehicle.');
        return;
    }

    showLoading('plotContainer');
    const url = apiUrl + '/api/plot/timeseries';
    const body = {
        units_id: vehicles,
        field: _field
    };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            showError('plotContainer', 'Failed to generate plot.');
            return;
        }
        const data = await response.json();
        if (data.status === 400) {
            showError('plotContainer', data.data);
            return;
        }
        showPlot('plotContainer', data.data);
    } catch (error) {
        showError('plotContainer', 'Network error while generating plot.');
    }
}

export async function generateDistributionPlot() {
    const vehicles = getSelectedVehicles();
    if (vehicles.length === 0) {
        alert('Please select at least one vehicle');
        return;
    }

    //document.getElementById('field2Container').style.display = 'none';
    showLoading('plotContainer');

    const field = getSelectedField();
    const body = {
        units_id: vehicles,
        field: field
    };
    const url = new URL(apiUrl + '/api/plot/distribution');
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            showError('plotContainer', 'Failed to generate plot.');
            return;
        }
        const data = await response.json();
        if (data.status === 400) {
            showError('plotContainer', data.data);
            return;
        }
        showPlot('plotContainer', data.data);
    } catch (error) {
        showError('plotContainer', 'Network error while generating plot.');
        return;
    }
}

export async function generateBoxPlot() {
    const vehicles = getSelectedVehicles();
    if (vehicles.length === 0) {
        alert('Please select at least one vehicle');
        return;
    }

    //scatterMode = false;
    //document.getElementById('field2Container').style.display = 'none';

    showLoading('plotContainer');

    const field = getSelectedField();
    const body = {
        units_id: vehicles,
        field: field
    };
    const url = new URL(apiUrl + '/api/plot/boxplot');
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            showError('plotContainer', 'Failed to generate plot.');
            return;
        }
        const data = await response.json();
        if (data.status === 400) {
            showError('plotContainer', data.data);
            return;
        }
        showPlot('plotContainer', data.data);
    } catch (error) {
        showError('plotContainer', 'Network error while generating plot.');
        return;
    }
}
