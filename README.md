JOBS — Conectando pessoas, criando oportunidades

Nascemos no Brasil. Nossa visão é global!

«JOBS é uma plataforma digital em desenvolvimento que busca conectar pessoas, conteúdos e oportunidades em um único ecossistema, combinando descoberta de perfis, interação social, compartilhamento de conteúdo, experiências ao vivo e ferramentas para criadores.»

1. Nossa missão

Construir uma experiência digital moderna, intuitiva e segura que facilite conexões entre pessoas, fortaleça comunidades e amplie oportunidades para usuários e criadores de conteúdo.

O JOBS pretende reunir recursos de relacionamento, descoberta de perfis, publicação de fotos e vídeos, interação em tempo real e monetização digital em uma plataforma integrada, com foco em transparência, privacidade e evolução sustentável.

2. Nossa origem e visão de futuro

O JOBS nasce no Brasil com uma visão global.

Nossa direção é desenvolver um ecossistema capaz de evoluir de forma modular, adaptar-se a diferentes mercados e ampliar suas possibilidades de conexão, conteúdo e oportunidades.

A expansão internacional é um objetivo estratégico futuro, que deverá considerar localização de idiomas, moedas, formatos de data, fusos horários, privacidade, moderação, pagamentos e requisitos legais de cada mercado.

3. Principais funcionalidades e módulos

Os módulos abaixo representam o escopo do produto. A disponibilidade e o estágio de implementação de cada recurso devem ser confirmados no código e por meio de testes.

Perfis e descoberta

Apresentação de perfis, preferências, busca e mecanismos para descobrir pessoas e comunidades, respeitando os controles de privacidade disponíveis.

Fotos e vídeos

Recursos para publicação e organização de conteúdo multimídia nos perfis, conforme as funcionalidades implementadas.

Cofre VIP

Área destinada a conteúdos premium, com acesso condicionado às regras e aos recursos efetivamente disponíveis no projeto.

Desbloqueio individual de conteúdo

Possibilidade de oferecer acesso individual a conteúdos mediante apresentação clara do preço, confirmação do usuário e aplicação das regras de cobrança implementadas.

Lives e interação

Experiências ao vivo, interação entre participantes, engajamento e recursos de gamificação, de acordo com o estágio de desenvolvimento de cada módulo.

Carteira virtual

Gestão de créditos virtuais, histórico de movimentações e apresentação clara dos valores. Créditos virtuais, receitas de criadores e saldos financeiros devem permanecer conceitualmente separados e sujeitos às regras de negócio aplicáveis.

Creator Studio

Área voltada à gestão de conteúdo, acompanhamento de desempenho e ferramentas para criadores.

Painel administrativo

Visão operacional da plataforma, com indicadores, monitoramento, auditoria e controles compatíveis com os módulos existentes.

Descoberta por proximidade — planejamento futuro

Avaliação de uma possível integração com o Google Maps para permitir buscas por região e estimativas de distância entre usuários, mediante consentimento e controles de privacidade. A integração depende de auditoria técnica e autorização específica para implementação.

4. Transparência, segurança e privacidade

A evolução do JOBS deve priorizar:

- Proteção de dados pessoais e controle de acesso.
- Consentimento e transparência na coleta e no uso de informações.
- Clareza nos preços e confirmação antes de cobranças.
- Rastreabilidade das movimentações financeiras.
- Prevenção de transações duplicadas e inconsistências de saldo.
- Separação entre simulação, testes e operações reais.
- Proteção de credenciais e chaves de API.
- Auditoria de ações administrativas e eventos relevantes.
- Testes e evidências antes de declarar funcionalidades concluídas.
- Preservação da arquitetura e dos dados existentes durante as alterações.

Recursos financeiros e integrações externas devem ser validados antes de qualquer uso em produção. A existência de uma interface visual ou de uma simulação não comprova, por si só, a operação real do recurso.

5. Arquitetura e desenvolvimento

O projeto está em desenvolvimento com foco em modularidade, manutenção contínua, integração segura de serviços e evolução incremental.

A estrutura e as tecnologias efetivamente utilizadas devem ser confirmadas pela inspeção do repositório. Entre os aspectos a verificar estão:

- Aplicação frontend e estrutura de componentes.
- Serviços e regras de negócio.
- Autenticação, armazenamento e permissões.
- Gestão de perfis e conteúdos.
- Carteira, transações e auditoria.
- Integrações externas e gerenciamento de configurações.
- Compatibilidade com dispositivos móveis e eventual aplicação Android via Capacitor.
- Estratégias de testes, validação e implantação.

Princípio de desenvolvimento: preservar o projeto existente, evitar reescritas desnecessárias, realizar mudanças incrementais e comprovar os resultados com evidências.

A documentação deve distinguir entre funcionalidades planejadas, em desenvolvimento, implementadas e efetivamente testadas.

6. Auditoria técnica — integração futura com Google Maps

Objetivo

Avaliar a viabilidade de integrar o Google Maps ao módulo de descoberta do JOBS, permitindo buscas por proximidade e cálculo de distâncias aproximadas sem expor a localização exata de outros usuários.

Escopo desta etapa

Somente inspecionar e planejar. Não alterar arquivos, instalar dependências ou ativar serviços.

A auditoria deverá identificar:

1. A arquitetura atual, incluindo React, Vite e eventual integração com Capacitor para Android.
2. O módulo existente de descoberta, busca e filtros de usuários.
3. Como os perfis são armazenados, consultados e protegidos.
4. Se já existem recursos de localização ou cálculo de distância.
5. Como o projeto gerencia variáveis de ambiente, configurações e chaves de API.
6. Se existe infraestrutura adequada para consultas regionais sem expor coordenadas privadas.

Requisitos propostos

- Integrar a descoberta geográfica ao módulo existente, sem recriar o aplicativo.
- Permitir configurar um raio de busca.
- Apresentar distâncias aproximadas, sem revelar endereços ou coordenadas exatas de terceiros.
- Solicitar consentimento antes de obter ou armazenar a localização.
- Permitir desativar a descoberta por proximidade.
- Oferecer cidade ou região como alternativa.
- Respeitar os filtros de descoberta e as regras de privacidade existentes.
- Considerar a compatibilidade futura com Android.
- Não habilitar localização em segundo plano.

APIs a avaliar

A auditoria deverá determinar quais serviços são realmente necessários, considerando:

- Maps JavaScript API: possível exibição de mapas na interface web.
- Places API (New): possível busca de lugares, se necessária ao produto.
- Routes API: possível cálculo de rotas ou distâncias por trajeto, caso esse requisito seja confirmado.
- Geolocalização do navegador ou do dispositivo: obtenção da posição do próprio usuário mediante permissão, quando aplicável.

O uso de Geocoding API ou de outros serviços deverá ser justificado pela necessidade técnica identificada. Não se deve habilitar APIs apenas por precaução.

Segurança da integração

- Não inserir chaves de API diretamente no código-fonte.
- Avaliar restrições por aplicação, domínio e API.
- Configurar limites de uso, alertas de custos e monitoramento.
- Evitar armazenar coordenadas precisas sem necessidade justificada.
- Definir regras de retenção, acesso e exclusão dos dados de localização.
- Não alterar autenticação, dados financeiros, "ledgerService" ou regras de distribuição 70/30.
- Não realizar mudanças sem autorização explícita.

Entregáveis da auditoria

O relatório deverá apresentar os arquivos relevantes, a arquitetura identificada, os recursos já existentes, as lacunas, os riscos de privacidade e segurança, as APIs necessárias e o menor plano incremental de implementação.

A auditoria não deverá declarar a integração implementada ou testada. Qualquer alteração dependerá de autorização posterior.

7. Princípios técnicos e operacionais

O desenvolvimento do JOBS deverá seguir estes princípios:

- Modularidade e separação de responsabilidades.
- Preservação da base de código existente.
- Integração segura de APIs e serviços.
- Controle de acesso e proteção de dados.
- Isolamento entre ambientes de teste e produção.
- Rastreabilidade dos processos e das movimentações financeiras.
- Prevenção de duplicidade e inconsistências.
- Compatibilidade e manutenção contínua.
- Validação por inspeção do código, testes e evidências.
- Ausência de declarações de sucesso sem comprovação.

As decisões de arquitetura deverão refletir a estrutura real do repositório, sem apresentar estruturas planejadas como se já estivessem implementadas.

8. Status do projeto

Status geral: Em desenvolvimento.

O JOBS está em evolução. Cada módulo deverá ter seu estágio documentado com base em evidências verificáveis.

A publicação de uma versão não significa que todas as funcionalidades estejam concluídas, seguras ou prontas para produção. Compilação, testes automatizados, validação de segurança e funcionamento integrado devem ser verificados separadamente.

9. Proposta de valor

O JOBS busca reunir em um único ecossistema:

- Conexões entre pessoas e criadores.
- Descoberta de perfis e comunidades.
- Compartilhamento e acesso a conteúdo.
- Experiências ao vivo e engajamento.
- Ferramentas para criação e gestão de conteúdo.
- Recursos de monetização com transparência.
- Controles operacionais e mecanismos de auditoria.

A proposta é construir uma experiência integrada que evolua de maneira responsável, com atenção à segurança, à confiança dos usuários e à sustentabilidade do produto.

10. Apresentação para investidores e parceiros

O JOBS é uma plataforma digital brasileira em desenvolvimento que reúne descoberta de perfis, interação social, conteúdo multimídia, experiências ao vivo e ferramentas para criadores em um único ecossistema.

A proposta é criar um ambiente moderno e seguro para conectar pessoas, fortalecer comunidades e desenvolver novas oportunidades para usuários, criadores e parceiros.

Com foco em experiência, privacidade, transparência e arquitetura evolutiva, o JOBS está sendo desenvolvido para crescer de forma modular, preservando sua base técnica e preparando-se para futuras oportunidades de expansão internacional.

Nossa proposta:

- Conectar pessoas e criadores.
- Integrar conteúdo e experiências digitais.
- Ampliar possibilidades de engajamento e monetização.
- Promover transparência, segurança e controle.
- Evoluir com responsabilidade e potencial de escala.

O JOBS nasce no Brasil com visão global e busca se consolidar como um ecossistema de conexões, conteúdo e oportunidades.

11. International overview

JOBS is a Brazilian digital platform under development that aims to connect people, content, and opportunities in a single ecosystem.

The platform brings together profile discovery, social interaction, media sharing, live experiences, creator tools, and digital monetization concepts in a modern and secure environment.

Our development priorities include:

- Data protection and access control.
- Transparent pricing and user confirmation before charges.
- Traceability of financial transactions.
- Prevention of duplicate transactions.
- Separation between sandbox, testing, and production environments.
- Incremental development that preserves the existing architecture.
- Validation through code inspection, tests, and verifiable evidence.

JOBS was born in Brazil with a global vision. Its long-term ambition is to become a scalable digital ecosystem focused on connections, content, and opportunities, while adapting responsibly to the requirements of each market.

---

JOBS — Conexões, conteúdo e oportunidades em um só lugar.

Nascemos no Brasil. Nossa visão é global.