# 📚 Biblioteca de Seções

Biblioteca de seções reutilizáveis (HTML / CSS / JS) com servidor Node.js + Express e dados compartilhados via `db.json`. Você e sua equipe acessam a mesma biblioteca na rede local — todos veem e editam os mesmos dados.

Organize trechos de código em **categorias**, anexe um **screenshot** de cada seção e copie HTML, CSS ou JS individualmente com um clique.

---

## ✨ Funcionalidades

- Categorias com ícone e cores personalizadas (badge de fundo + texto).
- Seções com nome, descrição, imagem (screenshot) e código separado em **HTML / CSS / JS**.
- Busca por nome ou descrição dentro de cada categoria.
- Copiar cada parte do código individualmente.
- Dados persistidos no servidor (`db.json`) e compartilhados entre todos na mesma rede.

---

## 🗂️ Estrutura do projeto

```
biblioteca/
├── server.js          # Servidor Express + API REST (escuta em 0.0.0.0:3000)
├── db.json            # Banco de dados (criado automaticamente se não existir)
├── package.json
├── style.scss         # Fonte SCSS (compilada para public/assets/css/style.css)
└── public/            # Arquivos servidos ao navegador
    ├── index.html
    └── assets/
        ├── css/style.css   # CSS compilado do SCSS
        ├── js/main.js      # Frontend (consome a API via fetch)
        └── img/logo.jpeg
```

---

## 🚀 Como rodar

Pré-requisitos: **Node.js** instalado.

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor
npm start
```

Acesse em **http://localhost:3000**

Para parar o servidor: `Ctrl + C`.

---

## 👥 Compartilhar na rede local (Wi-Fi)

Com o servidor rodando, qualquer pessoa na **mesma rede Wi-Fi** pode acessar pelo IP da sua máquina.

**Descobrir seu IP local:**

```bash
# macOS (Wi-Fi)
ipconfig getifaddr en0

# Linux
hostname -I

# Windows
ipconfig
```

Compartilhe o endereço resultante, por exemplo: **http://192.168.1.77:3000**

> 💡 No **macOS**, se os outros não conseguirem conectar, libere o `node` no firewall em
> *Ajustes → Rede → Firewall → Opções*. No **Windows**, permita o Node.js na primeira solicitação do firewall.

> ⚠️ O IP local pode mudar ao reiniciar o roteador — rode o comando novamente se necessário.

---

## 🎨 Estilos (SCSS)

O visual é definido em `style.scss` (raiz do projeto) e compilado para `public/assets/css/style.css`.

```bash
# Compilar uma vez
npm run build:css

# Recompilar automaticamente a cada alteração
npm run watch:css
```

As fontes **Sora** e **JetBrains Mono** são carregadas do Google Fonts (`@import` no topo do SCSS), portanto exigem conexão com a internet para exibir corretamente.

---

## 🔌 API REST

Base: `/api`

### Categorias

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/categories` | Lista todas as categorias |
| `POST` | `/api/categories` | Cria uma categoria |
| `PUT` | `/api/categories/:id` | Edita uma categoria |
| `DELETE` | `/api/categories/:id` | Remove a categoria **e seus componentes** |

### Componentes (seções)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/components` | Lista todos (aceita `?catId=...` para filtrar) |
| `POST` | `/api/components` | Cria um componente |
| `PUT` | `/api/components/:id` | Edita um componente |
| `DELETE` | `/api/components/:id` | Remove um componente |

---

## 🗃️ Formato do `db.json`

```json
{
  "categories": [
    {
      "id": "string único",
      "name": "Garantia",
      "emoji": "🛡️",
      "bg": "#ede8ff",
      "color": "#4423A7"
    }
  ],
  "components": [
    {
      "id": "string único",
      "catId": "id da categoria",
      "name": "Garantia 30 dias",
      "desc": "Descrição curta",
      "html": "<div>...</div>",
      "css": "div { ... }",
      "js": "console.log('ok')",
      "img": "data:image/png;base64,...",
      "createdAt": 1234567890
    }
  ]
}
```

> O campo `img` é o screenshot em **base64** (gerado pelo `FileReader` no navegador) e fica salvo direto no JSON — não há upload de arquivo separado. O servidor aceita corpo de requisição de até **25 MB** para acomodar imagens.

---

## ⚠️ Observações

- **Atualização em tempo real:** a tela de quem faz uma alteração atualiza na hora. As telas dos **outros** só atualizam ao recarregar a página ou trocar de categoria (não há WebSocket/push automático).
- **Backup:** todos os dados ficam em `db.json`. Faça cópia desse arquivo para não perder a biblioteca.
- **Sem autenticação:** qualquer pessoa na rede pode ver e editar. Adequado para uso interno/confiável. Para expor publicamente na internet, adicione autenticação primeiro.

---

## 📜 Scripts disponíveis

| Comando | O que faz |
|---------|-----------|
| `npm start` | Inicia o servidor em `0.0.0.0:3000` |
| `npm run build:css` | Compila `style.scss` → `public/assets/css/style.css` |
| `npm run watch:css` | Recompila o SCSS automaticamente a cada alteração |
