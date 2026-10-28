#JOBS — Auditoria para integração do Google Maps

Atue como engenheiro de software sênior, com foco em segurança, privacidade e preservação do projeto existente.

Objetivo futuro: integrar o Google Maps ao JOBS para permitir descoberta de pessoas por proximidade e cálculo de distância aproximada entre usuários.

Nesta etapa, somente inspecione e planeje. Não altere arquivos.

Examine o código disponível e identifique:

1. A arquitetura atual, incluindo React/Vite e eventual Capacitor para Android.
2. O módulo existente de descoberta, busca e filtros de usuários.
3. Como os perfis são armazenados e consultados.
4. Se já existe alguma funcionalidade de localização ou cálculo de distância.
5. Como o projeto gerencia configurações, variáveis de ambiente e chaves de API.
6. Se há infraestrutura adequada para consultar usuários por região sem expor coordenadas privadas.

Proponha uma implementação incremental que:

- Integre o mapa à descoberta de pessoas, sem recriar o aplicativo.
- Permita configurar um raio de busca.
- Calcule distâncias aproximadas sem expor endereços ou coordenadas exatas de outros usuários.
- Solicite consentimento antes de obter ou armazenar a localização.
- Permita desativar a descoberta por proximidade e utilizar cidade/região como alternativa.
- Respeite os filtros e as regras de privacidade já existentes.
- Considere a futura versão Android.

Segurança:

- Não inclua chaves de API diretamente no código.
- Recomende restrições de chave, controle de custos e limites de uso.
- Não habilite localização em segundo plano.
- Não altere autenticação, dados financeiros, ledgerService ou regras 70/30.
- Não instale dependências nem modifique arquivos.
- Não declare a integração implementada ou testada.

Apresente os arquivos relevantes, os riscos, as APIs do Google Maps necessárias e o menor plano de implementação. Aguarde autorização antes de alterar qualquer arquivo.



#JOBS — Conectando pessoas, criando oportunidades

Nascemos no Brasil e nossa visão é global.
O JOBS é uma plataforma digital em desenvolvimento que reúne relacionamentos, descoberta de perfis, interação social, compartilhamento de conteúdo e experiências ao vivo em um único ecossistema.

Nosso objetivo é construir uma experiência moderna, intuitiva e segura, oferecendo ferramentas para que usuários e criadores possam interagir, compartilhar conteúdos, descobrir oportunidades e explorar possibilidades de monetização.

*Funcionalidades e módulos

- Perfis e descoberta: apresentação de perfis, preferências e mecanismos de descoberta de pessoas e comunidades.
- Fotos e vídeos: publicação e organização de conteúdos no perfil.
- Cofre VIP: espaço exclusivo para conteúdos premium, conforme as funcionalidades disponíveis no projeto.
- Desbloqueio individual: acesso a conteúdos mediante confirmação do preço e cobrança em créditos JOBS, conforme as regras implementadas.
- Lives e interação: experiências ao vivo, engajamento entre participantes e recursos de gamificação.
- Carteira virtual: gerenciamento de créditos, histórico de movimentações e diferenciação entre créditos virtuais e valores financeiros.
- Creator Studio: ferramentas para gestão de conteúdo, análise de desempenho e acompanhamento de criadores.
- Painel administrativo: visão operacional, monitoramento, auditoria e controle conforme os módulos implementados.

*Transparência e segurança

O desenvolvimento do JOBS prioriza:

- Proteção de dados pessoais e controle de acesso.
- Clareza nos preços e confirmação antes de cobranças.
- Rastreabilidade das movimentações financeiras.
- Prevenção de cobranças duplicadas.
- Separação entre simulação, testes e operações reais.
- Evolução incremental, preservando a arquitetura existente.
- Testes e evidências antes de declarar funcionalidades prontas.

*Arquitetura e desenvolvimento

O projeto está sendo desenvolvido com foco em arquitetura modular, manutenção contínua, integração segura de serviços e preparação para evolução multiplataforma.

As tecnologias, integrações e recursos efetivamente disponíveis devem ser confirmados pela estrutura atual do repositório.

*Status do projeto

Em desenvolvimento.

A publicação de uma versão não significa, por si só, que todas as funcionalidades estejam concluídas ou prontas para produção. Cada módulo deve ser validado por meio de inspeção do código, testes e verificações de segurança.

*Visão de futuro

Construir um ecossistema digital que conecte pessoas, incentive a criação de conteúdo e amplie oportunidades de interação, com transparência, responsabilidade e capacidade de expansão internacional.

#JOBS — Conexões, conteúdo e oportunidades em um só lugar.


1) Versão curta para apresentação

JOBS é uma plataforma digital em desenvolvimento que conecta pessoas, conteúdos e oportunidades em um único ecossistema. A proposta combina redes sociais, descoberta de perfis, compartilhamento de fotos e vídeos, experiências ao vivo, monetização de criadores e gestão de interações em um ambiente moderno, intuitivo e seguro.

A plataforma foi pensada para facilitar conexões entre usuários, ampliar a visibilidade de criadores e oferecer experiências de engajamento, conteúdo premium e transações digitais com maior transparência e controle.

2) Versão para README do GitHub

# JOBS

JOBS — Conectando pessoas, criando oportunidades

Nascemos no Brasil e nossa visão é global. O JOBS é uma plataforma digital em desenvolvimento que reúne relacionamentos, descoberta de perfis, interação social, compartilhamento de conteúdo e experiências ao vivo em um único ecossistema.

Nosso objetivo é construir uma experiência moderna, intuitiva e segura, oferecendo ferramentas para que usuários e criadores possam interagir, compartilhar conteúdos, descobrir oportunidades e explorar possibilidades de monetização.

## Funcionalidades e módulos

- Perfis e descoberta
- Fotos e vídeos
- Cofre VIP
- Desbloqueio individual
- Lives e interação
- Carteira virtual
- Creator Studio
- Painel administrativo

## Transparência e segurança

O JOBS prioriza proteção de dados, clareza nas cobranças, rastreabilidade financeira, prevenção de duplicidade e separação entre testes e produção.

## Arquitetura e desenvolvimento

O projeto está sendo desenvolvido com foco em arquitetura modular, integração segura e evolução contínua.

## Status

Em desenvolvimento.

## Visão de futuro

Construir um ecossistema digital que conecte pessoas, incentive a criação de conteúdo e amplie oportunidades de interação com responsabilidade, transparência e potencial de expansão internacional.

3) Versão para pitch deck

JOBS é uma plataforma digital brasileira em desenvolvimento que reúne relacionamentos, descoberta de perfis, interação social, conteúdo e experiências ao vivo em um único ecossistema.

A ideia do projeto é criar um ambiente moderno e seguro para conectar pessoas, fortalecer comunidades e oferecer novas oportunidades para criadores, usuários e marcas. A plataforma combina perfis, conteúdo visual, interação em tempo real, monetização e ferramentas de gestão para produção e desempenho.

Com foco em experiência, segurança e escalabilidade, o JOBS foi pensado para evoluir de forma modular e sustentável, preservando a arquitetura atual e preparando a plataforma para expansão internacional.

Nossa proposta:
- conectar pessoas e criadores
- centralizar conteúdo e experiência digital
- facilitar monetização e engajamento
- oferecer controle, transparência e segurança

O JOBS nasce no Brasil com visão global e está em construção para se tornar um ecossistema de conexões, conteúdo e oportunidades.

4) Versão para documento de produto

Nome do produto: JOBS

Visão
Criar uma plataforma digital que conecte pessoas, conteúdos e oportunidades em um único ecossistema, com foco em experiência, segurança, transparência e crescimento escalável.

Objetivo
Oferecer uma experiência moderna e intuitiva para que usuários e criadores possam interagir, publicar conteúdo, explorar perfis, participar de eventos ao vivo e gerar valor por meio de monetização e engajamento.

Principais módulos
- Perfis e descoberta
- Conteúdo multimídia
- Cofre VIP
- Desbloqueio de conteúdos
- Lives e interações em tempo real
- Carteira virtual
- Creator Studio
- Painel administrativo

Requisitos de produto
- Segurança de dados e controle de acesso
- clareza na cobrança e confirmação antes de transações
- rastreabilidade das movimentações
- prevenção de erros e cobranças duplicadas
- separação entre ambientes de simulação, testes e produção
- arquitetura evolutiva e modular

Status
Em desenvolvimento.

Observação
A disponibilidade de uma funcionalidade em versão pública não garante que ela esteja totalmente concluída. Cada módulo deve ser validado por testes, inspeção do código e verificações de segurança.

5) Versão para arquitetura técnica

O JOBS é um projeto em desenvolvimento com foco em arquitetura modular, evolução incremental e integração segura de serviços. A estrutura foi pensada para facilitar manutenção, expansão e adaptação a novos módulos sem comprometer a base existente.

Principais princípios
- modularidade
- separação de responsabilidades
- integração segura de APIs e serviços
- isolamento entre ambiente de teste e produção
- rastreabilidade de movimentações e processos financeiros
- evolução contínua com compatibilidade

Estruturas esperadas
- frontend para experiência de usuário
- backend para regras de negócio e autenticação
- serviços de conteúdo e mídias
- módulos de carteira e pagamentos virtuais
- gestão de usuários, perfis e permissões
- painel administrativo e auditoria
- suporte a eventos ao vivo e interações em tempo real

Objetivo técnico
Garantir uma base escalável, segura e fácil de manter, com suporte a novos recursos e expansão do ecossistema sem ruptura de arquitetura.

A implementação real deve refletir a estrutura atual do repositório e confirmar quais módulos e integrações já foram efetivamente desenvolvidos.

6) Versão em inglês para investidores ou clientes internacionais

JOBS is a digital platform under development that connects people, content, and opportunities in a single ecosystem. It brings together profile discovery, social interaction, media sharing, live experiences, creator tools, and digital monetization in a modern and secure environment.

The platform is designed to offer a smooth and intuitive experience for users and creators, enabling engagement, content publishing, community building, and participation in live events. It also supports premium content access, virtual wallet management, and business operations through an administrative dashboard.

Our approach prioritizes:
- data protection and access control
- transparency in pricing and user confirmation before charges
- traceability of financial movements
- prevention of duplicate charges
- clear separation between sandbox, testing, and production environments
- incremental evolution without compromising the existing architecture
- validation through tests and evidence before feature completion

JOBS was born in Brazil with a global vision. It is being built as a scalable digital ecosystem focused on connections, content, and opportunities.


