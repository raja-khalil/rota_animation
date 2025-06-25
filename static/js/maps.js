let map;
let directionsRenderer;
let marker;
let animationInterval;
let currentPathIndex = 0;
let routePath = []; // Para armazenar os pontos da rota decodificados

// Elementos do DOM
const originInput = document.getElementById('origin');
const destinationInput = document.getElementById('destination');
const routeButton = document.getElementById('routeButton');
const resetButton = document.getElementById('resetButton');
const statusDiv = document.getElementById('status');
const routeDetailsDiv = document.getElementById('route-details');
const speedRangeInput = document.getElementById('speedRange');
const speedValueSpan = document.getElementById('speedValue');

// Atraso base da animação (para velocidade "Normal" ou 1x)
const BASE_ANIMATION_DELAY = 50; // milissegundos

/**
 * Calcula o delay da animação com base no valor do slider.
 * @param {number} sliderValue - Valor do slider (1 a 100).
 * @returns {number} Delay em milissegundos.
 */
function getAnimationDelay(sliderValue) {
    return BASE_ANIMATION_DELAY / sliderValue;
}

/**
 * Atualiza a mensagem de status para o usuário e as classes de estilo.
 * @param {string} type - Tipo de status (idle, loading, error).
 * @param {string} message - Mensagem a ser exibida.
 */
function updateStatus(type, message) {
    statusDiv.className = `status alert ${type === 'idle' ? 'alert-success' : type === 'loading' ? 'alert-warning' : 'alert-danger'}`;
    statusDiv.textContent = message;
}

/**
 * Inicializa o mapa - função chamada pela API do Google Maps.
 */
function initMap() {
    console.log('🗺️ Inicializando mapa...');
    
    try {
        const mapElement = document.getElementById("map");
        if (!mapElement) {
            throw new Error("Elemento do mapa (#map) não encontrado no DOM.");
        }

        map = new google.maps.Map(mapElement, {
            // **IMPORTANTE: Substitua 'YOUR_MAP_ID' pelo ID do Mapa que você criar no Google Cloud Console.**
            // Para mais informações, veja: https://developers.google.com/maps/documentation/javascript/cloud-customization#map_id
            mapId: "YOUR_MAP_ID", 
            zoom: 12,
            center: { lat: -22.5211, lng: -41.9577 }, // Centro inicial (Rio das Ostras, Brasil)
            mapTypeId: 'roadmap',
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true
        });

        directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true, // Suprime os marcadores padrão da Directions API
            polylineOptions: {
                strokeColor: "#00d4aa",
                strokeOpacity: 1.0,
                strokeWeight: 4
            }
        });
        directionsRenderer.setMap(map);

        // **ATUALIZAÇÃO: Usando google.maps.marker.AdvancedMarkerElement**
        // Por padrão, usaremos um glifo (emoji de carro).
        // Se você tiver um arquivo 'car_icon.png' na pasta 'static/images/' e quiser usá-lo,
        // você pode descomentar a seção de 'carIconElement' e passá-lo para 'content'.
        
        // Opção 1: Usar glifo (emoji) - Mais simples e não depende de arquivo de imagem.
        const markerContent = new google.maps.marker.PinElement({
            glyph: '🚗',
            background: '#FFD700', // Amarelo
            borderColor: '#FFD700',
            glyphColor: '#FFFFFF', // Branco
        }).element;

        // Opção 2: Usar imagem personalizada (descomente e use se tiver 'car_icon.png' e quiser priorizar)
        /*
        const carIconElement = document.createElement('img');
        carIconElement.src = "{{ url_for('static', filename='images/car_icon.png') }}"; 
        carIconElement.style.width = '35px';
        carIconElement.style.height = '35px';
        carIconElement.style.objectFit = 'contain';
        const markerContent = carIconElement;
        */

        marker = new google.maps.marker.AdvancedMarkerElement({
            map: null, // Inicializa escondido, sem mapa associado.
            position: { lat: -22.5211, lng: -41.9577 }, // Posição inicial, será atualizada
            content: markerContent,
            // 'visible' não é uma propriedade direta do AdvancedMarkerElement.
            // Para controlar a visibilidade, defina 'map' para null ou a instância do mapa.
        });

        console.log('✅ Mapa inicializado com sucesso!');
        updateStatus('idle', '🗺️ Mapa carregado! Digite os endereços.');
        
        setupEventListeners();
        setupAutocompletes();
        updateSpeedDisplay(); // Atualiza o display da velocidade inicial
        
    } catch (error) {
        console.error('❌ Erro ao inicializar mapa:', error);
        updateStatus('error', '❌ Erro ao carregar mapa: ' + error.message);
    }
}

/**
 * Configura os listeners de eventos para os botões e slider.
 */
function setupEventListeners() {
    routeButton.addEventListener('click', calculateRoute);
    resetButton.addEventListener('click', resetMap);
    speedRangeInput.addEventListener('input', () => {
        updateSpeedDisplay();
        if (animationInterval) {
            clearInterval(animationInterval);
            startAnimation();
        }
    });
}

/**
 * Atualiza o texto que exibe o valor da velocidade do slider.
 */
function updateSpeedDisplay() {
    const value = parseInt(speedRangeInput.value);
    speedValueSpan.textContent = `${value}x Velocidade`;
}


/**
 * Configura o autocomplete para os campos de endereço, permitindo buscar por nome de local.
 */
function setupAutocompletes() {
    // ATENÇÃO: google.maps.places.Autocomplete está depreciado para novos clientes a partir de Março de 2025.
    // A recomendação é usar google.maps.places.PlaceAutocompleteElement.
    // Para migrar, você precisaria alterar a estrutura HTML do seu input para usar o novo elemento customizado.
    // Mais informações: https://developers.google.com/maps/legacy e https://developers.google.com/maps/documentation/javascript/places-migration-overview
    // Por enquanto, mantemos o Autocomplete, pois ainda funciona para clientes existentes.
    const originAutocomplete = new google.maps.places.Autocomplete(originInput, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { 'country': ['br'] }
    });

    const destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { 'country': ['br'] }
    });

    originAutocomplete.addListener('place_changed', () => {
        const place = originAutocomplete.getPlace();
        if (place.geometry) {
            console.log('Origem selecionada:', place.formatted_address);
        }
    });
    destinationAutocomplete.addListener('place_changed', () => {
        const place = destinationAutocomplete.getPlace();
        if (place.geometry) {
            console.log('Destino selecionada:', place.formatted_address);
        }
    });
}

/**
 * Calcula rota entre dois pontos usando o backend.
 */
async function calculateRoute() {
    updateStatus('loading', '🔍 Calculando rota...');
    routeDetailsDiv.style.display = 'none';

    const origin = originInput.value.trim();
    const destination = destinationInput.value.trim();

    if (!origin || !destination) {
        updateStatus('error', 'Por favor, preencha os endereços de origem e destino.');
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

        if (!response.ok) {
            throw new Error(data.error || 'Erro desconhecido ao calcular rota no backend.');
        }

        processRoute(data);

    } catch (error) {
        console.error('❌ Erro ao calcular rota:', error);
        updateStatus('error', '❌ Erro: ' + error.message);
    }
}

/**
 * Processa a rota recebida do backend (decodifica polilinha e inicia animação).
 * @param {object} routeData - Dados da rota contendo 'points' (polilinha codificada), 'distance', 'duration'.
 */
function processRoute(routeData) {
    if (animationInterval) {
        clearInterval(animationInterval);
    }
    currentPathIndex = 0;
    marker.map = null; // Esconde o marcador antes de iniciar a nova animação
    directionsRenderer.setDirections({ routes: [] }); // Limpa a rota anterior no mapa

    try {
        routePath = google.maps.geometry.encoding.decodePath(routeData.points);

        if (routePath.length === 0) {
            throw new Error("Nenhum ponto de rota foi retornado.");
        }

        const newRoute = {
            routes: [{
                overview_polyline: { points: routeData.points },
                legs: [{
                    distance: { text: routeData.distance },
                    duration: { text: routeData.duration }
                }]
            }]
        };
        directionsRenderer.setDirections(newRoute);

        routeDetailsDiv.innerHTML = `
            <p><strong>Distância:</strong> ${routeData.distance}</p>
            <p><strong>Duração Estimada:</strong> ${routeData.duration}</p>
        `;
        routeDetailsDiv.style.display = 'block';

        marker.position = routePath[0];
        marker.map = map; // Exibe o marcador, associando-o ao mapa
        map.setCenter(routePath[0]);

        updateStatus('idle', '✅ Rota calculada! Iniciando animação...');
        startAnimation();

    } catch (error) {
        console.error('❌ Erro ao processar rota:', error);
        updateStatus('error', '❌ Erro ao exibir rota: ' + error.message);
        routeDetailsDiv.style.display = 'none';
    }
}

/**
 * Inicia a animação do marcador ao longo da rota.
 */
function startAnimation() {
    const animationDelay = getAnimationDelay(parseInt(speedRangeInput.value));
    console.log(`Iniciando animação com delay de: ${animationDelay}ms`);

    animationInterval = setInterval(() => {
        if (currentPathIndex < routePath.length - 1) {
            currentPathIndex++;
            const nextPosition = routePath[currentPathIndex];
            marker.position = nextPosition;
            map.panTo(nextPosition);
        } else {
            clearInterval(animationInterval);
            updateStatus('idle', '🏁 Animação concluída!');
        }
    }, animationDelay);
}

/**
 * Reseta o mapa, limpando a rota e os inputs.
 */
function resetMap() {
    if (animationInterval) {
        clearInterval(animationInterval);
    }
    directionsRenderer.setDirections({ routes: [] });
    marker.map = null; // Esconde o marcador
    currentPathIndex = 0;
    routePath = [];
    originInput.value = '';
    destinationInput.value = '';
    routeDetailsDiv.style.display = 'none';
    updateStatus('idle', 'Mapa resetado. Pronto para uma nova rota!');
    map.setCenter({ lat: -22.5211, lng: -41.9577 });
    map.setZoom(12);
}