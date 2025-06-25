import os
from flask import Flask, render_template, jsonify
from datetime import datetime

# Criar aplicação Flask
app = Flask(__name__)

# Configurações
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
app.config['DEBUG'] = os.environ.get('FLASK_ENV') == 'development'

# Rota principal - página do mapa
@app.route('/')
def home():
    """Página principal com o mapa interativo"""
    return render_template('index.html')

# Rota de saúde para o Render
@app.route('/health')
def health():
    """Health check endpoint para monitoramento"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'Maps Animation App'
    }), 200

# Rota de API para informações (exemplo)
@app.route('/api/info')
def api_info():
    """API endpoint com informações da aplicação"""
    return jsonify({
        'app_name': 'Animação de Rotas Estilo Uber',
        'version': '1.0.0',
        'description': 'Aplicação para animação de veículos em rotas do Google Maps',
        'endpoints': {
            '/': 'Página principal',
            '/health': 'Health check',
            '/api/info': 'Informações da API'
        }
    })

# Manipulador de erro 404
@app.errorhandler(404)
def not_found_error(error):
    """Página de erro 404 personalizada"""
    return render_template('404.html'), 404

# Manipulador de erro 500
@app.errorhandler(500)
def internal_error(error):
    """Página de erro 500 personalizada"""
    return render_template('500.html'), 500

if __name__ == '__main__':
    # Configuração para execução local e produção
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    app.run(
        debug=debug,
        host='0.0.0.0',
        port=port
    )