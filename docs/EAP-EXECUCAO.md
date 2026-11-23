# Execução orientada à EAP — VÉRTICE ONE

Fonte: planilha **Vertice_One_EAP_Controle_Projeto.xlsx** (60 pacotes). Esta página é um registro de engenharia, **não substitui a EAP original**.

## Regras permanentes
1. Para cada alteração: identificar código EAP → dependência → implementação → testes → evidências → aceite.
2. Não declarar 100% concluído sem evidência, revisão e critério de aceite satisfeito.
3. Fluxos coordenados por grafos com estados, gates, checkpoints e autorização humana para decisões de risco.
4. Regras financeiras/contratuais são determinísticas e auditáveis; IA só auxilia onde permitido.
5. Teste local e integração real são evidências diferentes; CI deve comprovar execução.
6. Trabalho em homologação antes de produção. Nenhum segredo deve ser versionado.

## Primeira sequência
| EAP | Pacote | Situação atual | Critério ainda pendente |
| --- | --- | --- | --- |
| 2.0 | Repositório independente, branches e CI | Parcial | Verificar execução do CI e política de revisão |
| 2.5 | Eventos e máquinas de estado | Parcial | Persistência, trilha transacional e testes de concorrência |
| 3.1 | Cliente, contato e unidade | Não iniciado | Banco e histórico |
| 3.2 | Inbox omnichannel | Não iniciado | Mensagem simulada gerando protocolo |
| 3.3 | WhatsApp Cloud API | Não iniciado | Webhook autenticado e idempotente |
| 4.1 | Triagem multimodal | Não iniciado | Falhas e riscos registrados, revisão técnica |
| 12.0 | Homologação | Não iniciado | Evidências ponta a ponta |

## Primeiro grafo de processo
`intake → identify_customer → triage → technical_scope → quantify → sinapi_lookup → pricing → credit → proposal → await_customer_acceptance → partner_match → dispatch → contract → plan_resources → release_os → execute → customer_review → billing → reconciliation → payout → retention`

O arquivo `graphs/demand-graph.mjs` é um **protótipo determinístico de orquestração**, ainda não o runtime oficial LangGraph. Gates sem autorização e evidência interrompem o avanço. A API futura deve conferir identidade e gravar cada transição atomicamente.

## Próximo pacote de implementação
Criar schema PostgreSQL/Supabase para cliente, unidade, demanda, evento e histórico, com RLS; posteriormente conectar o grafo a checkpoint durável. O fluxo simulado só vira operação real após testes de integração.
