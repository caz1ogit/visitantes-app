# Projeto de Verificação de Convites

Sistema de validação e cadastro de convites para visitantes.

## O que é este projeto

Esta aplicação é composta por:

- **Frontend** (`public/`): páginas HTML/CSS/JS que coletam nome, foto, localização e fingerprint do visitante.
- **Backend** (`api/`): funções serverless em Node.js que validam convites, iniciam sessão, salvam dados e atualizam localização.

O banco de dados utilizado é o **Supabase** (PostgreSQL).

---

## Estrutura do Projeto

```
/
├── api/
│   ├── validar-convite.js        # Valida token do convite
│   ├── iniciar-sessao.js         # Coleta fingerprint e localização iniciais
│   ├── salvar-dados.js           # Salva nome e foto do visitante
│   └── atualizar-localizacao.js  # Atualiza localização em tempo real
├── public/
│   ├── index.html                # Página principal do convite
│   ├── sucesso.html              # Página de confirmação
│   ├── script.js                 # Lógica do frontend
│   ├── styles.css                # Estilos
│   ├── package.json
│   └── img/                      # Logo e favicon
├── vercel.json                   # Configuração da Vercel
├── README.md                     # Este arquivo
└── api/package.json
```

---

## Pré-requisitos

- **Node.js** 18.x ou superior (recomendado 22.x)
- **Conta na Vercel** (para deploy serverless)
- **Projeto no Supabase** com tabela `visitantes`
- Opcional: **Webhook URL** para notificações externas

---

## Configuração do Banco de Dados (Supabase)

Crie uma tabela chamada `visitantes` com as seguintes colunas:

```sql
create table visitantes (
  id uuid primary key default gen_random_uuid(),
  id_hash text unique,
  nome text,
  foto_url text,
  fingerprint text,
  latitude float,
  longitude float,
  utilizado boolean default false,
  created_at timestamp default now(),
  usado_em timestamp
);
```

Certifique-se de que:

- A `Row Level Security (RLS)` esteja configurada para permitir acesso via API anon key.
- As variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY` estejam disponíveis no ambiente.

---

## Variáveis de Ambiente

Configure estas variáveis no painel da Vercel ou em um arquivo `.env` local:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon
WEBHOOK_URL=https://sua-url-de-webhook.com/endpoint  # opcional
```

---

## Como executar localmente

1. Instale as dependências do backend:

```bash
cd api
npm install
```

2. Instale as dependências do frontend (necessárias para build com Vercel CLI):

```bash
cd public
npm install
```

3. Crie um arquivo `.env` na raiz com as variáveis acima.

4. Inicie o servidor de desenvolvimento da Vercel:

```bash
npm install -g vercel
vercel dev
```

A aplicação estará disponível em `http://localhost:3000` (ou outra porta indicada).

---

## Como fazer deploy na Vercel

1. Faça login na Vercel CLI:

```bash
vercel login
```

2. Execute o deploy:

```bash
vercel
```

3. No dashboard da Vercel, adicione as variáveis de ambiente (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `WEBHOOK_URL`).

4. Ajuste os redirects/URLs do frontend apontando para o novo domínio.

---

## Como integrar em um site WordPress

Você pode incorporar a aplicação em uma página do WordPress de algumas formas:

### Opção 1: Link externo

Crie um botão ou link no WordPress apontando para o domínio da Vercel:

```html
<a href="https://seu-projeto.vercel.app/?token=HASH_DO_CONVITE" target="_blank">
  Confirmar Convite
</a>
```

### Opção 2: Iframe incorporado

Adicione um bloco HTML personalizado no WordPress:

```html
<iframe
  src="https://seu-projeto.vercel.app/?token=HASH_DO_CONVITE"
  width="100%"
  height="800"
  frameborder="0"
  allow="camera; geolocation"
>
</iframe>
```

> **Atenção:** Iframes podem ter limitações para acesso à câmera e geolocalização dependendo do navegador. O uso via link direto é recomendado.

### Opção 3: Redirecionamento de página

Crie uma página no WordPress que redirecione para o formulário da Vercel com o token do convite.

---

## Ajustes necessários antes de publicar

- **URL do projeto**: substitua `https://seu-projeto.vercel.app` pelo domínio real.
- **URLs de redirect**: ajuste nos arquivos `public/script.js` e nos termos de uso em `public/index.html`.
- **Logo e favicon**: substitua as imagens em `public/img/`.
- **Nome do projeto**: ajuste os campos `name` em `public/package.json` e `api/package.json`.
- **Termos de uso**: revise os textos em `public/index.html` para refletir a nova marca.

---

## Dependências do Projeto

### Backend

- `@supabase/supabase-js`: comunicação com o banco de dados Supabase

### Frontend

- `@supabase/supabase-js`: acesso direto ao Supabase quando necessário
- `@fingerprintjs/fingerprintjs`: geração de identificador único do dispositivo
- Font Awesome: ícones
- Google Fonts: fonte Poppins

### Ferramentas

- Vercel CLI para desenvolvimento e deploy
- Node.js 22.x

---

## Segurança

- Nunca exponha a `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Mantenha o `WEBHOOK_URL` privado.
- Use HTTPS em produção.
- Valide o token do convite em todas as requisições.

---

## Suporte

Para dúvidas ou manutenção, revise os arquivos da pasta `api/` e a documentação da Vercel/Supabase.
