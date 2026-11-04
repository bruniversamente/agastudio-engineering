# Integridade do arquivo .aga

## Situação

Um arquivo de projeto precisa conservar identidade, versão, dados e anexos ao ser reaberto.

## Escolha no produto

O produto empacota um manifesto e o registro SHA-256 dos arquivos; o leitor verifica o conjunto e as versões aceitas antes de restaurar o conteúdo.

## Consequências

Os hashes detectam divergência do conteúdo em relação ao registro. Eles não são assinatura digital nem prova de autoria ou validade técnica.

## Evidência desta edição

Os testes públicos exercitam o round-trip, anexos ausentes, conteúdo alterado e versão desconhecida. A fixture do contêiner tem estrutura reduzida.
