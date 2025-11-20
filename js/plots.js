async function fetchVehiclesIds(apiUrl) {
    const url = 'http://localhost:5000/api/vehicles';
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

async function fillVehicleSelection() {
    vehicles = await fetchVehiclesIds();
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
