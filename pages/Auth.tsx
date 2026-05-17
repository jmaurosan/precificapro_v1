
import { ArrowRight, Calculator, Lock, Mail, User as UserIcon, ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

const Auth: React.FC = () => {
  const { login, signUp, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const getFriendlyAuthError = (authError: { message?: string } | null | undefined) => {
    const errorMessage = authError?.message || '';

    if (errorMessage.includes('Signups not allowed')) {
      return 'O cadastro de novos usuários está desativado no Supabase. Ative em Authentication > Providers > Email > Allow new users to sign up.';
    }

    if (errorMessage.includes('Invalid login credentials')) {
      return 'Email ou senha inválidos. Verifique os dados e tente novamente.';
    }

    if (errorMessage.includes('Email not confirmed')) {
      return 'Seu email ainda não foi confirmado. Verifique sua caixa de entrada.';
    }

    if (errorMessage.includes('Failed to fetch')) {
      return 'Não foi possível conectar ao Supabase. Verifique sua conexão e as variáveis do projeto.';
    }

    return errorMessage;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email) return setError('Informe seu email para recuperar a senha.');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (resetError) {
      setError(resetError.message || 'Erro ao enviar email de recuperação.');
    } else {
      setMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isLogin) {
      const { error: loginError } = await login(email, password);
      if (loginError) {
        setError(getFriendlyAuthError(loginError) || 'Falha no login. Verifique suas credenciais.');
      }
    } else {
      if (!name) return setError('Nome é obrigatório para cadastro.');
      const { error: signUpError } = await signUp(email, password, name);
      if (signUpError) {
        setError(getFriendlyAuthError(signUpError) || 'Erro ao criar conta.');
      } else {
        setMessage('Conta criada com sucesso! Verifique seu email para confirmar o acesso.');
      }
    }
  };

  // Tela de Recuperação de Senha
  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-600 items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-emerald-500 rounded-full blur-3xl opacity-40"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-400 rounded-full blur-3xl opacity-30"></div>
          <div className="relative z-10 text-white max-w-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl shadow-black/20">
                <Calculator className="w-8 h-8" />
              </div>
              <span className="text-3xl font-black tracking-tight">PrecificaPro</span>
            </div>
            <h1 className="text-4xl font-black mb-6 leading-tight">Recupere sua senha</h1>
            <p className="text-teal-50 text-xl leading-relaxed font-medium">
              Enviaremos um link seguro para seu email para redefinir a senha.
            </p>
          </div>
        </div>
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-md animate-fade-in">
            <button
              onClick={() => { setShowResetPassword(false); setError(''); setMessage(''); }}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-semibold mb-8"
            >
              <ArrowLeft size={16} /> Voltar ao login
            </button>
            <div className="mb-10">
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Esqueceu a senha?</h2>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Informe seu email e enviaremos um link de recuperação.</p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm font-medium animate-scale-in">{error}</div>
              )}
              {message && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm font-medium animate-scale-in">{message}</div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Mail size={16} /> Email cadastrado
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="seu@email.com"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Enviar Link de Recuperação
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex">
      {/* Left Side: Illustration & Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-600 items-center justify-center p-12 relative overflow-hidden">
        {/* Background Mesh Effect */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-emerald-500 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-400 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-teal-400 rounded-full blur-3xl opacity-20"></div>

        <div className="relative z-10 text-white max-w-lg animate-slide-up">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl shadow-black/20">
              <Calculator className="w-8 h-8" />
            </div>
            <span className="text-3xl font-black tracking-tight">PrecificaPro</span>
          </div>
          <h1 className="text-5xl font-black mb-6 leading-tight">
            Gestão profissional para obras e projetos.
          </h1>
          <p className="text-teal-50 text-xl leading-relaxed font-medium">
            Acompanhe orçamentos, cronogramas e vistorias de forma integrada e segura na nuvem.
          </p>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-gradient-primary">PrecificaPro</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              {isLogin ? 'Entre para gerenciar seus projetos e clientes.' : 'Comece hoje mesmo a organizar seu escritório técnico.'}
            </p>
          </div>



          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm font-medium animate-scale-in">
                {error}
              </div>
            )}

            {message && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm font-medium animate-scale-in">
                {message}
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2 animate-slide-up">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <UserIcon size={16} /> Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Seu nome ou escritório"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Mail size={16} /> Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Lock size={16} /> Senha
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'Entrar na conta' : 'Criar minha conta'}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-semibold"
              >
                {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já possui uma conta? Entre agora'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
