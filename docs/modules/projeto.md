# Guardar a origem e reconhecer o que mudou

O arquivo .aga reúne um pacote versionado com manifesto, dados do projeto, anexos e registros SHA-256. Ao abrir, o leitor confere formato, versão e integridade antes de restaurar o conteúdo.

O modelo central conserva fontes, rodadas e entregas. Quando uma entrada técnica muda, a implementação mantém o histórico e marca os produtos dependentes para atualização. O conteúdo salvo e a cópia de recuperação também têm papéis distintos.

O exemplo interativo no portfólio usa `createAgaProject` e `openAgaProject`. O pacote íntegro abre; conteúdo divergente e versão desconhecida são recusados. A estrutura do exemplo é reduzida e não corresponde a um estudo técnico completo.

### Rodada preservada

- **Entrada:** O projeto registra fontes e condições usadas no cálculo.
- **Rodada:** O resultado conserva a identidade e a referência dos dados analisados.
- **Entrega:** O relatório ou a prova referencia a rodada correspondente.

A consulta relaciona a entrega à versão da análise que a originou.

### Dado técnico alterado

- **Mudança:** Uma entrada técnica deixa de corresponder à análise anterior.
- **Histórico:** A rodada concluída continua guardada como histórico.
- **Atualização:** As entregas dependentes recebem o estado desatualizado.

A implementação distingue a consulta do histórico da preparação de uma entrega atual. Diagrama explicativo do modelo; não recalcula o estudo.

### Recuperação de trabalho

- **Trabalho:** Uma cópia separada guarda alterações ainda não confirmadas no arquivo.
- **Retomada:** O operador escolhe recuperar essa versão de trabalho.
- **Salvar:** O arquivo existente só recebe as alterações mediante salvamento.

O teste selecionado restaurou a cópia de recuperação e conservou os bytes do arquivo salvo.

O pacote técnico testa a abertura, a recusa de conteúdo divergente e o salvamento com cópias de segurança. Os exemplos do contêiner usam uma estrutura reduzida; a validação integral de um estudo envolve também os contratos de domínio e o motor.
