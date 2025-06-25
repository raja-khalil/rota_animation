// Variáveis globais
let map;
let marker;
let directionsService;
let directionsRenderer;
let interpolatedPath = [];
let pathIndex = 0;
let animationInterval;
let isAnimating = false;
let animationSpeed = 80;

console.log('🚀 Carregando map.js...');

/**
 * Inicializa o mapa - função chamada pela API do Google Maps
 */
function initMap() {
    console.log('🗺️ Inicializando mapa...');
    
    try {
        // Verificar se elemento mapa existe
        const mapElement = document.getElementById("map");
        if (!mapElement) {
            console.error('❌ Elemento mapa não encontrado');
            return;
        }

        // Criar mapa
        map = new google.maps.Map(mapElement, {
            zoom: 12,
            center: { lat: -22.5211, lng: -41.9577 }, // Rio das Ostras
            mapTypeId: 'roadmap',
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true
        });

        // Inicializar serviços
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: "#00d4aa",
                strokeOpacity: 1.0,
                strokeWeight: 4
            }
        });
        directionsRenderer.setMap(map);

        console.log('✅ Mapa inicializado com sucesso!');
        updateStatus('idle', '🗺️ Mapa carregado! Digite os endereços.');
        
        // Configurar eventos após mapa carregado
        setupEventListeners();
        
    } catch (error) {
        console.error('❌ Erro ao inicializar mapa:', error);
        updateStatus('error', '❌ Erro ao carregar mapa: ' + error.message);
    }
}

/**
 * Calcula rota entre dois pontos
 */
function calculateRoute() {
    console.log('🔍 Calculando rota...');
    
    const originInput = document.getElementById('origin');
    const destinationInput = document.getElementById('destination');
    
    if (!originInput || !destinationInput) {
        console.error('❌ Campos de input não encontrados');
        updateStatus('error', '❌ Erro: campos não encontrados');
        return;
    }
    
    const origin = originInput.value.trim();
    const destination = destinationInput.value.trim();

    if (!origin || !destination) {
        updateStatus('error', '⚠️ Digite ambos os endereços');
        return;
    }

    // Botão loading
    const button = document.getElementById('routeButton');
    if (button) {
        button.disabled = true;
        button.textContent = '🔄 Calculando...';
    }

    updateStatus('loading', '🔍 Calculando rota...');

    const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        region: 'br'
    };

    directionsService.route(request, (result, status) => {
        // Restaurar botão
        if (button) {
            button.disabled = false;
            button.textContent = '🗺️ Calcular Rota';
        }

        if (status === 'OK') {
            processRoute(result);
        } else {
            console.error('❌ Erro na rota:', status);
            updateStatus('error', '❌ Erro ao calcular rota: ' + status);
        }
    });
}

/**
 * Processa resultado da rota
 */
function processRoute(result) {
    console.log('📍 Processando rota...');
    
    directionsRenderer.setDirections(result);
    
    const route = result.routes[0];
    const leg = route.legs[0];
    
    // Atualizar informações
    updateRouteInfo(leg);
    
    // Criar pontos para animação
    createAnimationPath(route);
    
    // Criar marcadores
    createMarkers(leg);
    
    // Habilitar controles
    enableControls();
    
    updateStatus('completed', '✅ Rota calculada! Clique em Iniciar.');
}

/**
 * Atualiza informações da rota
 */
function updateRouteInfo(leg) {
    const distanceEl = document.getElementById('distance');
    const durationEl = document.getElementById('duration');
    const routeInfoEl = document.getElementById('routeInfo');
    
    if (distanceEl) distanceEl.textContent = leg.distance.text;
    if (durationEl) durationEl.textContent = leg.duration.text;
    if (routeInfoEl) routeInfoEl.style.display = 'block';
}

/**
 * Cria caminho para animação
 */
function createAnimationPath(route) {
    interpolatedPath = [];
    const path = route.overview_path;
    
    // Adicionar pontos interpolados
    for (let i = 0; i < path.length - 1; i++) {
        const start = path[i];
        const end = path[i + 1];
        
        // 10 pontos entre cada par
        for (let j = 0; j <= 10; j++) {
            const ratio = j / 10;
            const lat = start.lat() + (end.lat() - start.lat()) * ratio;
            const lng = start.lng() + (end.lng() - start.lng()) * ratio;
            interpolatedPath.push(new google.maps.LatLng(lat, lng));
        }
    }
    
    console.log(`📈 Criados ${interpolatedPath.length} pontos para animação`);
}

/**
 * Cria marcadores de início e fim
 */
function createMarkers(leg) {
    // Marcador de carro
    if (marker) marker.setMap(null);
    
    marker = new google.maps.Marker({
        position: leg.start_location,
        map: map,
        title: "🚗 Veículo",
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#2c3e50',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2
        }
    });
}

/**
 * Habilita controles de animação
 */
function enableControls() {
    const startBtn = document.getElementById('startButton');
    const resetBtn = document.getElementById('resetButton');
    
    if (startBtn) startBtn.disabled = false;
    if (resetBtn) resetBtn.disabled = false;
}

/**
 * Inicia animação
 */
function startAnimation() {
    if (isAnimating || !interpolatedPath.length) {
        if (!interpolatedPath.length) {
            updateStatus('error', '⚠️ Calcule uma rota primeiro!');
        }
        return;
    }
    
    console.log('▶️ Iniciando animação...');
    
    isAnimating = true;
    pathIndex = 0;
    
    // Atualizar botões
    const startBtn = document.getElementById('startButton');
    const stopBtn = document.getElementById('stopButton');
    
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    
    updateStatus('running', '🚗 Veículo em movimento...');
    
    // Iniciar animação
    animationInterval = setInterval(animateMarker, animationSpeed);
}

/**
 * Para animação
 */
function stopAnimation() {
    if (!isAnimating) return;
    
    console.log('⏸️ Parando animação...');
    
    isAnimating = false;
    clearInterval(animationInterval);
    
    // Atualizar botões
    const startBtn = document.getElementById('startButton');
    const stopBtn = document.getElementById('stopButton');
    
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    
    updateStatus('idle', '⏸️ Animação pausada');
}

/**
 * Reseta animação
 */
function resetAnimation() {
    console.log('🔄 Resetando animação...');
    
    stopAnimation();
    
    if (interpolatedPath.length > 0) {
        pathIndex = 0;
        marker.setPosition(interpolatedPath[0]);
        map.panTo(interpolatedPath[0]);
        updateProgress(0);
        updateStatus('idle', '🔄 Pronto para iniciar!');
    }
}

/**
 * Anima marcador
 */
function animateMarker() {
    if (pathIndex < interpolatedPath.length) {
        const currentPoint = interpolatedPath[pathIndex];
        
        // Mover marcador
        marker.setPosition(currentPoint);
        
        // Seguir com câmera ocasionalmente
        if (pathIndex % 5 === 0) {
            map.panTo(currentPoint);
        }
        
        // Atualizar progresso
        const progress = Math.round((pathIndex / interpolatedPath.length) * 100);
        updateProgress(progress);
        
        pathIndex++;
    } else {
        // Animação completa
        stopAnimation();
        updateStatus('completed', '🎉 Destino alcançado!');
        updateProgress(100);
    }
}

/**
 * Atualiza velocidade
 */
function updateSpeed() {
    const slider = document.getElementById('speedSlider');
    if (!slider) return;
    
    animationSpeed = 210 - parseInt(slider.value);
    
    // Reiniciar com nova velocidade se estiver animando
    if (isAnimating) {
        clearInterval(animationInterval);
        animationInterval = setInterval(animateMarker, animationSpeed);
    }
}

/**
 * Configura event listeners após elementos estarem prontos
 */
function setupEventListeners() {
    console.log('🎮 Configurando event listeners...');
    
    // Tentar várias vezes até elementos estarem disponíveis
    let attempts = 0;
    const maxAttempts = 10;
    
    function trySetup() {
        const originInput = document.getElementById('origin');
        const destInput = document.getElementById('destination');
        
        if (originInput && destInput) {
            // Adicionar listeners para Enter
            originInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('🔍 Enter pressionado no campo origem');
                    calculateRoute();
                }
            });
            
            destInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('🔍 Enter pressionado no campo destino');
                    calculateRoute();
                }
            });
            
            console.log('✅ Event listeners configurados com sucesso!');
            return true;
        } else {
            attempts++;
            if (attempts < maxAttempts) {
                console.log(`⏳ Tentativa ${attempts}/${maxAttempts} - aguardando elementos...`);
                setTimeout(trySetup, 200);
            } else {
                console.warn('⚠️ Não foi possível encontrar os campos de input após várias tentativas');
            }
            return false;
        }
    }
    
    trySetup();
}

/**
 * Atualiza status com proteção
 */
function updateStatus(type, message) {
    console.log(`📢 Status: ${type} - ${message}`);
    
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.className = `status ${type}`;
        statusEl.textContent = message;
    } else {
        console.warn('⚠️ Elemento status não encontrado');
    }
}

/**
 * Atualiza progresso com proteção
 */
function updateProgress(percent) {
    const progressEl = document.getElementById('progress');
    if (progressEl) {
        progressEl.textContent = `${percent}%`;
    }
}

// Expor funções globalmente
if (typeof window !== 'undefined') {
    window.initMap = initMap;
    window.calculateRoute = calculateRoute;
    window.startAnimation = startAnimation;
    window.stopAnimation = stopAnimation;
    window.resetAnimation = resetAnimation;
    window.updateSpeed = updateSpeed;
}

console.log('✅ map.js carregado com sucesso!');