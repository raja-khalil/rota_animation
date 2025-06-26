// static/js/maps.js

let map;
let directionsService; // Ainda pode ser útil para renderizar a rota completa se desejar, mas não para calcular
let directionsRenderer;
let currentMarker; // Usaremos AdvancedMarkerElement
let animationInterval;
let animationPoints = []; // Stores the interpolated points for smooth animation
let currentIndex = 0; // Current index in animationPoints
let animationSpeed = 50; // Default speed, adjust as needed (0-100)
let animationPaused = false;

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
let originAutocomplete;
let destinationAutocomplete;

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
        // mapId: "YOUR_MAP_ID" // Se estiver usando um Map ID para personalização avançada
    });

    directionsService = new google.maps.DirectionsService(); // Usado para obter a rota visual
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true, // Hide default markers, we'll use our own
        polylineOptions: {
            strokeColor: '#176B87', // A nice blue
            strokeOpacity: 0.8,
            strokeWeight: 6
        }
    });

    // Initialize Autocomplete for input fields
    // Using current `google.maps.places.Autocomplete` as per existing code,
    // although console warns about `PlaceAutocompleteElement` being recommended.
    originAutocomplete = new google.maps.places.Autocomplete(originInput, {
        componentRestrictions: { country: "br" }, // Restrict to Brazil
        fields: ["place_id", "geometry", "name", "formatted_address"],
    });
    destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput, {
        componentRestrictions: { country: "br" }, // Restrict to Brazil
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

    // Debounce input to avoid excessive calculations or autocomplete calls
    originInput.addEventListener('input', debounce(checkInputs, 500));
    destinationInput.addEventListener('input', debounce(checkInputs, 500));
    checkInputs(); // Initial check
}

function checkInputs() {
    const originFilled = originInput.value.trim() !== '';
    const destinationFilled = destinationInput.value.trim() !== '';
    calculateRouteButton.disabled = !(originFilled && destinationFilled);
    if (!originFilled || !destinationFilled) {
        resetMap(); // Reset map if inputs are cleared
    }
}


async function calculateRoute() {
    clearInterval(animationInterval);
    animationInterval = null;
    currentMarker?.setMap(null); // Remove previous marker
    directionsRenderer.setDirections({ routes: [] }); // Clear previous route
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
            directionsRenderer.setDirections({
                routes: [{
                    overview_polyline: { points: data.points },
                    legs: [{
                        distance: { text: data.distance },
                        duration: { text: data.duration }
                    }]
                }]
            });
            directionsRenderer.setMap(map);

            animationPoints = interpolatePath(decodedPath, 500); // Interpolate for smoother animation
            
            // Using google.maps.marker.AdvancedMarkerElement (recommended)
            // Note: Requires 'marker' library in script tag
            const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
            currentMarker = new AdvancedMarkerElement({
                map: map,
                position: animationPoints[0],
                // glyph: '🚗', // Can use emojis or custom content
                content: createCarMarkerContent() // Custom car icon
            });
            
            map.setCenter(animationPoints[0]);
            map.setZoom(15); // Zoom in on the start of the route

            distanceText.textContent = data.distance;
            durationText.textContent = data.duration;
            routeDetails.style.display = 'block';

            startAnimationButton.disabled = false;
            statusMessage.className = 'status alert alert-success mt-auto';
            statusMessage.textContent = '✅ Rota calculada! Clique em Iniciar Animação.';

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

// Function to create a custom car marker element
function createCarMarkerContent() {
    const markerContent = document.createElement('div');
    markerContent.style.width = '32px';
    markerContent.style.height = '32px';
    markerContent.style.backgroundImage = 'url(https://maps.gstatic.com/mapfiles/ms/micons/car.png)'; // Example car icon
    markerContent.style.backgroundSize = 'contain';
    markerContent.style.backgroundRepeat = 'no-repeat';
    markerContent.style.transform = 'translate(-50%, -50%)'; // Center the marker
    return markerContent;
}


function interpolatePath(path, stepsPerSegment) {
    const interpolated = [];
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i+1];
        const distance = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
        // Ensure stepsPerSegment is reasonable for short segments
        const numSteps = Math.max(1, Math.ceil(distance / stepsPerSegment));

        for (let j = 0; j < numSteps; j++) {
            const fraction = j / numSteps;
            const interpolatedPoint = google.maps.geometry.spherical.interpolate(p1, p2, fraction);
            interpolated.push(interpolatedPoint);
        }
    }
    interpolated.push(path[path.length - 1]); // Add the very last point
    return interpolated;
}


function startAnimation() {
    if (animationPoints.length === 0) {
        statusMessage.className = 'status alert alert-danger mt-auto';
        statusMessage.textContent = '❌ Calcule uma rota primeiro!';
        return;
    }
    
    if (animationInterval) {
        clearInterval(animationInterval); // Clear any existing interval
    }
    animationPaused = false;
    startAnimationButton.disabled = true;
    pauseAnimationButton.disabled = false;
    statusMessage.className = 'status alert alert-primary mt-auto';
    statusMessage.textContent = '▶️ Animação em andamento...';

    // Adjust interval based on speed slider value (1 to 100)
    // Faster speed = smaller interval
    const intervalTime = Math.max(5, 100 - (animationSpeed - 1)); // Max 100ms, min 5ms
    
    animateCar(); // Call immediately to place car at start
    animationInterval = setInterval(animateCar, intervalTime);
}

function animateCar() {
    if (currentIndex < animationPoints.length) {
        const position = animationPoints[currentIndex];
        currentMarker.position = position; // Update AdvancedMarkerElement position
        map.setCenter(position); // Keep map centered on the car
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
        startAnimationButton.disabled = false; // Allow resuming
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
        currentMarker.setMap(null); // Remove car marker
        currentMarker = null;
    }
    
    directionsRenderer.setDirections({ routes: [] }); // Clear route from map

    map.setCenter({ lat: -14.235, lng: -51.925 }); // Reset map center to Brazil
    map.setZoom(4); // Reset zoom level

    originInput.value = '';
    destinationInput.value = '';
    routeDetails.style.display = 'none';

    calculateRouteButton.disabled = true;
    startAnimationButton.disabled = true;
    pauseAnimationButton.disabled = true;
    statusMessage.className = 'status alert alert-info mt-auto';
    statusMessage.textContent = '🔄 Mapa resetado. Digite novos endereços.';
}

// Debounce function to limit how often a function is called (e.g., for input changes)
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Make initMap globally accessible for the Google Maps API callback
window.initMap = initMap;