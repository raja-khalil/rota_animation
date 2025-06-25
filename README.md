# 🚗 Animação de Rotas Estilo Uber

Uma aplicação web moderna para visualizar animações de veículos em rotas do Google Maps, desenvolvida com Flask e integrada ao Render.

## 🌟 Funcionalidades

- ✅ **Cálculo de rotas** usando Google Maps Directions API
- ✅ **Animação suave** de veículos ao longo da rota
- ✅ **Autocomplete** inteligente para endereços
- ✅ **Controle de velocidade** da animação
- ✅ **Interface responsiva** para desktop e mobile
- ✅ **Informações detalhadas** da rota (distância e tempo)
- ✅ **Design moderno** com animações CSS

## 🛠️ Tecnologias Utilizadas

- **Backend:** Flask (Python 3.11)
- **Frontend:** HTML5, CSS3, JavaScript ES6
- **APIs:** Google Maps JavaScript API, Directions API, Geocoding API
- **Deploy:** Render.com
- **Servidor:** Gunicorn

## 📁 Estrutura do Projeto

```
animacao-rotas/
├── app.py                     # Aplicação Flask principal
├── requirements.txt           # Dependências Python
├── render.yaml               # Configuração do Render
├── README.md                 # Este arquivo
├── templates/
│   ├── index.html           # Template principal
│   ├── 404.html             # Página de erro 404
│   └── 500.html             # Página de erro 500
└── static/
    ├── css/
    │   └── style.css        # Estilos da aplicação
    ├── js/
    │   └── map.js           # JavaScript do mapa
    ├── images/
    │   └── favicon.png      # Ícone da aplicação
    └── manifest.json        # Manifesto PWA
```

## 🚀 Deploy no Render

### Passo 1: Preparar o Repositório

1. **Crie um repositório** no GitHub
2. **Clone** para sua máquina:
```bash
git clone https://github.com/seuusuario/animacao-rotas.git
cd animacao-rotas
```

3. **Adicione todos os arquivos** da estrutura acima ao repositório

### Passo 2: Deploy Automático

1. **Acesse** [render.com](https://render.com)
2. **Faça login** com sua conta GitHub
3. **Clique em "New"** → **"Web Service"**
4. **Conecte** seu repositório GitHub
5. **Configure:**
   - **Name:** `animacao-rotas`
   - **Environment:** `Python 3`
   - **Region:** `Oregon (US West)`
   - **Branch:** `main`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Instance Type:** `Free`

6. **Clique em "Create Web Service"**
7. **Aguarde** o deploy (2-5 minutos)

### Passo 3: Configurar Variáveis de Ambiente (Opcional)

No painel do Render, adicione:
- `FLASK_ENV=production`
- `SECRET_KEY=sua-chave-secreta-aqui`

## 🔑 Configuração da API Google Maps

### Após o Deploy:

1. **Acesse** [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. **Edite** sua chave de API: `AIzaSyCFUIkhN_hx7LhwlRWnqj_uaq4KejUSBBs`
3. **Adicione** nas restrições de HTTP referrer:
```
https://seu-app-nome.onrender.com/*
*.onrender.com/*
```

## 📱 URLs da Aplicação

### Produção:
- **App Principal:** `https://seu-app-nome.onrender.com`
- **Health Check:** `https://seu-app-nome.onrender.com/health`
- **API Info:** `https://seu-app-nome.onrender.com/api/info`

### Desenvolvimento Local:
```bash
# Instalar dependências
pip install -r requirements.txt

# Executar aplicação
python app.py

# Acessar em: http://localhost:5000
```

## 🔧 Funcionalidades da API

### Endpoints Disponíveis:

- `GET /` - Página principal do mapa
- `GET /health` - Health check para monitoramento
- `GET /api/info` - Informações da aplicação
- `404` - Página de erro personalizada

### Resposta do Health Check:
```json
{
    "status": "healthy",
    "timestamp": "2025-01-XX...",
    "service": "Maps Animation App"
}
```

## 🎮 Como Usar

1. **Acesse** a aplicação no seu domínio Render
2. **Digite** o endereço de partida
3. **Digite** o endereço de destino
4. **Clique** em "Calcular Rota"
5. **Aguarde** o cálculo da rota
6. **Clique** em "Iniciar" para ver a animação
7. **Controle** a velocidade com o slider
8. **Pause/Reset** quando necessário

## ⚡ Performance e Otimizações

### Implementadas:
- **Lazy loading** de recursos
- **Interpolação suave** de pontos
- **Debounce** no autocomplete
- **Cache** de elementos DOM
- **Otimizações mobile**

### Monitoramento:
- Health check endpoint
- Logs detalhados
- Error handling robusto

## 🐛 Solução de Problemas

### Erro: "API key inválida"
- Verifique se a chave está correta
- Confirme as restrições de domínio
- Certifique-se que as APIs estão ativadas

### Erro: "Rota não encontrada"
- Verifique os endereços digitados
- Tente endereços mais específicos
- Confirme que ambos os endereços estão no Brasil

### App não carrega
- Verifique os logs no Render Dashboard
- Confirme que o health check está OK
- Verifique a configuração de build

## 📊 Recursos do Render (Plano Gratuito)

- ✅ **750 horas/mês** de uptime
- ✅ **512MB RAM**
- ✅ **0.1 CPU**
- ✅ **100GB bandwidth**
- ✅ **SSL automático**
- ✅ **Deploy automático** via Git
- ✅ **Health checks**

## 🔄 Atualizações Futuras

### Planejadas:
- [ ] Suporte a múltiplos pontos de passagem
- [ ] Histórico de rotas
- [ ] Diferentes tipos de veículos
- [ ] Modo noturno
- [ ] Compartilhamento de rotas
- [ ] PWA completo

## 📝 Logs e Monitoramento

### Acessar logs no Render:
1. **Dashboard** → **Seu serviço**
2. **Logs** tab
3. **Real-time** ou **Historical**

### Métricas importantes:
- Response time
- Error rate
- Memory usage
- Request count

## 🤝 Contribuição

1. **Fork** o projeto
2. **Crie** uma branch para sua feature
3. **Commit** suas mudanças
4. **Push** para a branch
5. **Abra** um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

- **GitHub Issues:** Para reportar bugs ou solicitar features
- **Email:** seu-email@exemplo.com
- **Documentação:** Google Maps API Documentation

## 🎉 Créditos

- **Google Maps API** - Mapas e roteamento
- **Render.com** - Hospedagem e deploy
- **Flask** - Framework web Python
- **Font Awesome** - Ícones (se usado)

---

**Desenvolvido com ❤️ para demonstrar animações de rota estilo Uber**

## 🔥 Comandos Rápidos

### Setup Local:
```bash
# Clone e entre no diretório
git clone https://github.com/seuusuario/animacao-rotas.git
cd animacao-rotas

# Crie ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# Instale dependências
pip install -r requirements.txt

# Execute
python app.py
```

### Deploy no Render:
```bash
# Commit e push
git add .
git commit -m "Deploy inicial"
git push origin main

# O Render faz deploy automático!
```

### Verificar Status:
```bash
# Health check
curl https://seu-app.onrender.com/health

# Informações da API
curl https://seu-app.onrender.com/api/info
```

## 📋 Checklist de Deploy

- [ ] ✅ Repositório GitHub criado
- [ ] ✅ Arquivos da estrutura Flask adicionados
- [ ] ✅ Render conectado ao repositório
- [ ] ✅ Deploy realizado com sucesso
- [ ] ✅ Health check funcionando
- [ ] ✅ API Google Maps configurada
- [ ] ✅ Restrições de domínio adicionadas
- [ ] ✅ Teste completo da aplicação
- [ ] ✅ Monitoramento configurado

**🎯 Seu app estará funcionando em: `https://seu-app-nome.onrender.com`**"# maps_rota_animation" 
