// static/js/maps.js

// Alteradas de 'let' para 'var' para garantir acesso global/amplo escopo
var map;
var directionsService; 
var directionsRenderer; 
var currentMarker; 
var animationInterval;
var animationPoints = []; 
var currentIndex = 0; 
var animationSpeed = 50; 
var animationPaused = false;
var routePolyline; // Variável para armazenar a Polyline da rota

// DOM Elements
const originInput = document.getElementById('originInput');
const destinationInput = document.getElementById('destinationInput');
const calculateRouteButton = document.getElementById('calculateRouteButton');
const resetMapButton = document.getElementById('resetMapButton');
const startAnimationButton = document.getElementById('startAnimationButton');
const pauseAnimationButton = document.getElementById('pauseAnimationButton');
const speedRange = document.getElementById('speedRange');
const speedValue = document.getElementById('speedValue');
const routeDetails = document.getElementById('routeDetails');
const distanceText = document.getElementById('distanceText');
const durationText = document.getElementById('durationText');
const statusMessage = document.getElementById('statusMessage');

// Google Maps Autocomplete services
var originAutocomplete;
var destinationAutocomplete;

// Initialize Google Map
async function initMap() {
    // Definir as coordenadas do Brasil para o centro inicial
    const brazilCenter = { lat: -14.235, lng: -51.925 };

    map = new google.maps.Map(document.getElementById("map"), {
        center: brazilCenter,
        zoom: 4,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapId: "DEMO_MAP_ID" // Adicionado Map ID para Advanced Markers. Substitua por seu próprio ID de Mapa válido.
    });

    directionsService = new google.maps.DirectionsService(); 
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true, 
        polylineOptions: {
            strokeColor: '#176B87', 
            strokeOpacity: 0.8,
            strokeWeight: 6
        }
    });

    // Initialize Autocomplete for input fields
    originAutocomplete = new google.maps.places.Autocomplete(originInput, {
        componentRestrictions: { country: "br" }, 
        fields: ["place_id", "geometry", "name", "formatted_address"],
    });
    destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput, {
        componentRestrictions: { country: "br" }, 
        fields: ["place_id", "geometry", "name", "formatted_address"],
    });

    // Try to get user's current location to bias autocomplete results
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const geolocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                const circle = new google.maps.Circle({ center: geolocation, radius: position.coords.accuracy });
                originAutocomplete.setBounds(circle.getBounds());
                destinationAutocomplete.setBounds(circle.getBounds());
                statusMessage.className = 'status alert alert-success mt-auto';
                statusMessage.textContent = '🗺️ Mapa carregado! Tente digitar um endereço.';
            },
            () => {
                handleLocationError(true);
            }
        );
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false);
    }

    addEventListeners();
    statusMessage.textContent = '🗺️ Mapa carregado! Digite os endereços.';
    statusMessage.className = 'status alert alert-success mt-auto';
}

function handleLocationError(browserHasGeolocation) {
    statusMessage.className = 'status alert alert-warning mt-auto';
    statusMessage.textContent = browserHasGeolocation
        ? "⚠️ Erro: A localização não pôde ser determinada. Digite os endereços manualmente."
        : "⚠️ Erro: Seu navegador não suporta geolocalização. Digite os endereços manualmente.";
}

function addEventListeners() {
    calculateRouteButton.addEventListener('click', calculateRoute);
    resetMapButton.addEventListener('click', resetMap);
    startAnimationButton.addEventListener('click', startAnimation);
    pauseAnimationButton.addEventListener('click', pauseAnimation);

    speedRange.addEventListener('input', () => {
        animationSpeed = parseInt(speedRange.value);
        speedValue.textContent = `Velocidade: ${animationSpeed}x`;
        // Restart animation with new speed if it's already running and not paused
        if (animationInterval && !animationPaused) {
            clearInterval(animationInterval);
            animateCar();
        }
    });

    originInput.addEventListener('input', debounce(checkInputs, 500));
    destinationInput.addEventListener('input', debounce(checkInputs, 500));
    checkInputs(); 
}

function checkInputs() {
    const originFilled = originInput.value.trim() !== '';
    const destinationFilled = destinationInput.value.trim() !== '';
    calculateRouteButton.disabled = !(originFilled && destinationFilled);
}


async function calculateRoute() {
    clearInterval(animationInterval); 
    animationInterval = null;
    currentMarker?.setMap(null); 
    
    if (routePolyline) { 
        routePolyline.setMap(null); 
    }
    animationPoints = [];
    currentIndex = 0;
    animationPaused = false;

    routeDetails.style.display = 'none';
    startAnimationButton.disabled = true;
    pauseAnimationButton.disabled = true;
    
    statusMessage.className = 'status alert alert-info mt-auto';
    statusMessage.textContent = '⏳ Calculando rota...';

    const origin = originInput.value;
    const destination = destinationInput.value;

    if (!origin || !destination) {
        statusMessage.className = 'status alert alert-danger mt-auto';
        statusMessage.textContent = '❌ Por favor, preencha os endereços de origem e destino.';
        return;
    }

    try {
        const response = await fetch('/calculate_route_backend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ origin, destination })
        });

        const data = await response.json();

        if (response.ok) {
            const decodedPath = google.maps.geometry.encoding.decodePath(data.points);
            
            // Renderiza a rota como Polyline diretamente para ter controle total
            routePolyline = new google.maps.Polyline({ 
                path: decodedPath, 
                geodesic: true, 
                strokeColor: '#007bff', // Azul 
                strokeOpacity: 0.8, 
                strokeWeight: 6, 
                icons: [{ // Padrão de linha tracejada 
                    icon: { 
                        path: 'M 0,-1 0,1', // Linha vertical curta 
                        strokeOpacity: 1, 
                        strokeWeight: 2 
                    }, 
                    offset: '0', 
                    repeat: '20px' // Repete a cada 20 pixels 
                }], 
            }); 
            routePolyline.setMap(map); 

            // **AJUSTE: Centraliza e ajusta o zoom para mostrar a rota completa**
            const bounds = new google.maps.LatLngBounds();
            for (let i = 0; i < decodedPath.length; i++) {
                bounds.extend(decodedPath[i]);
            }
            map.fitBounds(bounds);


            // **AJUSTE: Aumenta a densidade dos pontos interpolados para animação mais suave**
            animationPoints = interpolatePath(decodedPath, 200); // Antes 500, agora 200 para mais suavidade
            
            const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
            currentMarker = new AdvancedMarkerElement({
                map: map,
                position: animationPoints[0],
                content: createCarMarkerContent() // Custom car icon
            });
            
            // O zoom de locomoção será aplicado APENAS ao iniciar a animação
            // map.setCenter(animationPoints[0]); // Removido daqui
            // map.setZoom(17); // Removido daqui

            distanceText.textContent = data.distance;
            durationText.textContent = data.duration;
            routeDetails.style.display = 'block';

            startAnimationButton.disabled = false;
            statusMessage.className = 'status alert alert-success mt-auto';
            statusMessage.textContent = '✅ Rota calculada! Pronto para animar.';

        } else {
            statusMessage.className = 'status alert alert-danger mt-auto';
            statusMessage.textContent = `❌ Erro: ${data.error || 'Não foi possível calcular a rota.'}`;
            routeDetails.style.display = 'none';
            console.error('Backend Error:', data.error);
        }
    } catch (error) {
        statusMessage.className = 'status alert alert-danger mt-auto';
        statusMessage.textContent = '❌ Erro de rede ou servidor ao calcular a rota.';
        routeDetails.style.display = 'none';
        console.error('Fetch Error:', error);
    }
}

// Function to create a custom car marker element using inline SVG
function createCarMarkerContent() {
    const markerContent = document.createElement('div');
    markerContent.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="white" stroke="#ddd" stroke-width="2"/>
            <circle cx="16" cy="16" r="10" fill="#2c3e50"/>
            <polygon points="16,8 20,14 12,14" fill="white"/>
        </svg>
    `;
    markerContent.style.transform = 'translate(-50%, -50%)'; 
    return markerContent;
}


function interpolatePath(path, stepsPerSegment) {
    const interpolated = [];
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i+1];
        const distance = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
        // numSteps agora será maior devido ao stepsPerSegment menor, resultando em mais pontos
        const numSteps = Math.max(1, Math.ceil(distance / stepsPerSegment));

        for (let j = 0; j < numSteps; j++) {
            const fraction = j / numSteps;
            const interpolatedPoint = google.maps.geometry.spherical.interpolate(p1, p2, fraction);
            interpolated.push(interpolatedPoint);
        }
    }
    interpolated.push(path[path.length - 1]); 
    return interpolated;
}


function startAnimation() {
    if (animationPoints.length === 0) {
        statusMessage.className = 'status alert alert-danger mt-auto';
        statusMessage.textContent = '❌ Calcule uma rota primeiro!';
        return;
    }
    
    if (animationInterval) {
        clearInterval(animationInterval); 
    }
    animationPaused = false;
    startAnimationButton.disabled = true;
    pauseAnimationButton.disabled = false;
    statusMessage.className = 'status alert alert-primary mt-auto';
    statusMessage.textContent = '▶️ Animação em andamento...';

    // **AJUSTE: Define o zoom de locomoção ao iniciar a animação**
    map.setZoom(17); 
    
    // AUMENTADA A VELOCIDADE MÁXIMA PARA TORNAR O MÍNIMO MAIS LENTO
    // O fator '4' torna a velocidade mínima ainda mais lenta
    const intervalTime = Math.max(5, (101 - animationSpeed) * 4); 
    
    animateCar(); 
    animationInterval = setInterval(animateCar, intervalTime);
}

function animateCar() {
    if (currentIndex < animationPoints.length) {
        const position = animationPoints[currentIndex];
        currentMarker.position = position; 
        map.setCenter(position); // O mapa seguirá o carro, mantendo o zoom atual da animação
        currentIndex++;
    } else {
        clearInterval(animationInterval);
        animationInterval = null;
        pauseAnimationButton.disabled = true;
        startAnimationButton.disabled = true;
        statusMessage.className = 'status alert alert-success mt-auto';
        statusMessage.textContent = '✅ Animação concluída!';
    }
}

function pauseAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
        animationPaused = true;
        startAnimationButton.disabled = false; 
        pauseAnimationButton.disabled = true;
        statusMessage.className = 'status alert alert-warning mt-auto';
        statusMessage.textContent = '⏸️ Animação pausada.';
    }
}

function resetMap() {
    clearInterval(animationInterval);
    animationInterval = null;
    animationPaused = false;
    currentIndex = 0;
    animationPoints = [];

    if (currentMarker) {
        currentMarker.setMap(null); 
        currentMarker = null;
    }
    
    // Limpa a Polyline da rota ao resetar o mapa
    if (routePolyline) { 
        routePolyline.setMap(null); 
        routePolyline = null; 
    }

    map.setCenter({ lat: -14.235, lng: -51.925 }); 
    map.setZoom(4); // Retorna ao zoom original do Brasil

    originInput.value = '';
    destinationInput.value = '';
    routeDetails.style.display = 'none';

    calculateRouteButton.disabled = true;
    startAnimationButton.disabled = true;
    pauseAnimationButton.disabled = true;
    statusMessage.className = 'status alert alert-info mt-auto';
    statusMessage.textContent = '🔄 Mapa resetado. Digite novos endereços.';
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

window.initMap = initMap;