/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Tournament, TournamentStatus } from "../types";
import { formatarValor } from "../utils";
import { Trophy, HelpCircle, Save, PlusCircle, AlertTriangle } from "lucide-react";

interface TournamentFormProps {
  currentTournament: Tournament | null;
  onSaveTournament: (tournament: Tournament) => void;
  onCreateNewTournament: (
    name: string,
    description: string,
    startNum: number,
    endNum: number,
    price: number,
    status: TournamentStatus,
    openDate: string,
    drawDate: string,
    notes?: string,
    isInfinite?: boolean
  ) => void;
  onWipeAllData?: () => void;
}

export default function TournamentForm({
  currentTournament,
  onSaveTournament,
  onCreateNewTournament,
  onWipeAllData,
}: TournamentFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(100);
  const [price, setPrice] = useState(100000); // 100K
  const [status, setStatus] = useState<TournamentStatus>(TournamentStatus.Aberto);
  const [openDate, setOpenDate] = useState("");
  const [drawDate, setDrawDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isInfinite, setIsInfinite] = useState(false);

  const [isCreateMode, setIsCreateMode] = useState(false);

  useEffect(() => {
    if (currentTournament && !isCreateMode) {
      setName(currentTournament.name);
      setDescription(currentTournament.description);
      setStartNum(currentTournament.number_start);
      setEndNum(currentTournament.number_end);
      setPrice(currentTournament.number_price);
      setStatus(currentTournament.status);
      setOpenDate(currentTournament.opening_date);
      setDrawDate(currentTournament.draw_date);
      setNotes(currentTournament.notes || "");
      setIsInfinite(!!currentTournament.is_infinite);
    } else if (isCreateMode) {
      // Defaults for brand new tournament
      setName("");
      setDescription("");
      setStartNum(1);
      setEndNum(100);
      setPrice(100000);
      setStatus(TournamentStatus.Rascunho);
      setOpenDate(new Date().toISOString().split("T")[0]);
      setDrawDate("");
      setNotes("");
      setIsInfinite(false);
    }
  }, [currentTournament, isCreateMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("O nome do torneio é obrigatório!");
      return;
    }

    let finalStart = startNum;
    let finalEnd = endNum;

    if (isInfinite) {
      finalStart = 1;
      finalEnd = 999999; // Represents virtual upper bound for display, but dynamic
    }

    if (finalStart < 0 || finalEnd <= finalStart) {
      alert("O número final deve ser maior do que o inicial!");
      return;
    }

    const totalCount = finalEnd - finalStart + 1;
    if (!isInfinite && totalCount > 1000) {
      alert("Por motivos de performance da grade visual, limite o torneio a no máximo 1000 números.");
      return;
    }

    if (isCreateMode) {
      if (confirm("ATENÇÃO: Criar um novo torneio irá APAGAR os números comprados e participantes do torneio atual. Deseja prosseguir?")) {
        onCreateNewTournament(
          name.trim(),
          description.trim(),
          finalStart,
          finalEnd,
          price,
          status,
          openDate,
          drawDate,
          notes.trim(),
          isInfinite
        );
        setIsCreateMode(false);
        setIsEditing(false);
        alert("Novo torneio criado com sucesso! O sistema está pronto.");
      }
    } else if (currentTournament) {
      const updated: Tournament = {
        ...currentTournament,
        name: name.trim(),
        description: description.trim(),
        number_start: finalStart,
        number_end: finalEnd,
        number_price: price,
        status,
        opening_date: openDate,
        draw_date: drawDate,
        notes: notes.trim(),
        is_infinite: isInfinite,
        updated_at: new Date().toISOString(),
      };
      onSaveTournament(updated);
      setIsEditing(false);
      alert("Dados do torneio atualizados com sucesso!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" id="tournament-config-view">
      
      {/* HEADER ACTION PANEL */}
      <div className="bg-dark-card p-5 rounded-2xl border border-dark-border shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold-primary" />
            {isCreateMode ? "Criar Novo Sorteio" : "Configuração do Torneio"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isCreateMode 
              ? "Preencha os campos para resetar e gerar um torneio inédito."
              : "Visualize as regras gerais do torneio vigente ou edite as datas/informações."
            }
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {onWipeAllData && !isCreateMode && (
            <button
              id="btn-wipe-all-data"
              onClick={() => {
                if (confirm("ATENÇÃO: Isso irá apagar de forma definitiva TODOS os dados do banco de dados (Participantes, Compras de Cotas, Pagamentos, Histórico e Logs de Auditoria).\n\nTem certeza absoluta de que deseja apagar tudo para inserir dados reais?")) {
                  if (confirm("Segunda Confirmação: Esta operação é permanente e não poderá ser desfeita. Continuar com a limpeza geral?")) {
                    onWipeAllData();
                  }
                }
              }}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-white shrink-0 animate-pulse" />
              Limpar Tudo (Dados Reais)
            </button>
          )}

          {!isCreateMode && (
            <button
              id="btn-trigger-new-tournament"
              onClick={() => {
                setIsCreateMode(true);
                setIsEditing(true);
              }}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              Novo Sorteio
            </button>
          )}

          {isCreateMode && (
            <button
              onClick={() => {
                setIsCreateMode(false);
                setIsEditing(false);
              }}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-dark-card-elevated hover:bg-dark-border border border-dark-border text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Voltar ao Atual
            </button>
          )}
        </div>
      </div>

      {/* DETAILED FORM */}
      <div className="bg-dark-card rounded-3xl border border-dark-border shadow-lg overflow-hidden">
        
        {/* WARN BANNER FOR NEW CREATIONS */}
        {isCreateMode && (
          <div className="bg-rose-950/30 border-b border-rose-900/40 text-rose-300 p-4 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <span className="font-bold block text-rose-400">Aviso de Destruição de Dados:</span>
              <span>
                Ao submeter este formulário de Novo Torneio, a plataforma irá apagar de forma definitiva todo o histórico de participantes, compras de cotas, pagamentos e resultados do torneio anterior. Salve os comprovantes se necessário antes de confirmar.
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6" id="form-tournament">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LEFT FIELDS COLUMN */}
            <div className="space-y-4">
              
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome do Torneio <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-t-name"
                  type="text"
                  required
                  disabled={!isEditing && !isCreateMode}
                  placeholder="Ex: Torneio do Milhão - Edição Especial"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">Descrição</label>
                <textarea
                  id="input-t-desc"
                  rows={3}
                  disabled={!isEditing && !isCreateMode}
                  placeholder="Escreva sobre o prêmio, transmissão ao vivo, apoios, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                ></textarea>
              </div>

              {/* DATES GRID */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">Abertura</label>
                  <input
                    id="input-t-opendate"
                    type="date"
                    disabled={!isEditing && !isCreateMode}
                    value={openDate}
                    onChange={(e) => setOpenDate(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">Prev. Sorteio</label>
                  <input
                    id="input-t-drawdate"
                    type="date"
                    disabled={!isEditing && !isCreateMode}
                    value={drawDate}
                    onChange={(e) => setDrawDate(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

            </div>

            {/* RIGHT FIELDS COLUMN (NUMERICAL CONFIGS) */}
            <div className="space-y-4">
              
              {/* TIPO DE GRADE DE NÚMEROS */}
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                  Tipo de Grade de Números
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="btn-grade-fixa"
                    type="button"
                    disabled={!isEditing && !isCreateMode}
                    onClick={() => setIsInfinite(false)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border flex flex-col items-center justify-center transition-all ${
                      !isInfinite
                        ? "bg-gold-primary text-black border-gold-primary shadow-lg glow-winner"
                        : "bg-dark-card-elevated text-slate-400 border-dark-border hover:text-white hover:bg-dark-border disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    }`}
                  >
                    <span>Grade Fixa</span>
                    <span className="text-[9px] opacity-80 font-normal mt-0.5 normal-case">Ex: de 1 a 100 cotas</span>
                  </button>
                  <button
                    id="btn-grade-infinita"
                    type="button"
                    disabled={!isEditing && !isCreateMode}
                    onClick={() => setIsInfinite(true)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border flex flex-col items-center justify-center transition-all ${
                      isInfinite
                        ? "bg-gold-primary text-black border-gold-primary shadow-lg glow-winner"
                        : "bg-dark-card-elevated text-slate-400 border-dark-border hover:text-white hover:bg-dark-border disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    }`}
                  >
                    <span>Números Infinitos</span>
                    <span className="text-[9px] opacity-80 font-normal mt-0.5 normal-case">Dinâmica de 1 a 999.999</span>
                  </button>
                </div>
              </div>

              {!isInfinite ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                      Número Inicial
                    </label>
                    <input
                      id="input-t-startnum"
                      type="number"
                      required
                      disabled={!isCreateMode} 
                      value={startNum}
                      onChange={(e) => setStartNum(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                      Número Final
                    </label>
                    <input
                      id="input-t-endnum"
                      type="number"
                      required
                      disabled={!isCreateMode}
                      value={endNum}
                      onChange={(e) => setEndNum(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-gold-primary/5 border border-gold-primary/20 rounded-xl text-slate-300 text-xs">
                  <span className="font-bold text-gold-primary block mb-0.5 uppercase tracking-wider text-[10px]">Modo Números Infinitos Ativo:</span>
                  <span>
                    A grade visual de números livres é desativada. Os jogadores podem pesquisar e reservar qualquer número inteiro positivo de sua preferência (ex: 7, 777, 12345).
                  </span>
                </div>
              )}

              {/* FIXED VALUE FOR EACH NUMBER */}
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  Preço por Cota (Valor do Número)
                  <span className="text-slate-400 cursor-help" title="Fixo por padrão em 100K (100.000)">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Inteiro:</span>
                  <input
                    id="input-t-price"
                    type="number"
                    required
                    disabled={true} 
                    value={price}
                    className="w-full pl-14 pr-16 py-2.5 bg-dark-bg/40 border border-dark-border rounded-xl text-xs text-slate-400 font-mono outline-none cursor-not-allowed"
                  />
                  <span className="absolute right-3.5 top-2.5 text-[10px] font-black uppercase tracking-wider text-gold-primary bg-gold-primary/10 border border-gold-primary/20 px-2 py-0.5 rounded-md">
                    Exibição: {formatarValor(price)}
                  </span>
                </div>
              </div>

              {/* TOURNAMENT STATUS */}
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                  Status do Torneio
                </label>
                <select
                  id="select-t-status"
                  disabled={!isEditing && !isCreateMode}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TournamentStatus)}
                  className="w-full px-3 py-2.5 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value={TournamentStatus.Rascunho}>Rascunho</option>
                  <option value={TournamentStatus.Aberto}>Aberto</option>
                  <option value={TournamentStatus.AguardandoPagamento}>Aguardando pagamentos</option>
                  <option value={TournamentStatus.ProntoParaSorteio}>Pronto para sorteio</option>
                  <option value={TournamentStatus.Finalizado}>Finalizado</option>
                  <option value={TournamentStatus.Cancelado}>Cancelado</option>
                </select>
              </div>

              {/* TOURNAMENT NOTES */}
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">Observações do Torneio</label>
                <textarea
                  id="input-t-notes"
                  rows={2}
                  disabled={!isEditing && !isCreateMode}
                  placeholder="Observações administrativas internas."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                ></textarea>
              </div>

            </div>

          </div>

          {/* FORM FOOTER ACTIONS */}
          <div className="pt-5 border-t border-dark-border flex justify-between items-center">
            
            {!isEditing && !isCreateMode ? (
              <button
                id="btn-edit-tournament-trigger"
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-wider text-xs rounded-xl transition-colors cursor-pointer"
              >
                Editar Informações
              </button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreateMode(false);
                  }}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-dark-card-elevated hover:bg-dark-border border border-dark-border text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-tournament"
                  type="submit"
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-gold-primary hover:bg-gold-dark text-black font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer glow-winner"
                >
                  <Save className="w-4 h-4 text-black" />
                  {isCreateMode ? "Criar Torneio" : "Salvar Alterações"}
                </button>
              </div>
            )}
            
            {!isEditing && !isCreateMode && (
              <span className="text-[10px] text-slate-500 font-mono font-bold flex items-center gap-1 uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 text-gold-primary" />
                Torneio ID: {currentTournament?.id}
              </span>
            )}

          </div>

        </form>

      </div>

    </div>
  );
}
