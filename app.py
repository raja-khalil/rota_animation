import os
from flask import Flask, render_template, jsonify, request
from datetime import datetime
import requests # Necessário para fazer requisições HTTP do backend
# from flask_cors import CORS # Descomente se precisar de CORS para o frontend (ex: se frontend e backend estiverem em domínios diferentes)
import logging
from logging.handlers import RotatingFileHandler

# Criar aplicação Flask
app = Flask(__name__)

# Configurações
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
app.config['DEBUG'] = os.environ.get('FLASK_ENV') == 'development'

# Descomente se precisar de CORS (instale 'Flask-Cors' no requirements.txt)
# CORS(app)

# Configuração de logging
if not app.debug:
    # Configurar para gravar em arquivo (no Render, os logs são enviados para stdout/stderr automaticamente)
    # Isso é mais para um ambiente local ou para demonstração de logging
    handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=1)
    handler.setLevel(logging.INFO)
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

# Rota principal - página do mapa
@app.route('/')
def home():
    """Página principal com o mapa interativo"""
    # A chave da API agora é passada do backend para o frontend de forma segura
    Maps_api_key = os.environ.get('Maps_API_KEY')
    return render_template('index.html', Maps_api_key=Maps_api_key)

# Rota de saúde para o Render
@app.route('/health')
def health():
    """Health check endpoint para monitoramento"""
    app.logger.info("Health check requested.")
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

# Nova rota para calcular a rota no backend
@app.route('/calculate_route_backend', methods=['POST'])
def calculate_route_backend():
    """
    Recebe origem e destino do frontend, calcula a rota usando a Google Directions API
    no backend e retorna a polilinha e informações da rota.
    """
    data = request.get_json()
    origin = data.get('origin')
    destination = data.get('destination')
    
    if not origin or not destination:
        app.logger.warning("Missing origin or destination for route calculation.")
        return jsonify({'error': 'Origem e destino são obrigatórios.'}), 400

    api_key = os.environ.get('Maps_API_KEY')
    if not api_key:
        app.logger.error("Maps_API_KEY is not set.")
        return jsonify({'error': 'Chave da API do Google Maps não configurada no servidor.'}), 500

    # Construir URL da Google Directions API
    directions_url = (
        f"https://maps.googleapis.com/maps/api/directions/json?"
        f"origin={origin}&destination={destination}&mode=driving&key={api_key}"
    )

    try:
        response = requests.get(directions_url)
        response.raise_for_status() # Lança um HTTPError para respostas de status ruins (4xx ou 5xx)
        directions_data = response.json()

        if directions_data.get('status') == 'OK':
            # Extrair a polilinha e outras informações relevantes
            route_info = {
                'points': directions_data['routes'][0]['overview_polyline']['points'],
                'distance': directions_data['routes'][0]['legs'][0]['distance']['text'],
                'duration': directions_data['routes'][0]['legs'][0]['duration']['text']
            }
            app.logger.info(f"Route calculated successfully from {origin} to {destination}.")
            return jsonify(route_info)
        else:
            error_message = directions_data.get('error_message', 'Erro desconhecido da API do Google Maps.')
            app.logger.error(f"Google Maps API error: {error_message} for origin: {origin}, destination: {destination}")
            return jsonify({'error': f'Erro ao calcular rota: {error_message}'}), 400

    except requests.exceptions.RequestException as e:
        app.logger.error(f"Network or API request error: {e}", exc_info=True)
        return jsonify({'error': f'Erro de comunicação com a API do Google Maps: {e}'}), 500
    except Exception as e:
        app.logger.error(f"An unexpected error occurred: {e}", exc_info=True)
        return jsonify({'error': 'Ocorreu um erro inesperado no servidor.'}), 500

# Tratamento de erros para páginas não encontradas (404)
@app.errorhandler(404)
def page_not_found(e):
    app.logger.warning(f"404 Not Found: {request.path}")
    return render_template('404.html'), 404

# Tratamento de erros internos do servidor (500)
@app.errorhandler(500)
def internal_server_error(e):
    app.logger.error(f"500 Internal Server Error: {e}", exc_info=True)
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(debug=app.config['DEBUG'])