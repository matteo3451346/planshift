import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, Calendar, Sparkles } from 'lucide-react';

const LoginPage = () => {
  const { user, login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  if (user && !isLoading) {
    return <Navigate to="/" replace />;
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.username.trim() || !formData.password.trim()) {
      toast.error('Per favore inserisci username e password');
      setIsSubmitting(false);
      return;
    }

    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      toast.success('Accesso effettuato con successo!');
    } else {
      toast.error(result.error || 'Errore durante l\'accesso');
    }
    
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-pink-400 to-blue-500 opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-r from-yellow-400 to-pink-500 opacity-10 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 glass-panel mb-6 group hover:scale-110 transition-all duration-300">
            <Calendar className="w-10 h-10 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
            <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-white mb-3 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            PlanShift
          </h1>
          <p className="text-white/80 text-lg font-medium">Sistema Avanzato di Gestione Turni</p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Login Form */}
        <div className="glass-panel p-8 scale-in">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 text-center">Benvenuto</h2>
            <p className="text-slate-600 text-center mt-2">Accedi al tuo account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Inserisci il tuo username"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input pr-12"
                  placeholder="Inserisci la tua password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg w-full flex items-center justify-center gap-3 group"
            >
              {isSubmitting ? (
                <div className="loading"></div>
              ) : (
                <>
                  <LogIn size={20} className="group-hover:translate-x-1 transition-transform duration-200" />
                  Accedi al Sistema
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 fade-in">
          <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
            <div className="w-1 h-1 bg-white/50 rounded-full"></div>
            <span>© 2024 PlanShift</span>
            <div className="w-1 h-1 bg-white/50 rounded-full"></div>
            <span>Sistema Professionale</span>
            <div className="w-1 h-1 bg-white/50 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default LoginPage;