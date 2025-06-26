import os
from flask import Flask, render_template, jsonify, request
from datetime import datetime
import requests
from dotenv import load_dotenv
import logging
from logging.handlers import RotatingFileHandler

load_dotenv()

app = Flask(__name__)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production-please-generate-a-new-one')
app.config['DEBUG'] = os.environ.get('FLASK_ENV') == 'development'

if not app.debug:
    log_dir = 'logs'
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    handler = RotatingFileHandler(os.path.join(log_dir, 'app.log'), maxBytes=10000, backupCount=1)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

@app.route('/')
def home():
    """Página principal com o mapa interativo"""
    Maps_api_key = os.environ.get('Maps_API_KEY')
    # --- LINHA DE DEBUG ADICIONADA AQUI ---
    print(f"DEBUG: Maps_API_KEY from environment: {Maps_api_key}") 
    # --- FIM DA LINHA DE DEBUG ---
    if not Maps_api_key:
        app.logger.warning("Maps_API_KEY não está configurada. O mapa pode não carregar ou funcionar corretamente.")
    return render_template('index.html', Maps_api_key=Maps_api_key)

@app.route('/health')
def health():
    app.logger.info("Health check requested.")
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Maps Animation App'
    })

@app.route('/calculate_route_backend', methods=['POST'])
def calculate_route_backend():
    data = request.get_json()
    origin = data.get('origin')
    destination = data.get('destination')
    
    if not origin or not destination:
        app.logger.warning("Missing origin or destination for route calculation (backend).")
        return jsonify({'error': 'Origem e destino são obrigatórios.'}), 400

    api_key = os.environ.get('Maps_API_KEY')
    if not api_key:
        app.logger.error("Maps_API_KEY is not set in backend.")
        return jsonify({'error': 'Chave da API do Google Maps não configurada no servidor.'}), 500

    directions_url = (
        f"https://maps.googleapis.com/maps/api/directions/json?"
        f"origin={origin}&destination={destination}&mode=driving&key={api_key}"
    )

    try:
        response = requests.get(directions_url)
        response.raise_for_status()
        directions_data = response.json()

        if directions_data.get('status') == 'OK':
            route_info = {
                'points': directions_data['routes'][0]['overview_polyline']['points'],
                'distance': directions_data['routes'][0]['legs'][0]['distance']['text'],
                'duration': directions_data['routes'][0]['legs'][0]['duration']['text']
            }
            app.logger.info(f"Route calculated successfully from '{origin}' to '{destination}' via backend.")
            return jsonify(route_info)
        elif directions_data.get('status') == 'ZERO_RESULTS':
             app.logger.warning(f"No route found for origin: {origin}, destination: {destination}. Status: ZERO_RESULTS")
             return jsonify({'error': 'Nenhuma rota encontrada para os endereços fornecidos. Tente ser mais específico.'}), 404
        else:
            error_message = directions_data.get('error_message', 'Erro desconhecido da API do Google Maps.')
            app.logger.error(f"Google Maps Directions API error: {error_message} (Status: {directions_data.get('status')}) for origin: {origin}, destination: {destination}")
            return jsonify({'error': f'Erro ao calcular rota: {error_message}'}), 400

    except requests.exceptions.RequestException as e:
        app.logger.error(f"Network or Google Directions API request error: {e}", exc_info=True)
        return jsonify({'error': f'Erro de comunicação com a API do Google Maps: {e}'}), 500
    except Exception as e:
        app.logger.error(f"An unexpected error occurred in calculate_route_backend: {e}", exc_info=True)
        return jsonify({'error': 'Ocorreu um erro inesperado no servidor.'}), 500

@app.errorhandler(404)
def page_not_found(e):
    app.logger.warning(f"404 Not Found: {request.path}")
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    app.logger.error(f"500 Internal Server Error: {e}", exc_info=True)
    return render_template('500.html'), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=app.config['DEBUG'], host='0.0.0.0', port=port)