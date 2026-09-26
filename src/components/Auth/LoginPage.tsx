import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, login, loginWithGoogle, register, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'student' | 'mentor'>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState('Grado 11-A');
  const [mentorAccessCode, setMentorAccessCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated and not loading, redirect to respective dashboard
  if (!authLoading && user) {
    const fromPath = (location.state as { from?: { pathname: string } })?.from?.pathname;
    // Check if the fromPath matches user's role
    if (fromPath && (
      (user.role === 'mentor' && fromPath.startsWith('/mentor')) ||
      (user.role === 'student' && fromPath.startsWith('/student'))
    )) {
      return <Navigate to={fromPath} replace />;
    }
    return <Navigate to={user.role === 'mentor' ? '/mentor' : '/student'} replace />;
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Por favor ingresa tu correo y contraseña.');
        }
        await login(email, password);
        const targetPath = email.toLowerCase().includes('mentor') ? '/mentor' : '/student';
        navigate(targetPath, { replace: true });
      } else {
        if (!name.trim()) throw new Error('Por favor ingresa tu nombre completo.');
        if (!email.trim()) throw new Error('Por favor ingresa un correo electrónico válido.');
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');

        if (role === 'mentor' && mentorAccessCode !== 'AULAVIVA2026') {
          throw new Error('Código de acceso para Mentor inválido. (Usa: AULAVIVA2026)');
        }

        const newUser = await register(name, email, password, role, grade);
        navigate(newUser.role === 'mentor' ? '/mentor' : '/student', { replace: true });
      }
    } catch (err: any) {
      console.error('Error en autenticación:', err);
      let msg = err.message || 'Error al autenticar.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Credenciales inválidas. Verifica tu correo y contraseña.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este correo ya está registrado. Por favor inicia sesión.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña es demasiado débil (mínimo 6 caracteres).';
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      const loggedUser = await loginWithGoogle();
      navigate(loggedUser.role === 'mentor' ? '/mentor' : '/student', { replace: true });
    } catch (err: any) {
      console.error('Error en autenticación con Google:', err);
      setError(err.message || 'No se pudo iniciar sesión con Google.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-950 border border-emerald-400/30">
          <BookOpen className="w-7 h-7" />
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-white">Aula Viva</h1>
        <p className="mt-1 text-sm text-emerald-300 font-medium">
          Plataforma de mentoría y habilidades para la vida
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 shadow-inner">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Acceso Seguro con Firebase Auth y Roles RBAC</span>
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-slate-900/90 rounded-2xl border border-slate-700/60 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'login'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'register'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrarse</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs sm:text-sm flex items-start gap-3">
              <span className="p-1 rounded-md bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">⚠️</span>
              <div>
                <p className="font-bold">Error de autenticación</p>
                <p className="mt-0.5 text-rose-200">{error}</p>
              </div>
            </div>
          )}

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleSubmitting || submitting}
            className="w-full mb-4 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50 text-slate-800 font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2.5 cursor-pointer border border-slate-300"
          >
            {googleSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-400/40 border-t-slate-700 rounded-full animate-spin" />
                <span>Conectando con Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
                  <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
                </svg>
                <span>Continuar con Google</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-slate-700/60" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">o con correo</span>
            <div className="h-px flex-1 bg-slate-700/60" />
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Selecciona tu Rol en el Sistema
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        role === 'student'
                          ? 'border-emerald-500 bg-emerald-500/15 text-white ring-2 ring-emerald-500/20'
                          : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <GraduationCap className={`w-5 h-5 ${role === 'student' ? 'text-emerald-400' : 'text-slate-400'}`} />
                        {role === 'student' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <span className="font-bold text-sm text-white">Estudiante</span>
                      <span className="text-[11px] text-slate-400">Misiones, XP y feedback</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('mentor')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        role === 'mentor'
                          ? 'border-indigo-500 bg-indigo-500/15 text-white ring-2 ring-indigo-500/20'
                          : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Sparkles className={`w-5 h-5 ${role === 'mentor' ? 'text-indigo-400' : 'text-slate-400'}`} />
                        {role === 'mentor' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                      </div>
                      <span className="font-bold text-sm text-white">Mentor</span>
                      <span className="text-[11px] text-slate-400">Panel docente y validación</span>
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Mateo Gómez"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-emerald-500 transition-colors"
                  />
                </div>

                {role === 'student' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Grado Escolar
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-emerald-500 transition-colors cursor-pointer"
                    >
                      <option value="Grado 11-A">Grado 11-A (Colegio Piloto)</option>
                      <option value="Grado 11-B">Grado 11-B</option>
                      <option value="Grado 10">Grado 10</option>
                    </select>
                  </div>
                )}

                {role === 'mentor' && (
                  <div>
                    <label className="block text-xs font-bold text-indigo-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Código de Validación para Mentor</span>
                    </label>
                    <input
                      type="password"
                      value={mentorAccessCode}
                      onChange={(e) => setMentorAccessCode(e.target.value)}
                      placeholder="Código del colegio (Usa: AULAVIVA2026)"
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-indigo-700/60 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-indigo-500 transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Código de prueba para habilitar rol docente: <strong className="text-indigo-300">AULAVIVA2026</strong>
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@colegio.edu"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Procesando acceso seguro...</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Ingresar al Sistema</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Crear Cuenta y Asignar Rol</span>
                </>
              )}
            </button>
          </form>

          {/* Security Assurance Footer */}
          <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Las rutas y datos del estudiante están protegidas por credenciales y roles RBAC.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
