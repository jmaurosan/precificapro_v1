
import { ArrowRight, Calculator, Lock, Mail, User as UserIcon } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const Auth: React.FC = () => {
  const { login, signUp, signInWithProvider, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isLogin) {
      const { error: loginError } = await login(email, password);
      if (loginError) {
        setError(loginError.message || 'Falha no login. Verifique suas credenciais.');
      }
    } else {
      if (!name) return setError('Nome é obrigatório para cadastro.');
      const { error: signUpError } = await signUp(email, password, name);
      if (signUpError) {
        setError(signUpError.message || 'Erro ao criar conta.');
      } else {
        setMessage('Conta criada com sucesso! Verifique seu email para confirmar o acesso.');
      }
    }
  };

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

          {/* Botões de Social Login */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              type="button"
              onClick={() => signInWithProvider('google')}
              className="flex items-center justify-center gap-2 p-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24-1.19-.6z" />
                <path fill="#EA4335" d="M12 4.66c1.61 0 3.06.55 4.2 1.64l3.15-3.15C17.45 1.46 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Google</span>
            </button>
            <button
              type="button"
              onClick={() => signInWithProvider('apple')}
              className="flex items-center justify-center gap-2 p-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
            >
              <svg className="w-5 h-5 dark:text-white text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-.98-.55-2.23-.5-3.21.35-.91.82-2.18.78-3.25-.3C5.1 18.25 2.15 13.15 4.95 8.1c1.2-2.15 3.33-3.25 5.23-3.15 1.35.08 2.63.77 3.45.77.8 0 2.45-.88 4.15-.65 1.63.15 2.83.75 3.73 1.95-3.3 1.85-2.58 6.45.88 7.75-.68 1.9-1.93 3.9-3.34 5.51zM12.08 4.13c.75-1.15.53-2.58.1-3.55-1.13.13-2.55.93-3.18 2.05-.63 1.05-.33 2.5.15 3.45 1.13-.08 2.33-.85 2.93-1.95z" />
              </svg>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Apple ID</span>
            </button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-500 dark:text-gray-400 font-semibold">Ou entre com email</span>
            </div>
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
                {isLogin && <a href="#" className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold">Esqueceu a senha?</a>}
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