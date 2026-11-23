# Engenharia de grafos e referência Handoff — VÉRTICE ONE
Data: 2026-11-23. Referência, não conexão ativa.

## Documentação consultada
- https://www.handoff.ai/api-access
- https://help.handoff.ai/en/articles/9778505-how-the-handoff-api-works

Handoff oferece gestão de projetos, orçamentos, propostas, faturas e contatos por API REST. Orçamentos IA podem confirmar imediatamente e retornar por callbackUrl após processamento. A Core API depende do plano Scale e chave própria. Não há chave Handoff neste repositório.

## Arquitetura própria
- Grafo operacional existente: `graphs/demand-graph.mjs`
- Grafo de tarefa assíncrona: `graphs/estimate-job.mjs`
- Testes automatizados do processamento: `tests/estimate-job.test.mjs`
- Persistência/eventos/idempotência reais: **a implementar** em Supabase e API protegida
- Integração com runtime oficial LangGraph e filas duráveis: **a implementar**

## Fluxo de orçamento
Mensagem/arquivo -> triagem -> escopo técnico -> trabalho enfileirado -> processamento -> callback autenticado -> comparação de versão -> validação SINAPI/BDI -> revisão humana -> proposta.

## Regras de segurança
Somente operação autorizada pode mudar estados. Callback não pode sobrescrever estimativa produzida para versão anterior do escopo. Um webhook duplicado deve ser descartado no banco pela chave/eventId, em transação; o validador em memória não substitui isso. Documento e preço sem referência válida não podem ser publicados. Handoff usa centavos inteiros de USD; a Vértice usará centavos inteiros de BRL, com moeda explícita, sem conversão implícita.

## EAP relacionada
2.5 máquinas de estados (parcial), 4.1 triagem (pendente), 4.3 SINAPI (pendente), 4.5 cálculo e BDI (pendente), 4.7 proposta (pendente), 12.x homologação (pendente).

## Aceite
Testes aprovados para transições e rejeição de callbacks inadequados; integrar webhooks reais e checkpoint transacional somente depois de revisar segurança e dependências.
