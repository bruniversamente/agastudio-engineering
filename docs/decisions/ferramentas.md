# Ferramentas de arquivos do assistente

## Situação

Uma tarefa de IA pode solicitar leitura ou modificação de arquivos da pasta do projeto.

## Escolha no produto

O módulo de arquivos valida a raiz, o caminho relativo, nomes protegidos e as condições de confirmação. A política de arquivo tem uma função distinta da execução controlada.

## Consequências

A decisão precisa considerar a operação. O trecho de política isolado não substitui o conjunto de validações do executor ou do runtime.

## Evidência desta edição

Os testes executam leitura, recusa de saída da pasta, nome protegido e solicitação de confirmação sem alterar bytes existentes. Usam pastas fictícias temporárias e não chamam fornecedores de IA.
