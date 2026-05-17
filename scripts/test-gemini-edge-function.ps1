# Script de Teste - Edge Function Gemini API
# Este script testa se a Edge Function está funcionando corretamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Teste da Edge Function - Gemini API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configurações: lê .env.local/.env para evitar credenciais hardcoded.
function Import-EnvFile {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            return
        }

        $parts = $line.Split("=", 2)
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")

        if ($name -and -not [Environment]::GetEnvironmentVariable($name, "Process")) {
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

Import-EnvFile ".env.local"
Import-EnvFile ".env"

$SUPABASE_URL = [Environment]::GetEnvironmentVariable("VITE_SUPABASE_URL", "Process")
$ANON_KEY = [Environment]::GetEnvironmentVariable("VITE_SUPABASE_ANON_KEY", "Process")

if (-not $SUPABASE_URL -or -not $ANON_KEY) {
    throw "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local ou .env."
}

# Função para fazer requisição
function Test-EdgeFunction {
    param (
        [string]$TestName,
        [hashtable]$Body
    )

    Write-Host "Testando: $TestName" -ForegroundColor Yellow
    Write-Host "Payload: $($Body | ConvertTo-Json -Compress)" -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod `
            -Uri "$SUPABASE_URL/functions/v1/gemini-api" `
            -Method Post `
            -Headers @{
                "Authorization" = "Bearer $ANON_KEY"
                "Content-Type" = "application/json"
            } `
            -Body ($Body | ConvertTo-Json -Depth 10) `
            -ErrorAction Stop

        if ($response.success) {
            Write-Host "✅ SUCESSO!" -ForegroundColor Green
            Write-Host "Resposta: $($response.data.text.Substring(0, [Math]::Min(100, $response.data.text.Length)))..." -ForegroundColor White
            if ($response.data.usage) {
                Write-Host "Tokens usados: $($response.data.usage.totalTokens)" -ForegroundColor Cyan
            }
            return $true
        } else {
            Write-Host "❌ ERRO: $($response.error)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ ERRO NA REQUISIÇÃO:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
    finally {
        Write-Host ""
    }
}

# Teste 1: Generate Content
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTE 1: Generate Content" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$test1 = Test-EdgeFunction -TestName "Geração de Conteúdo Simples" -Body @{
    action = "generateContent"
    params = @{
        prompt = "Diga 'Olá, mundo!' em português de forma criativa"
        model = "gemini-2.0-flash-exp"
        temperature = 0.7
        maxTokens = 100
    }
}

# Teste 2: Chat
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTE 2: Chat com Contexto" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$test2 = Test-EdgeFunction -TestName "Chat com Múltiplas Mensagens" -Body @{
    action = "chat"
    params = @{
        messages = @(
            @{ role = "user"; content = "Olá!" },
            @{ role = "assistant"; content = "Olá! Como posso ajudar?" },
            @{ role = "user"; content = "Me diga um fato interessante sobre TypeScript" }
        )
        model = "gemini-2.0-flash-exp"
        temperature = 0.7
    }
}

# Teste 3: Embed Content
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTE 3: Embeddings" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$test3 = Test-EdgeFunction -TestName "Geração de Embeddings" -Body @{
    action = "embedContent"
    params = @{
        text = "Este é um texto de teste para gerar embeddings"
        model = "text-embedding-004"
    }
}

# Resumo dos Testes
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$totalTests = 3
$passedTests = 0

if ($test1) { $passedTests++ }
if ($test2) { $passedTests++ }
if ($test3) { $passedTests++ }

Write-Host "Total de testes: $totalTests" -ForegroundColor White
Write-Host "Testes aprovados: $passedTests" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })
Write-Host "Testes falhados: $($totalTests - $passedTests)" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Red" })
Write-Host ""

if ($passedTests -eq $totalTests) {
    Write-Host "🎉 TODOS OS TESTES PASSARAM!" -ForegroundColor Green
    Write-Host "A Edge Function está funcionando perfeitamente!" -ForegroundColor Green
} else {
    Write-Host "⚠️ ALGUNS TESTES FALHARAM" -ForegroundColor Yellow
    Write-Host "Verifique os logs acima para mais detalhes" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "1. Edge Function não foi deployada ainda" -ForegroundColor White
    Write-Host "2. Secret GEMINI_API_KEY não foi configurado" -ForegroundColor White
    Write-Host "3. Chave de API do Gemini inválida ou expirada" -ForegroundColor White
    Write-Host ""
    Write-Host "Comandos úteis:" -ForegroundColor Cyan
    Write-Host "supabase functions list" -ForegroundColor White
    Write-Host "supabase secrets list" -ForegroundColor White
    Write-Host "supabase functions logs gemini-api" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
