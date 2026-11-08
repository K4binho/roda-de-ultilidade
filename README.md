# Roda de ultilidade

Menu circular de atalhos para Windows x64. Abra programas, pastas, sites e jogos Steam com o teclado ou o botão do meio do mouse. Personalize categorias, tamanho da roda e inicialização com o Windows nas configurações da bandeja.

## Baixar

[Release para Windows](https://github.com/K4binho/roda-de-ultilidade/releases/latest). Escolha **Instalador** para instalar ou **Portátil** para executar diretamente. Os executáveis são distribuídos sem assinatura digital.

## Usar

O atalho inicial é Ctrl+Alt+Space. Passe o mouse sobre uma categoria para ver seus itens, clique para abrir e use Esc para fechar. Em Configurações, use Mudar atalho para escolher outra combinação ou pressionar a rodinha. A aba Steam procura jogos nas bibliotecas locais.

## Desenvolver e gerar os executáveis

No Windows com Node.js, npm e o compilador C# do .NET Framework instalados, execute:

```powershell
npm ci
npm start
npm test
npm run dist
```

O último comando gera o instalador e o portátil em `dist/current`. Essa pasta é reutilizada a cada versão para manter estável o destino de inicialização do Windows. Com a inicialização ativada, o Windows abre o executável dessa pasta; ao instalar uma versão mais nova, o atalho é atualizado para o executável atual. Os atalhos pessoais são gravados no perfil local do Windows. O projeto mantém o identificador interno das versões anteriores para compatibilidade.

A biblioteca Steam é lida uma vez quando o app inicia. Trocar de aba usa o resultado em memória; **Atualizar** faz uma nova leitura manual.

Licença MIT.
