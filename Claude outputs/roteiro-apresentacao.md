# Roteiro para apresentar o site — EduSync

Isto não é texto para ler em voz alta. São os pontos de cada parte do site,
na ordem em que ela aparece quando você rola a página. Fale com as suas
palavras. O tempo total do passeio pelo site é de **4 a 5 minutos**.

---

## Antes de começar

- Site já aberto numa aba, **no topo da página**, zoom em 100%.
- Uma segunda aba com o app **já logado**, numa turma que tenha atividade
  corrigida. Se a internet cair, você ainda mostra essa tela.
- Print de uma folha corrigida salvo no celular, como último recurso.
- Feche notificações e outras abas.

---

## 1. Topo do site · 30 segundos

Mostre o título e o celular ao lado.

> "Esse é o site do EduSync. O EduSync é um aplicativo que corrige prova de
> papel pela câmera do celular. O professor fotografa a folha de respostas,
> o sistema lê o que o aluno escreveu, compara com o gabarito e devolve a
> nota. Quem fecha a nota continua sendo o professor."

Essa última frase é a mais importante da apresentação inteira. Fale ela
devagar. É o que separa o projeto de "a inteligência artificial dá a nota".

---

## 2. Quem somos · 20 segundos

> "Somos cinco alunos de Desenvolvimento de Sistemas da Etec Ermelinda
> Giannini Teixeira. O EduSync é o nosso TCC, feito ao longo de 2026."

Não se alongue aqui. A equipe aparece de novo no fim.

---

## 3. O problema · 40 segundos

Essa é a parte que convence. Use os números, eles são seus.

> "Um professor com cinco turmas de 35 alunos corrige 175 provas por
> avaliação. A três minutos por prova, são quase nove horas. E não é só o
> tempo: na centésima prova o critério já não é o mesmo da primeira, e
> quando a prova volta pro aluno duas semanas depois, ele já esqueceu por
> que errou."

Se algum professor da banca balançar a cabeça aqui, você ganhou a
apresentação. Dá uma pausa de dois segundos.

---

## 4. A solução · 30 segundos

Não leia os quatro cartões. Escolha dois.

> "A alternativa é conferida direto contra o gabarito. Na dissertativa e na
> de cálculo, a IA compara a resposta com as palavras-chave ou com o
> resultado que o professor cadastrou. E nada é fechado sozinho: o
> professor revisa questão por questão antes de concluir."

---

## 5. Como usar · 1 minuto

Aqui você desce pela linha do tempo, apontando cada número.

1. **Crie a turma** — "cadastra a turma e os alunos; a lista de chamada
   entra de uma vez, de um PDF, de uma planilha ou até de uma foto da lista
   impressa."
2. **Monte a atividade** — "escreve as questões e marca o gabarito; cada
   questão tem o seu peso."
3. **Imprima e aplique** — "o app gera a prova em PDF. E o gabarito não
   entra nesse arquivo, porque é a folha que vai pro aluno."
4. **Escaneie as folhas** — "recolheu as provas, fotografa uma por uma. É
   aqui que o OCR lê e a IA compara com o gabarito."
5. **Revise e conclua** — "a nota chega pronta, você muda o que discordar,
   comenta e fecha."

Repare no passo 3: **a prova continua em papel**. Fale isso em voz alta. É
a pergunta que mais aparece e você já responde antes de perguntarem.

---

## 6. Funcionalidades · 30 segundos

São seis cartões. Cite três e siga.

> "Scanner, importação da lista de chamada, prova em PDF, painel de
> correções. E funciona nos dois lugares: tem o aplicativo Android e a
> versão web, que dá pra instalar na tela inicial do iPhone e abre como
> aplicativo."

---

## 7. Tecnologias · 20 segundos

> "O aplicativo é React Native com Expo. O back-end é Node com TypeScript,
> Prisma e MySQL. A leitura usa OCR e a API do Gemini. Está hospedado na
> Railway, e a versão web na Expo."

Se perguntarem por que Gemini: tem camada gratuita que aguenta um TCC e lê
imagem direto, sem precisar de um serviço de OCR separado.

---

## 8. Equipe · 15 segundos

Diga nome e função de cada um. Se a pessoa estiver na sala, olhe pra ela.

---

## 9. Fecho · 20 segundos

Clique em **"Entrar no EduSync"**.

> "O sistema está no ar. Esse botão abre o login de verdade, e qualquer
> professor pode criar uma conta e testar com as provas dele."

Se a internet estiver boa, mostre uma correção pronta na segunda aba.
Se não estiver, **não insista**: mostre o print do celular e siga.

---

# Perguntas que a banca costuma fazer

## "E se a IA errar a nota?"

> "Ela erra, sim, e o sistema foi feito contando com isso. A nota não é
> publicada sozinha: ela chega como proposta, questão por questão, e o
> professor confirma ou muda antes de concluir. A correção só fecha quando
> ele fecha."

**Nunca responda "ela não erra".**

## "E a letra do aluno? Ela consegue ler?"

> "Letra de forma ela lê bem. Cursiva ruim atrapalha, e nesse caso a
> resposta aparece em branco ou errada na tela de revisão, onde o professor
> corrige na mão. O trabalho dele cai bastante mesmo quando algumas folhas
> dão problema."

## "Por que não usaram cartão-resposta de bolinhas, que é mais simples?"

> "Porque cartão de bolinha só serve pra questão objetiva. A gente queria
> dissertativa e cálculo também, que é onde o professor gasta mais tempo."

## "Os dados dos alunos estão seguros?"

Responda com honestidade, sem enfeitar:

> "O acesso é autenticado por token, e cada professor só enxerga as turmas
> dele. As imagens das folhas ficam no servidor e, hoje, quem tiver o
> endereço direto do arquivo consegue abrir. A gente mapeou isso e está nos
> trabalhos futuros: colocar autenticação também nos arquivos e mover pra
> um armazenamento com acesso assinado."

Saber apontar a própria falha pesa a favor. Não levante o assunto sozinho,
mas tenha a resposta pronta.

## "Quanto custa manter isso rodando?"

> "Hoje, nada. A Railway e a API do Gemini têm camada gratuita, que aguenta
> o uso de teste. Pra uma escola inteira precisaria de plano pago, e aí
> entra o custo por folha corrigida."

## "Funciona sem internet?"

> "Não. A leitura e a correção acontecem no servidor, então precisa de
> conexão. O cadastro de turma e de atividade também."

## "E se dois alunos tiverem o mesmo nome?"

> "A turma tem matrícula e número de chamada, e é por eles que a folha é
> ligada ao aluno. Na revisão, o professor ainda vê o nome e pode trocar se
> o sistema errar a pessoa."

## "Por que não fizeram um app nativo?"

> "React Native com Expo deixa a gente escrever uma vez e rodar no Android
> e no navegador. Pra uma equipe de cinco pessoas em um ano, foi o que
> cabia, e a versão web ainda resolve o iPhone sem precisar da App Store."

## "O que faltou?"

Tenha três coisas na ponta da língua. Sugestão:

> "Autenticação nos arquivos de imagem, relatório por questão pra turma
> inteira, e leitura de prova com várias folhas de uma vez só no mesmo
> envio."

---

# Três armadilhas

1. **Não diga "a IA corrige sozinha".** Diga que ela propõe e o professor
   confirma. Quem avalia vai cutucar exatamente aí.
2. **Não prometa porcentagem de acerto** que você não mediu. Se perguntarem,
   diga quantas folhas vocês testaram e o que deu errado.
3. **Não dependa da internet.** Se o demo travar, você perde o tempo e o
   fio. Print salvo resolve.

---

# Se sobrar tempo

Mostre o PDF da prova gerado pelo app e diga:

> "Repare que o gabarito não está aqui. É de propósito: essa é a folha que
> vai pra mão do aluno."

É um detalhe pequeno que mostra que vocês pensaram no uso real, e não só no
que é bonito de demonstrar.
