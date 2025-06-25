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
// Um valor menor significa uma animação mais rápida.
const BASE_ANIMATION_DELAY = 50; // milissegundos (velocidade "Normal")

/**
 * Calcula o delay da animação com base no valor do slider.
 * Slider min=1 (1x velocidade) a max=100 (100x velocidade).
 * O delay real será BASE_ANIMATION_DELAY / sliderValue.
 * @param {number} sliderValue - Valor do slider (1 a 100).
 * @returns {number} Delay em milissegundos.
 */
function getAnimationDelay(sliderValue) {
    // Para evitar divisão por zero se min fosse 0, e para fazer 1x ser o padrão.
    // Quanto maior o sliderValue, menor o delay, e mais rápida a animação.
    // Ex: sliderValue=1 -> delay=50ms (Normal)
    // Ex: sliderValue=100 -> delay=0.5ms (100x mais rápido)
    return BASE_ANIMATION_DELAY / sliderValue;
}

/**
 * Atualiza a mensagem de status para o usuário e as classes de estilo.
 * @param {string} type - Tipo de status (idle, loading, error).
 * @param {string} message - Mensagem a ser exibida.
 */
function updateStatus(type, message) {
    // Remove todas as classes de status e adiciona a correta do Bootstrap
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

        // Ícone do carro personalizado
        // ATENÇÃO: Você precisa ter um arquivo 'car_icon.png' na pasta 'static/images/'
        const carIcon = {
            url: "{{ url_for('static', filename='images/car_icon.png') }}", // Caminho para o ícone do carro
            scaledSize: new google.maps.Size(35, 35),
            anchor: new google.maps.Point(17, 17) // Centraliza o ícone
        };
        marker = new google.maps.Marker({
            map: map,
            icon: carIcon,
            visible: false // Esconde o marcador até a rota ser carregada
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
        // Se a animação estiver rodando, reinicia com a nova velocidade para aplicar o delay
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
    speedValueSpan.textContent = `${value}x Velocidade`; // Exibe o multiplicador de velocidade
}


/**
 * Configura o autocomplete para os campos de endereço, permitindo buscar por nome de local.
 */
function setupAutocompletes() {
    // Autocomplete para origem
    const originAutocomplete = new google.maps.places.Autocomplete(originInput, {
        types: ['geocode', 'establishment'], // Permite endereços e nomes de estabelecimentos/locais
        componentRestrictions: { 'country': ['br'] } // Restringe para o Brasil
    });

    // Autocomplete para destino
    const destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput, {
        types: ['geocode', 'establishment'], // Permite endereços e nomes de estabelecimentos/locais
        componentRestrictions: { 'country': ['br'] }
    });

    // Opcional: listener para quando o usuário seleciona uma sugestão
    originAutocomplete.addListener('place_changed', () => {
        const place = originAutocomplete.getPlace();
        if (place.geometry) {
            console.log('Origem selecionada:', place.formatted_address);
            // Opcional: Centralizar mapa na origem ou destino se não houver rota
            // map.setCenter(place.geometry.location);
        }
    });
    destinationAutocomplete.addListener('place_changed', () => {
        const place = destinationAutocomplete.getPlace();
        if (place.geometry) {
            console.log('Destino selecionada:', place.formatted_address);
            // map.setCenter(place.geometry.location);
        }
    });
}

/**
 * Calcula rota entre dois pontos usando o backend.
 */
async function calculateRoute() {
    updateStatus('loading', '🔍 Calculando rota...');
    routeDetailsDiv.style.display = 'none'; // Esconde detalhes antigos

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
        clearInterval(animationInterval); // Para qualquer animação anterior
    }
    currentPathIndex = 0;
    marker.setVisible(false); // Esconde o marcador antes de iniciar a nova animação
    directionsRenderer.setDirections({ routes: [] }); // Limpa a rota anterior no mapa

    try {
        // Decodificar a polilinha recebida do backend
        routePath = google.maps.geometry.encoding.decodePath(routeData.points);

        if (routePath.length === 0) {
            throw new Error("Nenhum ponto de rota foi retornado.");
        }

        // Exibir a rota no mapa
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

        // Exibir detalhes da rota
        routeDetailsDiv.innerHTML = `
            <p><strong>Distância:</strong> ${routeData.distance}</p>
            <p><strong>Duração Estimada:</strong> ${routeData.duration}</p>
        `;
        routeDetailsDiv.style.display = 'block';

        // Posicionar o marcador no início da rota e torná-lo visível
        marker.setPosition(routePath[0]);
        marker.setVisible(true);
        map.setCenter(routePath[0]); // Centraliza o mapa no início da rota

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
            marker.setPosition(nextPosition);
            map.panTo(nextPosition); // Suaviza o movimento do mapa para seguir o carro
            // Opcional: rotacionar o ícone do carro na direção do movimento
            // Este é um recurso mais avançado e requer uma abordagem diferente (ex: Custom Overlay ou SVG dinâmico)
            // pois a propriedade 'rotation' não existe diretamente para Marker icons estáticos.
            // Se o ícone tiver direção fixa, não é necessário.
        } else {
            clearInterval(animationInterval);
            updateStatus('idle', '🏁 Animação concluída!');
        }
    }, animationDelay); // Usar o delay calculado dinamicamente
}

/**
 * Reseta o mapa, limpando a rota e os inputs.
 */
function resetMap() {
    if (animationInterval) {
        clearInterval(animationInterval);
    }
    directionsRenderer.setDirections({ routes: [] }); // Limpa a rota
    marker.setVisible(false); // Esconde o marcador
    currentPathIndex = 0;
    routePath = [];
    originInput.value = '';
    destinationInput.value = '';
    routeDetailsDiv.style.display = 'none';
    updateStatus('idle', 'Mapa resetado. Pronto para uma nova rota!');
    map.setCenter({ lat: -22.5211, lng: -41.9577 }); // Volta para o centro inicial
    map.setZoom(12);
}

// Garante que o mapa seja inicializado quando a página carregar
// A função initMap é chamada diretamente pela API do Google Maps via callback=initMap