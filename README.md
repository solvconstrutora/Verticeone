# VÉRTICE ONE

Plataforma de operação de serviços rápidos e manutenção predial.

> **Estado:** retomada técnica — código anterior v0.6 não disponível. Este repositório começa como nova base versionada, não como cópia comprovada da v0.6.

## Produtos
- **Vértice Control:** operação, CRM, engenharia, propostas, profissionais, ordens de serviço e financeiro.
- **Vértice Partners:** credenciamento e trabalho dos prestadores.
- **Vértice Client:** solicitações, propostas, aceite e garantia.
- **Vértice Intelligence:** triagem e orquestração controlada por regras e grafos.

## Arquitetura alvo
- TypeScript em monorepositório
- PostgreSQL/Supabase, políticas RLS e auditoria
- Cloudflare para front-end, APIs e fluxos operacionais
- Integrações externas somente após homologação e autorização
- SINAPI versionado por UF e competência, sem preços inventados

## Princípios
1. Separado de SOLV-E e SOLV 360.
2. Dados pessoais, tokens e segredos nunca entram no código-fonte.
3. Revisão humana em decisões críticas.
4. Sem pagamentos, mensagens reais ou publicação de produção sem testes e aprovação.
5. BDI comercial inicial de 60% sobre custo direto validado é hipótese de precificação, não lucro.

## Organização
Veja [docs/ARQUITETURA.md](docs/ARQUITETURA.md) e [docs/PLANO-RETOMADA.md](docs/PLANO-RETOMADA.md).

## Próxima implementação
Implementar o domínio de demandas, máquina de estados, testes unitários e persistência de homologação. Nenhum teste anterior deve ser considerado reexecutado até haver evidência nova.
