function showError(containerId, message) {
    document.getElementById(containerId).innerHTML =
        `<div class="alert alert-danger">${message}</div>`;
}

async function fetchVehiclesIds(apiUrl) {
    const url = apiUrl + '/api/vehicles';
    const vehicles = [];
    try {
        const response = await fetch(url);
        if (!response.ok) {
            showError('container', 'Failed to fetch vehicle IDs.');
            return [];
        }
        const data = await response.json();
        vehicles.push(...data.data.map(vehicle => vehicle));
    } catch (error) {
        showError('container', 'Network error while fetching vehicle IDs.');
        return [];
    }

    return vehicles;
}

async function fillVehicleSelection(apiUrl) {
    vehicles = await fetchVehiclesIds(apiUrl);
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
    try {
        const response = await fetch(url);
        if (!response.ok) {
            //showError('container', 'Failed to fetch fields.');
            return {};
        }
        data = await response.json();
    } catch (error) {
        //showError('container', 'Network error while fetching fields.');
        return {};
    }

    return data.data;
}

async function fillFieldSelection(apiUrl) {
    staticFields = await fetchFields(apiUrl);
    const $select = $('#fieldSelect');
    Object.entries(staticFields).forEach(([key, value]) => {
        const $option = `<option value="${key}">${value}</option>`;
        $select.append($option);
    });
}
