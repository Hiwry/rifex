/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ShieldCheck, UserPlus, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { saveSecondaryAdminToFirebase, getSecondaryAdminFromFirebase } from "../firebaseService";

interface AdminRegistrationProps {
  onRegistrationSuccess: (username: string, adminData: any) => void;
  existingSecondaryAdmin: any | null;
}

export default function AdminRegistration({
  onRegistrationSuccess,
  existingSecondaryAdmin,
}: AdminRegistrationProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(!!existingSecondaryAdmin);

  // Check on mount if someone registered in database in the meantime
  useEffect(() => {
    async function checkExisting() {
      const dbAdmin = await getSecondaryAdminFromFirebase();
      if (dbAdmin) {
        setAlreadyRegistered(true);
      }
    }
    if (!existingSecondaryAdmin) {
      checkExisting();
    }
  }, [existingSecondaryAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const userClean = username.trim();
    const passClean = password.trim();

    if (!userClean || !passClean) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    if (userClean.length < 3) {
      setError("O nome de usuário deve ter pelo menos 3 caracteres.");
      return;
    }

    if (passClean.length < 5) {
      setError("A senha deve ter pelo menos 5 caracteres.");
      return;
    }

    if (passClean !== confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }

    // Block if master username is used
    if (userClean.toLowerCase() === "admin" || userClean.toLowerCase() === "admin321") {
      setError("Este nome de usuário é reservado do sistema.");
      return;
    }

    setLoading(true);
    try {
      const adminData = {
        username: userClean,
        password: passClean,
        created_at: new Date().toISOString(),
      };

      const successCreated = await saveSecondaryAdminToFirebase(adminData);
      if (successCreated) {
        setSuccess(true);
        setTimeout(() => {
          onRegistrationSuccess(userClean, adminData);
        }, 1500);
      } else {
        setError("O cadastro secundário já foi realizado ou ocorreu um erro.");
        setAlreadyRegistered(true);
      }
    } catch (err) {
      console.error(err);
      setError("Ocorreu um erro ao salvar o administrador no banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  if (alreadyRegistered) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-dark-card rounded-3xl border border-dark-border text-center space-y-6 shadow-xl" id="admin-reg-already">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-500">
          <AlertTriangle className="w-8 h-8 shrink-0" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Acesso Bloqueado</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Esta página de cadastro único já foi utilizada ou o administrador secundário já está registrado no sistema. 
            Não é possível realizar outro cadastro.
          </p>
        </div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
          CÓDIGO DE SEGURANÇA: REGISTERED_ONCE_LOCK
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-8 p-6 sm:p-8 bg-dark-card rounded-3xl border border-dark-border shadow-2xl space-y-6" id="admin-reg-view">
      <div className="flex items-center gap-3 pb-4 border-b border-dark-border-light">
        <div className="p-2.5 bg-gold-primary/10 border border-gold-primary/25 rounded-2xl text-gold-primary">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            Cadastrar Segundo Admin
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Link de uso único para novos administradores
          </p>
        </div>
      </div>

      {success ? (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 bg-success-vibrant/10 border border-success-vibrant/20 rounded-full flex items-center justify-center mx-auto text-success-vibrant animate-bounce">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-white uppercase tracking-wider">Cadastro Realizado!</h3>
            <p className="text-xs text-slate-400">Autenticando no painel em instantes...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" id="form-register-admin">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
              Nome de Usuário
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-500">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <input
                id="reg-input-username"
                type="text"
                required
                placeholder="Ex: admin_junior"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
              Senha de Acesso
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="reg-input-password"
                type="password"
                required
                placeholder="Minimo 5 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
              Confirmar Senha
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="reg-input-confirm-password"
                type="password"
                required
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
              />
            </div>
          </div>

          <button
            id="btn-reg-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-gold-primary hover:bg-gold-dark disabled:opacity-50 text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all shadow-md cursor-pointer glow-winner flex items-center justify-center gap-1.5"
          >
            {loading ? "Processando..." : "Finalizar Registro"}
          </button>
        </form>
      )}

      <div className="text-center">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          * ESTA OPERAÇÃO É REGISTRADA NO LOG DE SEGURANÇA.
        </p>
      </div>
    </div>
  );
}
