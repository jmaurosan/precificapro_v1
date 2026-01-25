
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
    <div className="min-h-screen bg-white dark:bg-gray-950 flex">
      {/* Left Side: Illustration & Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-400 rounded-full blur-3xl opacity-30"></div>

        <div className="relative z-10 text-white max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Calculator className="w-8 h-8" />
            </div>
            <span className="text-3xl font-bold tracking-tight">PrecificaPro</span>
          </div>
          <h1 className="text-5xl font-extrabold mb-6 leading-tight">
            Gestão profissional para obras e projetos.
          </h1>
          <p className="text-indigo-100 text-xl leading-relaxed">
            Acompanhe orçamentos, cronogramas e vistorias de forma integrada e segura na nuvem.
          </p>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-12">
            <Calculator className="w-8 h-8 text-indigo-600" />
            <span className="text-2xl font-bold text-indigo-600">PrecificaPro</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {isLogin ? 'Entre para gerenciar seus projetos e clientes.' : 'Comece hoje mesmo a organizar seu escritório técnico.'}
            </p>
          </div>

          {/* Botões de Social Login */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              type="button"
              onClick={() => signInWithProvider('google')}
              className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm group"
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
              className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
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
              <span className="px-2 bg-white dark:bg-gray-950 text-gray-500 font-medium">Ou entre com email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm animate-in fade-in zoom-in-95">
                {error}
              </div>
            )}

            {message && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm animate-in fade-in zoom-in-95">
                {message}
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <UserIcon size={16} /> Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 dark:text-white transition-all"
                  placeholder="Seu nome ou escritório"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Mail size={16} /> Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 dark:text-white transition-all"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Lock size={16} /> Senha
                </label>
                {isLogin && <a href="#" className="text-xs text-indigo-600 hover:underline">Esqueceu a senha?</a>}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 dark:text-white transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'Entrar na conta' : 'Criar minha conta'}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition-colors"
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