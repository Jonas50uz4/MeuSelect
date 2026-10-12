# Meu Lar — base inicial de uma imobiliária

Projeto para aprender Node.js, Express e HTML/CSS/JavaScript puro. Inclui login, painel com cadastro de foto, baixa, reativação e exclusão, além da listagem pública. A marca “Meu Lar” é ilustrativa e pode ser substituída.

Esta primeira versão possui **uma conta de corretor**, configurada no ambiente. Não há cadastro de usuários, recuperação de senha nem permissões individuais. Se sua equipe precisa de contas separadas, a próxima etapa é adicionar uma tabela de usuários e um fluxo de gestão de corretores.

## 1. Estrutura de pastas

```text
MeuSelect/
├── package.json           # Dependências e comandos do projeto
├── package-lock.json      # Versões exatas instaladas; deve ir para o GitHub
├── server.js              # Servidor Express, login, sessão e API
├── .env.example           # Modelo da configuração, sem credenciais reais
├── .gitignore             # O que o Git não deve enviar ao GitHub
├── README.md              # Este guia
├── src/
│   └── store.js           # Leitura e gravação dos imóveis em JSON
├── public/
│   ├── media/
│   │   └── hero-placeholder.svg # Fundo “Sua imagem aqui”; substitua quando quiser
│   ├── index.html         # Página pública de imóveis
│   ├── login.html         # Formulário de login
│   ├── dashboard.html     # Painel do corretor
│   ├── css/
│   │   └── style.css      # Aparência e adaptação a celular
│   └── js/
│       ├── property-catalog.js # Tipos, cidades, bairros e condomínios permitidos
│       ├── site-config.js # Configuração da imagem, vídeo opcional e redes sociais
│       ├── common.js      # Requisições e criação de cartões
│       ├── listing.js     # Carrega imóveis na página pública
│       ├── login.js       # Envia e-mail e senha ao servidor
│       └── dashboard.js   # Cadastro, baixa, reativação, exclusão e saída
└── test/
    └── app.test.js        # Teste integrado do fluxo e das proteções
```

Ao instalar e rodar, surgem também:

```text
.env                        # Sua configuração privada; nunca enviar ao GitHub
node_modules/               # Pacotes instalados; nunca enviar ao GitHub
storage/
├── properties.json         # Dados dos imóveis
├── uploads/                # Fotos convertidas para JPG
└── sessions/               # Sessões de login
```

`storage/` fica fora do Git. É dado do sistema, não código-fonte. Ela só surge ao iniciar o servidor. Seu conteúdo precisa de backup separado.

## 2. O que cada parte faz

### `package.json`

É a ficha do projeto. `dependencies` lista bibliotecas que precisam ser instaladas. `scripts` dá nomes curtos a comandos:

| Comando | Função |
| --- | --- |
| `npm install` | Instala as bibliotecas em `node_modules` |
| `npm run dev` | Inicia o servidor e reinicia quando o código do servidor muda |
| `npm start` | Inicia normalmente, como na hospedagem |
| `npm test` | Executa o teste automatizado |

O `package-lock.json` registra exatamente as versões instaladas. Na hospedagem, `npm ci` instala essas versões sem alterar o arquivo.

As dependências têm estes papéis:

| Pacote | Para que serve |
| --- | --- |
| `express` | Recebe pedidos HTTP e devolve páginas ou dados |
| `dotenv` | Carrega variáveis do `.env` |
| `express-session` | Identifica o corretor por uma sessão com cookie |
| `session-file-store` | Guarda as sessões no disco em vez de apenas na memória |
| `express-rate-limit` | Limita tentativas de login por endereço IP |
| `helmet` | Define cabeçalhos de segurança |
| `multer` | Recebe o arquivo de foto enviado pelo formulário |
| `sharp` | Verifica, redimensiona e converte a imagem |

### `server.js`

É o ponto de entrada. Primeiro lê a configuração e verifica se você substituiu os valores de exemplo. Depois prepara pastas, sessão, páginas e rotas da API. Por fim, `app.listen()` abre uma porta para o navegador acessar.

Uma **rota** é uma combinação de endereço e método. Por exemplo, `GET /api/properties` devolve os imóveis disponíveis. `POST /api/properties` cria um imóvel. `GET` lê, `POST` cria ou executa uma ação, `PATCH` modifica parcialmente e `DELETE` exclui.

Uma **API** permite ao JavaScript pedir dados sem recarregar toda a página. Aqui ela responde em JSON: uma representação de objetos e listas que o JavaScript entende.

Um **middleware** é uma função executada antes da função principal de uma rota. `authenticated` verifica login; `csrf` verifica um token antes de alterações; `upload` recebe a foto. O cadastro só é executado depois que essas verificações passam.

A senha configurada é comparada usando `scrypt` e comparação de tempo constante, recursos do Node. O `.env` contém a senha original e precisa ser privado. O servidor não envia essa senha ao navegador nem a grava no arquivo de imóveis.

### `src/store.js`

Lê `properties.json` e grava uma lista atualizada. Antes de substituir o arquivo principal, grava um arquivo temporário. Essa abordagem é didática e adequada a um único processo com pouco volume. Não é um banco de dados com transações nem suporta várias instâncias escrevendo ao mesmo tempo.

### Arquivos HTML, CSS e JavaScript

HTML define a estrutura: títulos, campos, botões e áreas de conteúdo. CSS define cores, espaçamento e layout. JavaScript responde aos cliques e conversa com a API usando `fetch()`.

`index.html` carrega `common.js` e `listing.js`. `listing.js` busca a lista; `common.js` transforma cada imóvel em um cartão. O mesmo cartão é reutilizado no painel com botões adicionais. Os textos usam `textContent`, para que descrições digitadas sejam mostradas como texto.

`login.js` primeiro obtém uma sessão e seu token. Ao enviar o formulário, pede login ao servidor. O navegador guarda um cookie `HttpOnly`, inacessível ao JavaScript, para identificar a sessão.

O login dura até oito horas e não é prorrogado por leitura de páginas. Ao sair, a sessão é removida do servidor. A listagem pública não precisa de sessão.

`dashboard.js` verifica quem está conectado e busca todos os imóveis. Para cadastrar, envia um `FormData`, que inclui campos e arquivo. Para dar baixa ou excluir, chama as rotas correspondentes. Um usuário sem login também é bloqueado pelo servidor, mesmo que tente chamar a API diretamente.

`public/` organiza o front-end, mas não é publicado inteiro automaticamente. O servidor publica CSS/JS e escolhe quais páginas entregar; a página do painel exige sessão.

## 3. Rodar no seu computador, passo a passo

1. Instale uma versão LTS do Node.js compatível com este projeto (Node 22 ou superior), pelo [site oficial](https://nodejs.org/). A instalação normal também inclui `npm`.
2. Abra `C:\MeuSelect` no VS Code e abra um terminal PowerShell.
3. Confira as ferramentas:

```powershell
node --version
npm --version
```

Se não forem reconhecidas, reabra o terminal após instalar. Se o PowerShell bloquear `npm.ps1`, use `npm.cmd` nos comandos abaixo; não precisa desativar a política de segurança.

4. Entre na pasta e instale as dependências:

```powershell
cd C:\MeuSelect
npm install
```

5. Copie a configuração de exemplo:

```powershell
Copy-Item .env.example .env
```

Execute esse comando apenas se ainda não tiver um `.env`, para preservar sua configuração.

6. Gere uma chave aleatória:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

7. Abra `.env` no editor e configure:
   - `SESSION_SECRET`: cole a chave gerada, sem espaços.
   - `BROKER_EMAIL`: coloque o e-mail de acesso que você escolheu.
   - `BROKER_PASSWORD`: coloque uma senha forte com pelo menos 12 caracteres. Envolva a senha em aspas se contiver `#`, pois esse caractere pode iniciar um comentário no `.env`.
   - Deixe `NODE_ENV=development`, `PORT=3000` e `DATA_DIR=./storage` para uso local.
   - Deixe `WIX_ORIGIN` vazio enquanto trabalha localmente.

Não há uma senha padrão pronta: o projeto exige que você escolha a sua antes de iniciar.

8. Inicie:

```powershell
npm run dev
```

9. Abra no navegador:
   - Listagem: [http://localhost:3000](http://localhost:3000).
   - Login: [http://localhost:3000/login](http://localhost:3000/login).
   - Painel: [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

`localhost` é seu próprio computador. Não abra o HTML por duplo clique: ele precisa do servidor para carregar a API.

10. Faça login com os valores do `.env`, cadastre um imóvel e abra a listagem em outra aba. Ao dar baixa, ele some da lista pública após recarregar a página, mas continua no painel. Reativar faz ele voltar. Excluir pede confirmação e remove o registro e a foto.

Para parar, pressione `Ctrl+C` no terminal. Para aplicar alterações no `.env`, pare e inicie novamente. Para atualizar HTML/CSS/JS no navegador, recarregue a página.

Se aparecer `EADDRINUSE`, a porta está ocupada. Pare outro servidor ou mude `PORT` e use o novo número no endereço.

## 4. Testar

```powershell
npm test
```

O teste inicia um servidor temporário, verifica bloqueio sem login, token de proteção, login correto/incorreto, upload real e inválido, persistência dos dados, baixa, reativação, exclusão, CORS público e logout. Os dados do teste ficam em uma pasta temporária isolada.

Também faça uma conferência no navegador: tela pequena, mensagens de erro e cadastro com sua própria foto. A página começa vazia de propósito, sem imóveis fictícios.

## 5. Preparar para GitHub

O **Git** registra versões do código. O **GitHub** hospeda esse histórico. GitHub não executa o servidor Express; a execução fica no Render.

1. Instale Git e crie sua conta no GitHub.
2. Crie um repositório vazio chamado `imobiliaria-inicial`. Para seguir estes comandos, não adicione README nem `.gitignore` pelo GitHub: eles já existem aqui.
3. No terminal da pasta do projeto:

```powershell
git init
git add .
git status
```

4. Confira os arquivos listados. `.env`, `node_modules/` e `storage/` **não devem aparecer**. Envie `.env.example`, pois só contém exemplos. Confira também:

```powershell
git check-ignore .env node_modules storage
```

5. Configure nome e e-mail para os commits, se ainda não configurou:

```powershell
git config user.name "Seu Nome"
git config user.email "seu-email@example.com"
```

6. Faça o primeiro commit:

```powershell
git commit -m "Cria base da imobiliaria com Express"
git branch -M main
```

7. Copie a URL HTTPS do repositório e substitua o exemplo:

```powershell
git remote add origin https://github.com/SEU_USUARIO/imobiliaria-inicial.git
git push -u origin main
```

O GitHub pode pedir autenticação pelo navegador ou token; não use a senha da sua conta como senha do Git.

Para enviar futuras alterações:

```powershell
git add .
git status
git commit -m "Descreve a alteracao realizada"
git push
```

Nunca publique credenciais. Se uma senha já foi enviada ao GitHub, removê-la do arquivo não apaga o histórico: troque a senha e a chave imediatamente.

## 6. Hospedar no Render

Esta versão guarda dados e fotos no disco. Por isso precisa de **Web Service com disco persistente**, não de Static Site. O sistema de arquivos padrão do Render é temporário; serviços gratuitos não aceitam disco persistente. Veja [discos persistentes](https://render.com/docs/disks) e [limitações do plano gratuito](https://render.com/docs/free). Confira o custo exibido na plataforma antes de contratar.

1. Envie o código para o GitHub.
2. No Render, crie um **Web Service** e conecte esse repositório.
3. Configure runtime Node e branch `main`.
4. Use **Build Command**: `npm ci`.
5. Use **Start Command**: `npm start`.
6. Configure **Health Check Path**: `/health`.
7. Adicione um disco persistente com caminho de montagem `/var/data`.
8. Configure variáveis de ambiente no painel do Render:

| Nome | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | Uma nova chave aleatória longa |
| `BROKER_EMAIL` | E-mail de acesso |
| `BROKER_PASSWORD` | Uma nova senha forte |
| `DATA_DIR` | `/var/data` |
| `WIX_ORIGIN` | Origem exata do Wix, se usar a API no navegador |

Use a porta fornecida pelo Render; o código lê `PORT`. Não envie `.env` para a hospedagem nem copie suas credenciais para arquivos públicos.

9. Faça o deploy e teste a URL HTTPS gerada: listagem, `/login`, cadastro e baixa.
10. Faça um novo deploy e confirme que o imóvel e a foto continuam disponíveis. Isso verifica a configuração do disco.

Mantenha **uma instância e um processo Node** nesta arquitetura. Para maior volume, vários corretores com contas próprias ou múltiplas instâncias, evolua para PostgreSQL, armazenamento de imagens externo e sessões em um serviço compartilhado. Faça backups de `properties.json` e `uploads/`.

Documentação oficial: [deploy de Express no Render](https://render.com/docs/deploy-node-express-app).

### E a Vercel?

A Vercel aceita Node/Express, mas seu modelo de funções não oferece este disco como armazenamento persistente de dados de aplicação. Antes de implantar lá, substitua JSON por banco externo, fotos por armazenamento de objetos e sessões por armazenamento compartilhado. Não basta adicionar um `vercel.json`. Veja [runtime Node da Vercel](https://vercel.com/docs/functions/runtimes/node-js) e [limitações do sistema de arquivos](https://github.com/vercel/community/discussions/314).

## 7. Integrar com Wix por iframe

O Wix incorpora a página pública hospedada; o Node continua rodando no Render. A URL precisa usar HTTPS, conforme a [documentação oficial do Wix](https://dev.wix.com/docs/develop-websites/articles/wix-editor-elements/other-elements/html-i-frame-element/embedding-a-site-in-an-html-i-frame-element).

1. Publique o projeto no Render.
2. No editor Wix, adicione um elemento de incorporação de site/HTML.
3. Use a URL pública do Render ou este HTML, substituindo o domínio:

```html
<iframe
  src="https://SEU-SERVICO.onrender.com/"
  title="Imóveis disponíveis"
  width="100%"
  height="900"
  style="border: 0;"
  loading="lazy">
</iframe>
```

4. Ajuste a altura do elemento no desktop e no celular. O iframe não ajusta sua altura automaticamente com esta versão.
5. Publique o Wix e teste os imóveis.

O link “Área do corretor” abre uma nova aba. A listagem pública permite incorporação; login e painel aceitam somente frames da própria origem. Use o login na URL direta do serviço, pois sessões dentro de frames de outro domínio podem depender de bloqueios de cookies do navegador.

## 8. Integrar com Wix por API

Em vez de incorporar uma página inteira, você pode buscar os imóveis e montar sua própria interface no Wix. A rota pública é:

```http
GET https://SEU-SERVICO.onrender.com/api/properties
```

Exemplo de retorno (dados ilustrativos):

```json
[
  {
    "id": "identificador-do-imovel",
    "title": "Apartamento com varanda",
    "price": 350000,
    "description": "Dois quartos e uma vaga.",
    "photo": "/uploads/identificador-do-imovel.jpg",
    "status": "available",
    "createdAt": "2026-10-11T12:00:00.000Z"
  }
]
```

Para uma chamada em JavaScript no navegador, configure `WIX_ORIGIN` com a origem real publicada, por exemplo `https://www.suaimobiliaria.com.br`. CORS informa ao navegador quais sites podem ler uma resposta. Não é um mecanismo de autenticação: a lista de imóveis é pública.

Exemplo conceitual de consumo; adapte a exibição aos elementos do seu projeto Wix/Velo:

```javascript
async function buscarImoveis() {
  const base = 'https://SEU-SERVICO.onrender.com';
  const resposta = await fetch(`${base}/api/properties`);
  if (!resposta.ok) throw new Error('Não foi possível carregar os imóveis.');
  const imoveis = await resposta.json();
  return imoveis.map(imovel => ({
    ...imovel,
    photo: new URL(imovel.photo, base).href
  }));
}
```

O campo `photo` é um caminho relativo; por isso o exemplo converte para uma URL completa. Para simples iframe, essa conversão não é necessária.

Somente leitura pública possui CORS. As alterações continuam no painel autenticado da aplicação. Não coloque senha de corretor, segredo de sessão ou token privado no código público do Wix.

## 9. Referência das rotas

| Método | Caminho | Acesso e função |
| --- | --- | --- |
| GET | `/` | Página pública |
| GET | `/login` | Tela de login |
| GET | `/dashboard` | Painel; exige login |
| GET | `/health` | Verificação da hospedagem |
| GET | `/api/session` | Identificação da sessão e token CSRF |
| POST | `/api/login` | Login; exige token CSRF |
| POST | `/api/logout` | Saída; exige login e token |
| GET | `/api/properties` | Imóveis disponíveis; público |
| GET | `/api/admin/properties` | Todos os imóveis; exige login |
| POST | `/api/properties` | Cadastro multipart; exige login e token |
| PATCH | `/api/properties/:id/status` | Baixa/reativação; exige login e token |
| DELETE | `/api/properties/:id` | Exclusão; exige login e token |

Dar baixa preserva registro e foto; a URL da foto continua pública caso alguém já a conheça. Use exclusão se precisar remover também o arquivo da foto. Clientes que já abriram a lista precisam recarregá-la para ver alterações.

Esta é uma base inicial funcional. Para uma operação maior, as próximas etapas são contas individuais, banco transacional, recuperação de senha, auditoria e backups automatizados.

## 10. Personalizar o novo destaque e a busca

O cabeçalho da página pública tem logo à esquerda, menu central e ícones sociais à direita. Em telas pequenas, o menu passa para uma segunda linha. O item Comprar leva aos imóveis; Empreendimentos leva à sua vitrine demonstrativa.

O fundo inicial é um arquivo SVG com o aviso “Sua imagem aqui”. Para trocar:

1. Coloque sua foto em `public/media/`, por exemplo `capa.jpg`.
2. Abra `public/js/site-config.js`.
3. Troque `heroImage` por `/media/capa.jpg`.
4. Atualize a página no navegador. Não é necessário mudar a caixa de pesquisa.

Para ativar um vídeo, coloque um MP4 compatível com o navegador em `public/media/hero.mp4` e preencha `heroVideo: '/media/hero.mp4'`. Ele será reproduzido automaticamente, sem som e em loop; há um botão de pausa. Pessoas com preferência por movimento reduzido podem iniciar a reprodução manualmente. Se o navegador bloquear autoplay ou o vídeo falhar, a imagem permanece disponível. Use uma foto adequada em `heroImage` como alternativa.

Os ícones de Instagram, Facebook e YouTube ficam desativados até você preencher URLs HTTPS reais em `socialLinks` no mesmo arquivo. Depois, abrirão seus perfis em uma nova aba.

O modelo de pesquisa possui os campos Tipo de imóvel, Cidade, Bairro, Condomínios e Código. As opções ficam centralizadas em `public/js/property-catalog.js`, usado pela interface e pela validação do servidor:

| Campo | Opções |
| --- | --- |
| Tipo de imóvel | Apartamento, Casa, Casa em condomínio, Loft e Terreno |
| Cidade | Capão da Canoa, Xangri-lá e Osório |
| Bairro | Centro, disponível para as três cidades |
| Condomínio | Enseada; selecionar condomínio é opcional |

O corretor informa esses dados no cadastro. Tipo e cidade são obrigatórios; o bairro inicia como Centro. O código é gerado automaticamente pelo servidor e mostrado no cartão. Os novos dados também são retornados pela API nos campos `type`, `city`, `neighborhood`, `condominium` e `code`.

O botão Buscar combina os filtros selecionados; uma opção “Todos” deixa o campo sem restrição. Código procura uma correspondência exata, ignorando maiúsculas e minúsculas. As opções de bairro e condomínio são cadastros fornecidos pelo usuário, sem geolocalização externa.

A opção **Avançado** inicia fechada e contém Palavra-chave e a faixa mínima/máxima de R$ 250 mil a R$ 25 milhões. Os controles avançam em passos de R$ 50 mil e não permitem mínimo maior que máximo. As palavras são buscadas no título e na descrição, ignorando acentos e maiúsculas. Preço e palavra-chave são aplicados ao clicar em Buscar com Avançado aberto; fechá-lo e buscar novamente ignora esses critérios. Limpar filtros restaura a lista completa e fecha Avançado.

Cadastros antigos recebem Centro quando ainda não tinham bairro e um código quando ainda não tinham código. Tipo e cidade antigos não são presumidos; imóveis sem esses dados continuam na listagem geral, mas não correspondem a filtros específicos de tipo ou cidade.

O botão “Atualizar imóveis” busca novamente os dados do servidor sem perder os filtros já aplicados. Também permite tentar novamente depois de uma falha de conexão. As mensagens de erro são apresentadas em português.

Além do teste integrado da API, `test/listing.test.js` verifica a busca, os limites de preço, atualização com filtros e preferências de cookies em um DOM simulado. `test/request.test.js` verifica erros de conexão e respostas inválidas. Execute todos com `npm test`.

A barra inferior oferece Concordar e Rejeitar e salva sua escolha no `localStorage` do navegador. A preferência permanece após recarregar e pode ser alterada em “Preferências de cookies”, no rodapé. Atualmente, não há analytics nem publicidade para ativar: ambos os botões apenas registram a preferência sobre cookies opcionais. O cookie de sessão do corretor continua necessário para o login. Se adicionar scripts opcionais no futuro, carregue-os somente quando a preferência permitir.

## 11. Vitrines de anúncios na rolagem

Logo após o destaque, aparecem cinco carrosséis nesta ordem: Lançamento, Ofertas, Novidades, Casas em condomínios e Empreendimentos. Cada vitrine tem oito anúncios de preenchimento, com títulos exclusivos de três dígitos (Anúncio 101 a 108, 201 a 208, até 501 a 508).

No computador, quatro cartões são exibidos simultaneamente. No tablet são dois, e no celular um, mantendo imagens e textos legíveis. A cada quatro segundos, a janela avança um anúncio e continua circularmente. As setas nas laterais permitem avançar ou retornar manualmente. O contador indica a posição do primeiro anúncio visível.

O botão Pausar/Retomar controla a troca automática. A rotação também pausa com o mouse sobre a seção, durante navegação por teclado nos controles, quando a seção fica fora da tela, quando a aba está oculta ou quando o navegador pede movimento reduzido. As setas continuam funcionando.

As imagens são SVGs de preenchimento com “Sua imagem aqui”. Para substituir a imagem comum, altere `advertImage` em `public/js/site-config.js`; para configurar imagens individuais e títulos, edite os dados retornados por `buildShowcases()` em `public/js/showcases.js`. Esses anúncios são demonstrativos e não criam registros no armazenamento de imóveis. A lista real e os resultados da busca aparecem depois das cinco vitrines.

O arquivo `test/showcases.test.js` verifica a ordem, títulos únicos, quatro anúncios visíveis, retorno circular, intervalo de 4.000 ms e comportamento das pausas.

## 12. Atendimento pelo WhatsApp

O botão verde flutuante fica no canto inferior direito e abre uma janela com a mensagem “Olá, estou olhando o site e tem interesse em um imóvel”. O visitante pode editar livremente o texto antes de clicar em “Enviar pelo WhatsApp Web”. O botão abre uma nova aba com o destinatário +55 (51) 99624-0974 e a mensagem preenchida. O envio é confirmado pelo visitante no próprio WhatsApp, que pode solicitar login.

Configure `whatsappPhone` e `whatsappMessage` em `public/js/site-config.js` para trocar o número ou o texto inicial. O rascunho fica apenas na memória da página: não é salvo no servidor nem no armazenamento do navegador. A janela pode ser fechada por ×, Escape ou clique fora; o texto editado permanece ao reabrir na mesma página. O botão flutuante se posiciona acima da barra de cookies quando ela estiver visível.

`test/whatsapp.test.js` verifica o destinatário, a mensagem pronta, a preservação do texto editado e a rejeição de entradas inválidas. Os testes não abrem o WhatsApp nem enviam mensagens reais.
