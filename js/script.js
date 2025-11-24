import { apiUrl } from './config.js';
import { fillVehicleSelection,
         fillFieldSelection,
         generateTimeSeriesPlot,
         generateDistributionPlot } from './plots.js';

let lista_unidades = [];
let socket = undefined;
var map, ui;
let mapObjects = null;
let mapBubbles = [];
var unit_select = null;

function initializeMap() {
    var platform = new H.service.Platform({
        'apikey': 'key'
    });
    var defaultLayers = platform.createDefaultLayers();

    var map = new H.Map(
        document.getElementById('mapContainer'),
        defaultLayers.vector.normal.map,
        {
            center: { lat: 21.1236, lng: -101.6805 }, // Coordenadas de León, México
            zoom: 12,
        }
    );

    var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
    var ui = H.ui.UI.createDefault(map, defaultLayers);

    return [map, ui];
}

function showUnitsPanel() {
    if (lista_unidades.length > 0) {
        const $uuidList = $('#uuidList');
        $uuidList.empty();
        lista_unidades.forEach((unit, idx) => {
            const $li = `<li><div>
                        <input type="checkbox" name="item${idx}">
                        <label for="item${idx}">${unit.id}</label>
                        </div></li>`;
            $uuidList.append($li);
        });
        $('#unitsPanel').removeClass('collapsed').show();
    }
}

function hideUnitsPanel() {
    $('#unitsPanel').hide();
}

function updateUnitsPanel() {
    if(lista_unidades.length > 0 && $('#mapView').is(':visible')) {
        showUnitsPanel();
    } else {
        hideUnitsPanel();
    }
}

function updateUnitsSelect() {
    // Agrega las opciones al dropdown de la pestaña unitsView
    unit_select = $('#unitSelect');
    unit_select.empty();
    lista_unidades.forEach((unit, idx) => {
        unit_select.append(new Option(unit.id, idx));
    });
}

function setupWebSocket() {
    socket = io('http://localhost:5000/', {
        auth: {
            token: 'token'
        },
    });

    socket.on("connect", () => {
        // Connnected
    });

    socket.on("disconnect", () => {
        // Disconnected
    });

    socket.on("units", (data) => {
        const unidades = JSON.parse(data['data']);

        if (unidades['code'] == "available units") {
            lista_unidades = unidades['units'].map(unit => ({
                id: unit.unit,
            }));
        }
        updateUnitsPanel();
        updateUnitsSelect();
    });

    socket.on("gps data", (data) => {
        const units = JSON.parse(data);
        let units_set = new Set();
        let geo_data = {};
        // New data, iterate to get
        if (units['code'] === 'new data') {
            for (const unit of units['units']) {
                if (units_set.has(unit['uuid'])) {
                    if (geo_data[unit['uuid']].datetime > unit['datetime']) {
                        geo_data[unit['uuid']].lat = unit['latitude'];
                        geo_data[unit['uuid']].long = unit['longitude'];
                        geo_data[unit['uuid']].height = unit['height'];
                        geo_data[unit['uuid']].vel = unit['velocity'];
                        geo_data[unit['uuid']].datetime = unit['datetime'];
                    }
                    continue;
                }
                units_set.add(unit['uuid']);
                geo_data[unit['uuid']] = {
                    lat: unit['latitude'],
                    long: unit['longitude'],
                    height: unit['height'],
                    vel: unit['velocity'],
                    datetime: unit['datetime']
                };
            }
            addMarkers(ui, map, geo_data);
        }
    });
}

function addMarkers(ui, map, geo_data) {
    // Remove existing markers if any
    if (mapObjects) {
        map.removeObject(mapObjects);
    }
    // Remove existing bubbles if any
    if (mapBubbles && mapBubbles.length > 0) {
        mapBubbles.forEach(bubble => {
            ui.removeBubble(bubble);
        });
        mapBubbles = [];
    }
    mapObjects = new H.map.Group();

    for (const name in geo_data) {
        if (!geo_data.hasOwnProperty(name)) continue;
        var marker = new H.map.Marker({ lat: geo_data[name].lat, lng: geo_data[name].long });
        marker.setData({ nombre: name });
        /*var bubble = new H.ui.InfoBubble({ lat: geo_data[name].lat, lng: geo_data[name].long }, {
            content: name
        });
        mapBubbles.push(bubble);*/
        marker.addEventListener('tap', function(evt) {
            var id = `marker-${name}`;
            if (!$(`#sidebar div[data-id="${id}"]`).length) {
                var data = evt.target.getData();
                var content = `
                    <div data-id="${id}" class="unit-data">
                        <div class="row"><div class="col">Nombre:</div><div class="col">${data.nombre}</div></div>
                        <div class="row"><div class="col">Latitud:</div><div class="col">${data.lat}</div></div>
                        <div class="row"><div class="col">Longitud:</div><div class="col">${data.lng}</div></div>
                        <div class="separator"></div>
                    </div>
                `;
                $('#sidebar').append(content).show();
            }
        });
        mapObjects.addObject(marker);
        //ui.addBubble(bubble);
    }
    map.addObject(mapObjects);
}

async function fetchUnitDetails(unitIds) {
    const requestData = {
        unidades: unitIds.map(id => ({ "id": id }))
    };

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data.unidades.map(unit => ({
            id: unit.id,
            origen: unit.origen,
            destino: unit.destino,
            dist_origen: unit.dist_origen,
            dist_dest: unit.dist_dest,
            operacion: unit.operacion,
            combustible: unit.combustible,
            conductor: unit.conductor,
            ruta: unit.ruta
        }));
    } catch (error) {
        console.error('Error fetching unit details:', error);
        return [];
    }
}

function populateFleetSummaryView() {
    var fleet_view = $('#fleetSummaryView');
    var total_units = 500;
    var active_units = 420;
    fleet_view.append(`
        <div id="fleetSummary">
        <div class="row"><div class="col">Número Total de Unidades:</div><div class="col" id="totalUnits">${total_units}</div></div>
        <div class="row"><div class="col">Número de Unidades Activas:</div><div class="col" id="activeUnits">${active_units}</div></div>
        </div>`
    );
    fleet_view.append(`<div id="fleetChartsContainer" style="display: flex; flex-wrap: wrap; overflow-x: auto;"></div>`);
    var fleet_charts = $('#fleetChartsContainer');
    var charts_ids = [
        'avgFuelConsumptUnit',
        'totalFuelConsumptionFleet',
        'avgDistanceTraveledUnit',
        'totalDistanceTraveledFleet',
        'avgStopingTimeUnit',
        'avgActiveTimeUnit'
    ];

    var avg_fuel_per_unit = [
        {day: 1, value: 15},
        {day: 2, value: 10},
        {day: 3, value: 20},
        {day: 4, value: 15},
        {day: 5, value: 12},
    ];
    var total_fuel_fleet = [
        {day: 1, value: 100},
        {day: 2, value: 120},
        {day: 3, value: 90},
        {day: 4, value: 110},
        {day: 5, value: 130}
    ];
    var avg_dist_unit = [
        {day: 1, value: 300},
        {day: 2, value: 200},
        {day: 3, value: 180},
        {day: 4, value: 400},
        {day: 5, value: 320},
    ];
    var total_dist_fleet = [
        {day: 1, value: 1500},
        {day: 2, value: 1000},
        {day: 3, value: 900},
        {day: 4, value: 2000},
        {day: 5, value: 1600},
    ];
    var avg_stop_time_unit = [
        {day: 1, value: 30},
        {day: 2, value: 45},
        {day: 3, value: 55},
        {day: 4, value: 34},
        {day: 5, value: 70},
    ];
    var avg_active_time_unit = [
        {day: 1, value: 6},
        {day: 2, value: 7},
        {day: 3, value: 9},
        {day: 4, value: 5},
        {day: 5, value: 8},
    ];
    var data = [
        avg_fuel_per_unit,
        total_fuel_fleet,
        avg_dist_unit,
        total_dist_fleet,
        avg_stop_time_unit,
        avg_active_time_unit,
    ];

    var chart_names = [
        'Avg. Fuel Consumption',
        'Total Fuel Consumption',
        'Avg. Distance Travelled',
        'Total Distance Travelled',
        'Avg. Stopping Time',
        'Avg. Active Time',
    ];

    charts_ids.forEach((name, idx) => {
        fleet_charts.append(`<div id="${name}" style="width: 30%; height: 400px;"></div>`);
        agCharts.AgCharts.create({
            container: document.getElementById(name),
            data: data[idx],
            series: [{
                type: 'line',
                xKey: 'day',
                yKey: 'value',
                title: chart_names[idx]
            }]
        });
    })
    
}

$(document).on('change', '#unitsPanelContent', function(e) {
    const checked = $(this).find('input[type="checkbox"]:checked');
    const selectedUuids = checked.map(function() {
        return $(this).siblings('label').text();
    }).get();

    const units = {
        "units": selectedUuids,
    };
    console.log(units);
    socket.emit('subscribe', JSON.stringify(units));
});

$(document).on('click', '#togglePanelBtn', function() {
        const $panel = $('#unitsPanel');
        if ($panel.hasClass('collapsed')) {
            $panel.removeClass('collapsed');
            $(this).html('&lt;');
        } else {
            $panel.addClass('collapsed');
            $(this).html('&gt;');
        }
    });

$(document).ready(function() {
    [map, ui] = initializeMap();
    // Crear la barra lateral oculta inicialmente con el botón de cerrar
    $('body').append('<div id="sidebar"><button class="close-btn">X</button></div>');


    $('.tab').click(function(e) {
        e.preventDefault();
        var target = $(this).data('target');

        $('#sidebar').hide().empty().append('<button class="close-btn">X</button>');
        $('.tab-content').hide();
        $('#' + target).show();

        // Update panel units if necessary
        updateUnitsPanel();

        // Ajustar el tamaño del mapa cuando se cambia a la pestaña de mapa
        if (target === 'mapView') {
            setTimeout(function() {
                window.dispatchEvent(new Event('resize'));
            }, 200);
        } else if (target === 'fleetSummaryView') {
            populateFleetSummaryView();
        }
    });

    setupWebSocket();
    fillVehicleSelection(apiUrl);
    fillFieldSelection(apiUrl);

    // Associa botones para gráficas
    $('#btnTimeSeries').on('click', generateTimeSeriesPlot);
    $('#btnDistributionPlot').on('click', generateDistributionPlot);

    // Manejar el botón de cerrar
    $('#sidebar .close-btn').click(function() {
        $('#sidebar').empty().append('<button class="close-btn">X</button>').hide();
    });
});
