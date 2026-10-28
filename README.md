JOBS — Auditoria para integração do Google Maps

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



JOBS — Conectando pessoas, criando oportunidades

Nascemos no Brasil e nossa visão é global. O JOBS é uma plataforma digital em desenvolvimento que reúne relacionamentos, descoberta de perfis, interação social, compartilhamento de conteúdo e experiências ao vivo em um único ecossistema.

Nosso objetivo é construir uma experiência moderna, intuitiva e segura, oferecendo ferramentas para que usuários e criadores possam interagir, compartilhar conteúdos, descobrir oportunidades e explorar possibilidades de monetização.

Funcionalidades e módulos

- Perfis e descoberta: apresentação de perfis, preferências e mecanismos de descoberta de pessoas e comunidades.
- Fotos e vídeos: publicação e organização de conteúdos no perfil.
- Cofre VIP: espaço exclusivo para conteúdos premium, conforme as funcionalidades disponíveis no projeto.
- Desbloqueio individual: acesso a conteúdos mediante confirmação do preço e cobrança em créditos JOBS, conforme as regras implementadas.
- Lives e interação: experiências ao vivo, engajamento entre participantes e recursos de gamificação.
- Carteira virtual: gerenciamento de créditos, histórico de movimentações e diferenciação entre créditos virtuais e valores financeiros.
- Creator Studio: ferramentas para gestão de conteúdo, análise de desempenho e acompanhamento de criadores.
- Painel administrativo: visão operacional, monitoramento, auditoria e controle conforme os módulos implementados.

Transparência e segurança

O desenvolvimento do JOBS prioriza:

- Proteção de dados pessoais e controle de acesso.
- Clareza nos preços e confirmação antes de cobranças.
- Rastreabilidade das movimentações financeiras.
- Prevenção de cobranças duplicadas.
- Separação entre simulação, testes e operações reais.
- Evolução incremental, preservando a arquitetura existente.
- Testes e evidências antes de declarar funcionalidades prontas.

Arquitetura e desenvolvimento

O projeto está sendo desenvolvido com foco em arquitetura modular, manutenção contínua, integração segura de serviços e preparação para evolução multiplataforma.

As tecnologias, integrações e recursos efetivamente disponíveis devem ser confirmados pela estrutura atual do repositório.

Status do projeto

Em desenvolvimento.

A publicação de uma versão não significa, por si só, que todas as funcionalidades estejam concluídas ou prontas para produção. Cada módulo deve ser validado por meio de inspeção do código, testes e verificações de segurança.

Visão de futuro

Construir um ecossistema digital que conecte pessoas, incentive a criação de conteúdo e amplie oportunidades de interação, com transparência, responsabilidade e capacidade de expansão internacional.

JOBS — Conexões, conteúdo e oportunidades em um só lugar.

