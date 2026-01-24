# Script de Deploy de Edge Functions
# Este script facilita o deploy e gerenciamento de Edge Functions no Supabase

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Deploy de Edge Functions - Supabase" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Supabase CLI está instalado
Write-Host "Verificando Supabase CLI..." -ForegroundColor Yellow
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instalando Supabase CLI..." -ForegroundColor Yellow
    npm install -g supabase
    Write-Host "✅ Supabase CLI instalado!" -ForegroundColor Green
} else {
    Write-Host "✅ Supabase CLI encontrado!" -ForegroundColor Green
}

Write-Host ""

# Menu de opções
Write-Host "Escolha uma opção:" -ForegroundColor Cyan
Write-Host "1. Login no Supabase" -ForegroundColor White
Write-Host "2. Linkar ao projeto" -ForegroundColor White
Write-Host "3. Configurar secrets" -ForegroundColor White
Write-Host "4. Deploy de função específica" -ForegroundColor White
Write-Host "5. Deploy de todas as funções" -ForegroundColor White
Write-Host "6. Listar funções deployadas" -ForegroundColor White
Write-Host "7. Ver logs de uma função" -ForegroundColor White
Write-Host "8. Testar função localmente" -ForegroundColor White
Write-Host "9. Sair" -ForegroundColor White
Write-Host ""

$opcao = Read-Host "Digite o número da opção"

switch ($opcao) {
    "1" {
        Write-Host ""
        Write-Host "Fazendo login no Supabase..." -ForegroundColor Yellow
        supabase login
    }
    
    "2" {
        Write-Host ""
        $projectRef = Read-Host "Digite o Project Reference ID (encontrado no dashboard do Supabase)"
        Write-Host "Linkando ao projeto..." -ForegroundColor Yellow
        supabase link --project-ref $projectRef
    }
    
    "3" {
        Write-Host ""
        Write-Host "Configurando secrets..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Exemplo de secrets que você pode precisar:" -ForegroundColor Cyan
        Write-Host "- EXTERNAL_API_KEY: Chave de API externa" -ForegroundColor White
        Write-Host "- OPENAI_API_KEY: Chave da OpenAI" -ForegroundColor White
        Write-Host "- STRIPE_SECRET_KEY: Chave secreta do Stripe" -ForegroundColor White
        Write-Host ""
        
        $secretName = Read-Host "Nome do secret (ex: EXTERNAL_API_KEY)"
        $secretValue = Read-Host "Valor do secret" -AsSecureString
        $secretValuePlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretValue)
        )
        
        Write-Host "Configurando secret..." -ForegroundColor Yellow
        supabase secrets set "$secretName=$secretValuePlain"
        Write-Host "✅ Secret configurado!" -ForegroundColor Green
    }
    
    "4" {
        Write-Host ""
        Write-Host "Funções disponíveis:" -ForegroundColor Cyan
        Get-ChildItem -Path ".\supabase\functions" -Directory | ForEach-Object {
            Write-Host "- $($_.Name)" -ForegroundColor White
        }
        Write-Host ""
        
        $functionName = Read-Host "Digite o nome da função para deploy"
        Write-Host "Fazendo deploy de $functionName..." -ForegroundColor Yellow
        supabase functions deploy $functionName
        Write-Host "✅ Deploy concluído!" -ForegroundColor Green
    }
    
    "5" {
        Write-Host ""
        Write-Host "Fazendo deploy de todas as funções..." -ForegroundColor Yellow
        supabase functions deploy
        Write-Host "✅ Deploy concluído!" -ForegroundColor Green
    }
    
    "6" {
        Write-Host ""
        Write-Host "Listando funções deployadas..." -ForegroundColor Yellow
        supabase functions list
    }
    
    "7" {
        Write-Host ""
        $functionName = Read-Host "Digite o nome da função"
        Write-Host "Exibindo logs de $functionName..." -ForegroundColor Yellow
        Write-Host "Pressione Ctrl+C para sair" -ForegroundColor Gray
        supabase functions logs $functionName --tail
    }
    
    "8" {
        Write-Host ""
        Write-Host "Funções disponíveis:" -ForegroundColor Cyan
        Get-ChildItem -Path ".\supabase\functions" -Directory | ForEach-Object {
            Write-Host "- $($_.Name)" -ForegroundColor White
        }
        Write-Host ""
        
        $functionName = Read-Host "Digite o nome da função"
        Write-Host "Servindo $functionName localmente..." -ForegroundColor Yellow
        Write-Host "A função estará disponível em: http://localhost:54321/functions/v1/$functionName" -ForegroundColor Cyan
        Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Gray
        supabase functions serve $functionName
    }
    
    "9" {
        Write-Host ""
        Write-Host "Saindo..." -ForegroundColor Yellow
        exit
    }
    
    default {
        Write-Host ""
        Write-Host "❌ Opção inválida!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Processo concluído!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
