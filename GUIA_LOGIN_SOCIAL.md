# Guia de Configuração - Login com Google & Apple

Para que os botões de login social funcionem, você precisa ativar os provedores no painel do Supabase. Aqui está o passo a passo:

## 1. Google Auth

1.  Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2.  Crie um novo projeto.
3.  Vá em **APIs e Serviços > Tela de permissão OAuth**.
    *   Selecione **Externo**.
    *   Preencha o nome do App (PrecificaPro) e email de suporte.
4.  Vá em **Credenciais > Criar Credenciais > ID do cliente OAuth**.
    *   Tipo de aplicativo: **Aplicação da Web**.
    *   **Origens JavaScript autorizadas:** Adicione a URL do seu site (e `http://localhost:5173` para teste).
    *   **URIs de redirecionamento autorizados:** Adicione a URL de callback do Supabase:
        *   Copie do Supabase em: *Authentication > Providers > Google > Callback URL* (Geralmente é `https://<seu-projeto>.supabase.co/auth/v1/callback`).
5.  Copie o **ID do Cliente** e a **Chave Secreta**.
6.  No Painel do Supabase ([supabase.com](https://supabase.com)):
    *   Vá em **Authentication > Providers > Google**.
    *   Ative o provedor.
    *   Cole o **Client ID** e **Client Secret**.
    *   Salve.

---

## 2. Apple Login (iCloud)

*Nota: Requer uma conta de desenvolvedor Apple paga ($99/ano).*

1.  Acesse o [Apple Developer Portal](https://developer.apple.com/account/).
2.  Vá em **Certificates, Identifiers & Profiles**.
3.  **Identifiers:** Crie um App ID e um Service ID (para web).
4.  **Keys:** Crie uma chave privada para "Sign in with Apple".
5.  No Painel do Supabase:
    *   Vá em **Authentication > Providers > Apple**.
    *   Ative o provedor.
    *   Preencha o **Service ID**, **Team ID**, **Key ID** e insira o conteúdo do arquivo da chave privada (`.p8`).
    *   Salve.

## Pronto!
Assim que configurado no Supabase, os botões que criei na tela de login funcionarão automaticamente.
