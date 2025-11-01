# 📚 Projeto Acadêmico – Gerenciador de Trilhas de Aprendizado - OrganizaE

---

## 🚀 Sobre o Projeto

Este é um aplicativo mobile desenvolvido em React Native para gerenciamento de atividades/trilhas acadêmicas.
Com ele, o aluno pode cadastrar, visualizar, pesquisar, editar e excluir trilhas de estudo, facilitando o acompanhamento de prazos e conteúdos.

---

## 🛠️ Tecnologias Utilizadas

- **React Native (Expo)**
- **JavaScript**
- **Node.js + Express** (backend)
- **react-native-toast-message** (notificações personalizadas)
- **react-native-mask-input** (máscara para datas)
- **@expo/vector-icons** (ícones)

---

## 📱 Funcionalidades

- ➕ **Adicionar trilha** com título, matéria, professor, data de entrega, status e link
- 📋 **Listar todas as trilhas** em cards organizados
- 🔍 **Pesquisar trilhas** por nome
- 📝 **Editar trilha existente**
- ❌ **Excluir trilha** (com confirmação via Toast)
- 📅 **Máscara automática para datas** no formato `dd/mm/yyyy`
- 🔔 **Mensagens toast personalizadas** (sucesso, erro, info)
- ✅ **Ícones correspondentes ao status** da trilha:
  - 🔴 **Pendente**
  - 🔵 **Em andamento**
  - 🟢 **Concluído**

---

## 🎨 Layout

- Interface **simples e intuitiva**
- Trilhas exibidas em **cards com ícones representativos**
- Ícones de status visíveis no cabeçalho de cada card

---

## ⚙️ Como Rodar o Projeto

### 🔹 Pré-requisitos

- Node.js instalado
- Expo CLI (`npm install -g expo-cli`)
- Servidor backend configurado (API Node/Express)

### 🔹 Passos

# Clone o repositório

git clone git@github.com:Brunosalles10/Projeto_Organizae.git

# Acesse a pasta

cd nome-do-repo

# Instale as dependências

npm install

# Inicie o projeto

npx expo start

### 🔹 Rotas da API

- POST /api/trilhas → Criar nova trilha

- GET /api/trilhas → Listar todas as trilhas

- PUT /api/trilhas/:id → Atualizar uma trilha

- DELETE /api/trilhas/:id → Excluir uma trilha

## 👨‍💻 Autores

- Projeto desenvolvido por Bruno,Eloana e Ana – acadêmico de Análise e Desenvolvimento de Sistemas.
