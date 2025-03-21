let unidades = [];

function initializeMap() {
    var platform = new H.service.Platform({
        'apikey': '2NqlHbtulBRhUv9D4RFjlH1LQZpLcVuPzR7BxxAjW80'
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

function setupWebSocket() {
    const socket = new WebSocket('wss://webapps.tracker.com/coord');

    socket.onopen = function() {
        console.log('WebSocket connection established');
    };

    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        unidades = data.unidades.map(unit => ({
            id: unit.id,
            nombre: unit.nombre,
            lat: parseFloat(unit.lat),
            long: parseFloat(unit.long),
            vel: parseFloat(unit.vel),
            dir: unit.dir
        }));
        // Aquí puedes actualizar los marcadores en el mapa si es necesario
    };

    socket.onerror = function(error) {
        console.error('WebSocket error:', error);
    };

    socket.onclose = function() {
        console.log('WebSocket connection closed');
        // Reintentar la conexión después de un tiempo
        setTimeout(setupWebSocket, 5000);
    };
}

function addMarkers(ui, map, coordinates, names) {
    var mapObjects = new H.map.Group();

    coordinates.forEach((coord, index) => {
        if (isNaN(coord[0]) || isNaN(coord[1])) return;
        var unitName = names[index];
        var marker = new H.map.Marker({ lat: coord[1], lng: coord[0] });
        marker.setData({
            nombre: unitName,
            lat: coord[1],
            lng: coord[0]
        });
        var bubble = new H.ui.InfoBubble({ lat: coord[1], lng: coord[0]}, {
            content: unitName
        });
        marker.addEventListener('tap', function(evt) {
            var id = `marker-${index}`
            if (!$(`#sidebar div[data-id="${id}"]`).length) {
                var data = evt.target.getData();
                var content = `
                    <div data-id="${id}" class="unit-data">
                        <div class="row"><div class="col">Nombre:</div><div class="col">${data.nombre}</div></div>
                        <div class="row"><div class="col">Latitud:</div><div class="col">${data.lat}</div></div>
                        <div class="row"><div class="col">Longitud:</div><div class="col">${data.lng}</div></div>
                        <div class="separator"></div>
                    </div>
                `
                $('#sidebar').append(content).show();
            }
        });
        mapObjects.addObject(marker);
        ui.addBubble(bubble);
    });
    map.addObject(mapObjects);
}

async function fetchUnitDetails(unitIds) {
    const url = 'https://webapps.tracker.com/details';
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

$(document).ready(function() {
    var [map, ui] = initializeMap();
    // Crear la barra lateral oculta inicialmente con el botón de cerrar
    $('body').append('<div id="sidebar"><button class="close-btn">X</button></div>');


    $('.tab').click(function(e) {
        e.preventDefault();
        var target = $(this).data('target');

        $('#sidebar').hide().empty().append('<button class="close-btn">X</button>');
        $('.tab-content').hide();
        $('#' + target).show();

        // Ajustar el tamaño del mapa cuando se cambia a la pestaña de mapa
        if (target === 'mapView') {
            setTimeout(function() {
                window.dispatchEvent(new Event('resize'));
            }, 200);
        }
    });

    var exampleCoordinates = [
        [-101.686, 21.121],
        [-101.680, 21.125],
        [-101.670, 21.130]
    ];
    var names = [
        'Objeto A',
        'Objeto B',
        'Objeto C'
    ]
    addMarkers(ui, map, exampleCoordinates, names);
    //setupWebSocket();

    // Manejar el botón de cerrar
    $('#sidebar .close-btn').click(function() {
        $('#sidebar').empty().append('<button class="close-btn">X</button>').hide();
    });

    // Agrega las opciones al dropdown
    var unit_select = $('#unitSelect');
    names.forEach((name, idx) => {
        unit_select.append(new Option(name, idx));
    });

    // Maneja el cambio de la selección del dropdown
    unit_select.change(function() {
        var selectedIndex = $(this).val();
        var selectedName = names[selectedIndex];
        $('#unitDetails').html(`<p>Detalles de la unidad: ${selectedName}</p>`);

        // Agrega contenedores para gráficos y variables
        $('#unitDetails').append(`
            <div id="chartsContainer" style="display: flex; justify-content: space-around;">
                <div id="fuelChart" style="width: 30%; height: 400px;"></div>
                <div id="speedChart" style="width: 30%; height: 400px;"></div>
                <div id="distanceChart" style="width: 30%; height: 400px;"></div>
            </div>
            <div id="additionalData" style="margin-top: 20px;">
                <div class="row"><div class="col">Estado del Motor:</div><div class="col" id="motorStatus"></div></div>
                <div class="row"><div class="col">Distancia Total Recorrida:</div><div class="col" id="totalDistance"></div></div>
                <div class="row"><div class="col">Estado de la Unidad:</div><div class="col" id="unitStatus"></div></div>
                <div class="row"><div class="col">Tiempo de Actividad:</div><div class="col" id="activityTime"></div></div>
            </div>
        `);

        // Datos de ejemplo para los gráficos
        var fuelData = [
            { time: '00:00', value: 10 },
            { time: '06:00', value: 20 },
            { time: '12:00', value: 30 },
            { time: '18:00', value: 40 },
            { time: '24:00', value: 50 }
        ];

        var speedData = [
            { time: '00:00', value: 60 },
            { time: '06:00', value: 70 },
            { time: '12:00', value: 80 },
            { time: '18:00', value: 90 },
            { time: '24:00', value: 100 }
        ];

        var distanceData = [
            { time: 'Day 1', value: 100 },
            { time: 'Day 2', value: 200 },
            { time: 'Day 3', value: 300 },
            { time: 'Day 4', value: 400 },
            { time: 'Day 5', value: 500 },
            { time: 'Day 6', value: 600 },
            { time: 'Day 7', value: 700 }
        ];

        // Crear gráficos usando AG Charts
        console.log(agCharts.AgCharts);
        agCharts.AgCharts.create({
            container: document.getElementById('fuelChart'),
            data: fuelData,
            series: [{
                type: 'line',
                xKey: 'time',
                yKey: 'value',
                title: 'Consumo de Combustible'
            }]
        });

        agCharts.AgCharts.create({
            container: document.getElementById('speedChart'),
            data: speedData,
            series: [{
                type: 'line',
                xKey: 'time',
                yKey: 'value',
                title: 'Velocidad'
            }]
        });

        agCharts.AgCharts.create({
            container: document.getElementById('distanceChart'),
            data: distanceData,
            series: [{
                type: 'line',
                xKey: 'time',
                yKey: 'value',
                title: 'Distancia Recorrida'
            }]
        });

        // Datos adicionales de ejemplo
        var motorStatus = 'Funcionamiento adecuado';
        var totalDistance = '1500 km';
        var unitStatus = 'En servicio';
        var activityTime = '12 horas';

        // Mostrar datos adicionales
        $('#motorStatus').text(motorStatus);
        $('#totalDistance').text(totalDistance);
        $('#unitStatus').text(unitStatus);
        $('#activityTime').text(activityTime);
    });
});
