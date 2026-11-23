# Arquitetura prevista — VÉRTICE ONE

## Fluxo central
Recebimento → triagem → escopo técnico → orçamento → proposta → aceite → despacho → contrato → OS → evidências → aceite do cliente → faturamento → conciliação → repasse.

## Componentes
- `apps/control`: gestão interna
- `apps/partner`: profissionais credenciados
- `apps/client`: clientes
- `apps/api`: API autenticada
- `packages/domain`: estados e regras do negócio
- `packages/pricing`: cálculo e validação de orçamento
- `packages/sinapi`: catálogos oficiais versionados
- `graphs`: orquestração com pontos de aprovação
- `database/migrations`: migrações
- `tests`: testes unitários, integração, segurança e ponta a ponta

## Segurança
Isolamento por perfil, RLS, anexos privados, auditoria, idempotência nos eventos financeiros. Nunca registrar dados bancários sensíveis em logs. Webhooks deverão validar autenticidade e repetição.

## Restrições
Preço SINAPI sem fonte válida deve ser bloqueado; decisões críticas exigem revisão. Evitar diagnósticos definitivos de risco alto baseados apenas em imagem.
