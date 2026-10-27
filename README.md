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
