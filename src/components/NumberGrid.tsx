/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Tournament, TournamentNumber, Participant, NumberStatus, PaymentStatus, TournamentStatus } from "../types";
import { formatarValor, padronizarNumero, formatarDataHora } from "../utils";
import { Hash, User, Phone, Calendar, ShoppingCart, Info, Trophy, Ban, Check, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NumberGridProps {
  tournament: Tournament | null;
  numbers: TournamentNumber[];
  participants: Participant[];
  onReserveNumbers: (
    numbers: number[],
    nickname: string,
    contactNumber: string,
    proof: string
  ) => void;
  onConfirmPaymentDirectly: (numberId: string) => void;
  onCancelReservationDirectly: (numberId: string) => void;
  isAdmin?: boolean;
}

export default function NumberGrid({
  tournament,
  numbers,
  participants,
  onReserveNumbers,
  onConfirmPaymentDirectly,
  onCancelReservationDirectly,
  isAdmin,
}: NumberGridProps) {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [activeDetailsNumber, setActiveDetailsNumber] = useState<TournamentNumber | null>(null);
  
  // Reservation Form State
  const [nickname, setNickname] = useState("");
  const [contact, setContact] = useState("");
  const [proof, setProof] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Privacy Toggle (Admin view is simulated)
  const [isAdminView, setIsAdminView] = useState(false);

  // Sync state if isAdmin is true or false
  React.useEffect(() => {
    setIsAdminView(!!isAdmin);
  }, [isAdmin]);

  if (!tournament) {
    return (
      <div className="p-8 text-center bg-dark-card rounded-2xl border border-dark-border max-w-md mx-auto shadow-md">
        <p className="text-slate-400 text-sm">Cadastre um torneio primeiro para gerar os números.</p>
      </div>
    );
  }

  // Helpers for infinite / dynamic numbers mode
  const handleAddCustomNumber = (num: number) => {
    if (isNaN(num) || num < 1 || num > 999999) {
      alert("Por favor, selecione um número válido entre 1 e 999.999.");
      return;
    }

    // Check if already reserved/paid
    const existingNum = numbers.find((n) => n.number === num);
    if (existingNum && existingNum.status !== NumberStatus.Disponivel) {
      alert(`O número ${num} já está reservado ou pago por ${existingNum.participant_nickname || 'outro participante'}!`);
      return;
    }

    // Check if already selected locally
    if (selectedNumbers.includes(num)) {
      alert(`Você já adicionou o número ${num} à sua seleção!`);
      return;
    }

    setSelectedNumbers([...selectedNumbers, num]);
  };

  const handleAddRandomNumbers = (count: number) => {
    const newlyAdded: number[] = [];
    let attempts = 0;
    while (newlyAdded.length < count && attempts < 2000) {
      attempts++;
      const rand = Math.floor(Math.random() * 1000) + 1; // Pick range for standard seed
      if (selectedNumbers.includes(rand) || newlyAdded.includes(rand)) continue;

      const existing = numbers.find((n) => n.number === rand);
      if (existing && existing.status !== NumberStatus.Disponivel) continue;

      newlyAdded.push(rand);
    }
    if (newlyAdded.length > 0) {
      setSelectedNumbers([...selectedNumbers, ...newlyAdded]);
    }
  };

  const handleNumberClick = (numObj: TournamentNumber) => {
    // If available, toggle selection
    if (numObj.status === NumberStatus.Disponivel) {
      if (tournament.status === TournamentStatus.Finalizado || tournament.status === TournamentStatus.Cancelado) {
        return; // Can't buy closed/cancelled tournaments
      }
      if (selectedNumbers.includes(numObj.number)) {
        setSelectedNumbers(selectedNumbers.filter((n) => n !== numObj.number));
      } else {
        setSelectedNumbers([...selectedNumbers, numObj.number]);
      }
    } else {
      // If occupied, open details modal
      setActiveDetailsNumber(numObj);
    }
  };

  const handleReserveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (selectedNumbers.length === 0) {
      setErrorMsg("Selecione pelo menos um número!");
      return;
    }
    if (!nickname.trim()) {
      setErrorMsg("O Nick do personagem é obrigatório!");
      return;
    }
    if (!contact.trim()) {
      setErrorMsg("O número para contato é obrigatório!");
      return;
    }

    // Process reservation
    onReserveNumbers(selectedNumbers, nickname.trim(), contact.trim(), proof.trim());
    
    // Reset state
    setSelectedNumbers([]);
    setNickname("");
    setContact("");
    setProof("");
  };

  const getStatusStyle = (status: NumberStatus, isWinner: boolean, isSelected: boolean) => {
    if (isWinner) {
      return "bg-gold-primary hover:bg-gold-dark border-gold-primary text-black shadow-md glow-winner animate-pulse font-black scale-105";
    }
    if (isSelected) {
      return "bg-[#3d5afe] hover:bg-[#3d5afe]/95 border-[#3d5afe] text-white font-black scale-105 shadow-md ring-2 ring-[#3d5afe]/50 ring-offset-2 ring-offset-dark-bg";
    }

    switch (status) {
      case NumberStatus.Disponivel:
        return "bg-dark-card-elevated border-dark-border text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-500";
      case NumberStatus.Reservado:
        return "bg-warning-vibrant hover:opacity-90 border-warning-vibrant text-black font-black";
      case NumberStatus.Pago:
        return "bg-success-vibrant hover:opacity-90 border-success-vibrant text-black font-black";
      case NumberStatus.Bloqueado:
        return "bg-dark-card border-dark-border text-slate-600 cursor-not-allowed";
      case NumberStatus.Cancelado:
        return "bg-rose-950 border-rose-900 text-rose-500 cursor-not-allowed line-through";
      default:
        return "bg-dark-card border-dark-border text-slate-300";
    }
  };

  const getStatusLabel = (status: NumberStatus, isWinner: boolean) => {
    if (isWinner) return "🥇 VENCEDOR";
    return status.toUpperCase();
  };

  const totalPrice = selectedNumbers.length * tournament.number_price;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="numbers-grid-view">
      
      {/* LEFT & CENTER: THE NUMBERS GRID */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* LEGEND BAR */}
        <div className="bg-dark-card rounded-2xl p-4 border border-dark-border shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md border border-dark-border-light bg-dark-card-elevated"></div>
              <span className="text-slate-300 font-bold">Livre</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-warning-vibrant"></div>
              <span className="text-slate-300 font-bold">Reservado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-success-vibrant"></div>
              <span className="text-slate-300 font-bold">Pago</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-dark-card border border-dark-border"></div>
              <span className="text-slate-300 font-bold">Bloqueado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-gold-primary glow-winner"></div>
              <span className="text-gold-primary font-black">Vencedor</span>
            </div>
          </div>

          {/* Privacy Toggle - Only displayed if isAdmin is true */}
          {isAdmin && (
            <div className="flex items-center gap-2 text-xs border-l border-dark-border pl-4">
              <span className="text-slate-400 font-bold">Modo de Exibição:</span>
              <button
                type="button"
                onClick={() => setIsAdminView(!isAdminView)}
                className={`px-3 py-1 rounded-md font-black uppercase tracking-wider text-[9px] transition-colors cursor-pointer border ${
                  isAdminView ? "bg-gold-primary text-black border-gold-primary shadow-sm glow-winner" : "bg-dark-card-elevated border-dark-border-light text-slate-300"
                }`}
              >
                {isAdminView ? "Admin" : "Participante"}
              </button>
            </div>
          )}
        </div>

        {/* INFINITE NUMBERS CUSTOM SEARCH/ADD PANEL */}
        {tournament.is_infinite && (
          <div className="bg-dark-card rounded-3xl p-6 border border-dark-border shadow-md space-y-4">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Hash className="w-4.5 h-4.5 text-gold-primary" />
                Buscar ou Escolher Números Personalizados
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Como este torneio aceita números infinitos, digite os números desejados abaixo para adicioná-los ao formulário de compra.
              </p>
            </div>
            <div className="flex gap-2.5">
              <input
                id="input-add-custom-number"
                type="number"
                min="1"
                max="999999"
                placeholder="Digite um número de 1 a 999.999"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const num = parseInt((e.target as HTMLInputElement).value);
                    if (num) handleAddCustomNumber(num);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none font-mono"
              />
              <button
                type="button"
                id="btn-add-custom-number-action"
                onClick={() => {
                  const inputEl = document.getElementById("input-add-custom-number") as HTMLInputElement;
                  const num = parseInt(inputEl?.value || "");
                  if (num) {
                    handleAddCustomNumber(num);
                    inputEl.value = "";
                  } else {
                    alert("Digite um número válido!");
                  }
                }}
                className="px-5 py-2.5 bg-gold-primary hover:bg-gold-dark text-black rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Adicionar
              </button>
            </div>

            {/* Random selection helper */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dark-border-light text-xs text-slate-400">
              <span>Escolha Rápida Aleatória:</span>
              <button
                type="button"
                onClick={() => handleAddRandomNumbers(1)}
                className="px-2.5 py-1 bg-dark-card hover:bg-dark-border-light border border-dark-border-light rounded-lg font-bold text-[10px] text-white cursor-pointer"
              >
                +1 Cota
              </button>
              <button
                type="button"
                onClick={() => handleAddRandomNumbers(5)}
                className="px-2.5 py-1 bg-dark-card hover:bg-dark-border-light border border-dark-border-light rounded-lg font-bold text-[10px] text-white cursor-pointer"
              >
                +5 Cotas
              </button>
              <button
                type="button"
                onClick={() => handleAddRandomNumbers(10)}
                className="px-2.5 py-1 bg-dark-card hover:bg-dark-border-light border border-dark-border-light rounded-lg font-bold text-[10px] text-white cursor-pointer"
              >
                +10 Cotas
              </button>
            </div>
          </div>
        )}

        {/* PRIMARY MATRIX BOX */}
        <div className="bg-dark-card rounded-3xl p-6 border border-dark-border shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                {tournament.is_infinite ? "Cotas Já Adquiridas" : "Selecione Suas Cotas"}
              </h2>
              <p className="text-xs text-slate-400">
                {tournament.is_infinite 
                  ? "Abaixo estão os números que já foram reservados ou pagos pelos participantes deste torneio."
                  : "Escolha os números disponíveis na grade abaixo. Clique em cotas reservadas ou pagas para ver detalhes."
                }
              </p>
            </div>
            <span className="text-[10px] font-black font-mono text-gold-primary bg-gold-primary/10 border border-gold-primary/20 px-3 py-1.5 rounded-full uppercase tracking-widest shrink-0 self-start sm:self-center">
              PREÇO: {formatarValor(tournament.number_price)}
            </span>
          </div>

          {tournament.is_infinite ? (
            <div className="space-y-4">
              {numbers.filter(num => num.status !== NumberStatus.Disponivel).length === 0 ? (
                <div className="py-12 text-center bg-dark-card-elevated border border-dark-border rounded-xl text-slate-500">
                  <p className="text-xs font-bold text-slate-400">Nenhum número adquirido ainda neste torneio.</p>
                  <p className="text-[11px] text-slate-500 mt-1">Seja o primeiro a garantir o seu número da sorte digitando no buscador acima!</p>
                </div>
              ) : (
                <div 
                  className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2"
                  id="numbers-matrix"
                >
                  {numbers
                    .filter(num => num.status !== NumberStatus.Disponivel)
                    .sort((a,b)=>a.number - b.number)
                    .map((numObj) => {
                      const isWinner = tournament.winner_number_id ? (tournament.winner_number_id === numObj.id || tournament.winner_number_id === String(numObj.number)) : false;
                      
                      return (
                        <button
                          key={numObj.id}
                          id={`btn-number-${numObj.number}`}
                          onClick={() => handleNumberClick(numObj)}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden select-none cursor-pointer ${getStatusStyle(numObj.status, isWinner, false)}`}
                        >
                          <span className="text-xs font-mono font-black tracking-tight">
                            #{numObj.number}
                          </span>
                          <span className="text-[9px] opacity-75 truncate max-w-[60px] font-bold block mt-0.5">
                            {numObj.participant_nickname || "Reservado"}
                          </span>
                          {isWinner && (
                            <Trophy className="w-3.5 h-3.5 text-black absolute top-1 right-1 font-black" />
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          ) : (
            /* THE STANDARD GRID */
            <div 
              className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5"
              id="numbers-matrix"
            >
              {numbers.map((numObj) => {
                const isSelected = selectedNumbers.includes(numObj.number);
                const isWinner = tournament.winner_number_id ? (tournament.winner_number_id === numObj.id || tournament.winner_number_id === String(numObj.number)) : false;
                
                return (
                  <button
                    key={numObj.id}
                    id={`btn-number-${numObj.number}`}
                    onClick={() => handleNumberClick(numObj)}
                    disabled={numObj.status === NumberStatus.Bloqueado && !isWinner}
                    className={`aspect-square w-full rounded-xl border flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden select-none cursor-pointer ${getStatusStyle(numObj.status, isWinner, isSelected)}`}
                  >
                    <span className="text-xs font-mono font-black tracking-tight">
                      {padronizarNumero(numObj.number, tournament.number_end)}
                    </span>
                    
                    {isWinner && (
                      <Trophy className="w-3.5 h-3.5 text-black absolute bottom-1 font-black" />
                    )}
                    {numObj.status === NumberStatus.Pago && !isWinner && (
                      <span className="w-1.5 h-1.5 rounded-full bg-black absolute bottom-1"></span>
                    )}
                    {numObj.status === NumberStatus.Reservado && !isWinner && (
                      <span className="w-1.5 h-1.5 rounded-full bg-black absolute bottom-1"></span>
                    )}
                    {isSelected && (
                      <Check className="w-3 h-3 text-white absolute bottom-1 font-black" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: PURCHASE PANELS & SELECTIONS */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* CARD DE SELEÇÃO E COMPRA DE NÚMEROS */}
        <div id="purchase-cart-card" className="bg-dark-card rounded-3xl p-6 border border-dark-border shadow-md space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-dark-border-light">
            <div className="p-2.5 bg-gold-primary/10 text-gold-primary rounded-xl border border-gold-primary/20 shadow-xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Formulário de Reserva</h3>
              <p className="text-xs text-slate-400">Compre múltiplos números em uma só cota.</p>
            </div>
          </div>

          {selectedNumbers.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Info className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-xs font-bold text-slate-400">Nenhum número selecionado.</p>
              <p className="text-[11px] text-slate-500 mt-1">Selecione cotas livres na grade para iniciar.</p>
            </div>
          ) : (
            <form onSubmit={handleReserveSubmit} className="space-y-5" id="form-purchase-numbers">
              {/* LIST OF SELECTED NUMBERS */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Números Escolhidos ({selectedNumbers.length})</label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-dark-card-elevated rounded-xl border border-dark-border-light max-h-24 overflow-y-auto">
                  {selectedNumbers.sort((a,b)=>a-b).map((num) => (
                    <span key={num} className="px-2.5 py-0.5 bg-gold-primary text-black text-xs font-mono font-black rounded-md">
                      {padronizarNumero(num, tournament.number_end)}
                    </span>
                  ))}
                </div>
              </div>

              {/* CALCULATION BANNER */}
              <div className="bg-dark-card-elevated rounded-xl p-3.5 border border-dark-border-light flex justify-between items-center text-xs">
                <div>
                  <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Cálculo Total</span>
                  <span className="text-slate-300 font-bold">{selectedNumbers.length} x {formatarValor(tournament.number_price)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] text-gold-primary font-black uppercase tracking-widest">Valor Total</span>
                  <span className="text-xl font-black text-white">{formatarValor(totalPrice)}</span>
                </div>
              </div>

              {/* FIELDS */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                    Nick do Personagem <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      id="input-reserve-nick"
                      type="text"
                      required
                      placeholder="Ex: PlayerMaster"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-dark-card-elevated border border-dark-border rounded-lg text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                    Número para Contato <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      id="input-reserve-contact"
                      type="text"
                      required
                      placeholder="Ex: (82) 99999-9999"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-dark-card-elevated border border-dark-border rounded-lg text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                    Comprovante / Observações do Pix
                  </label>
                  <textarea
                    id="input-reserve-proof"
                    rows={2}
                    placeholder="Ex: Pix efetuado com chave aleatória."
                    value={proof}
                    onChange={(e) => setProof(e.target.value)}
                    className="w-full p-3 bg-dark-card-elevated border border-dark-border rounded-lg text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none resize-none"
                  ></textarea>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-500 font-bold">{errorMsg}</p>
              )}

              <button
                id="btn-reserve-submit"
                type="submit"
                className="w-full py-3 bg-gold-primary hover:bg-gold-dark text-black font-black uppercase tracking-wider text-xs rounded-lg transition-all shadow-md cursor-pointer glow-winner"
              >
                Concluir Reserva de Cotas
              </button>
            </form>
          )}
        </div>
      </div>

      {/* FOOTER DIALOG: DETAILS DIALOG FOR CLICKED NUMBER */}
      <AnimatePresence>
        {activeDetailsNumber && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-dark-border text-slate-300 space-y-6"
              id="number-details-modal"
            >
              <div className="flex items-center justify-between pb-3 border-b border-dark-border-light">
                <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Hash className="w-5 h-5 text-gold-primary" />
                  Detalhes da Cota {padronizarNumero(activeDetailsNumber.number, tournament.number_end)}
                </h3>
                <button
                  id="btn-close-details-modal"
                  onClick={() => setActiveDetailsNumber(null)}
                  className="p-1.5 bg-dark-card-elevated hover:bg-dark-border border border-dark-border-light rounded-full text-slate-300 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* CARD OF PARTICIPANT SENSITIVE DATA */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status do Número:</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    activeDetailsNumber.status === NumberStatus.Pago ? "bg-success-vibrant/15 text-success-vibrant border-success-vibrant/20" :
                    activeDetailsNumber.status === NumberStatus.Reservado ? "bg-warning-vibrant/15 text-warning-vibrant border-warning-vibrant/20" :
                    "bg-dark-card-elevated text-slate-400 border-dark-border-light"
                  }`}>
                    {getStatusLabel(activeDetailsNumber.status, tournament.winner_number_id ? (tournament.winner_number_id === activeDetailsNumber.id || tournament.winner_number_id === String(activeDetailsNumber.number)) : false)}
                  </span>
                </div>

                <div className="p-4 bg-dark-card-elevated border border-dark-border-light rounded-2xl space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-gold-primary mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nick do Personagem</span>
                      <span className="text-sm font-black text-white">{activeDetailsNumber.participant_nickname || "Anônimo"}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-gold-primary mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Número para Contato</span>
                      {isAdminView ? (
                        <span className="text-sm font-bold text-white font-mono">
                          {activeDetailsNumber.participant_contact || "-"}
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-slate-500 font-mono tracking-widest">
                          (••) •••••-•••• <span className="text-[9px] font-normal text-slate-500 font-sans tracking-normal uppercase">(Admin apenas)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {activeDetailsNumber.reserved_at && (
                    <div className="flex items-start gap-2.5">
                      <Calendar className="w-4 h-4 text-gold-primary mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Data da Reserva</span>
                        <span className="text-xs text-slate-300 font-bold font-mono">
                          {formatarDataHora(activeDetailsNumber.reserved_at)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* SENSITIVE SECURITY WARNING */}
                {!isAdminView && (
                  <div className="p-3 bg-[#3d5afe]/10 border border-[#3d5afe]/20 text-slate-300 text-xs rounded-xl flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 mt-0.5 text-[#3d5afe] shrink-0" />
                    <span>Os contatos dos participantes são restritos para visualização exclusiva do administrador do sorteio.</span>
                  </div>
                )}

                {/* ADMINISTRATOR ADMINISTRATIVE CONTROLS */}
                {isAdminView && (
                  <div className="pt-4 border-t border-dark-border-light space-y-3">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Ações do Administrador:</p>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      {activeDetailsNumber.status === NumberStatus.Reservado && (
                        <button
                          id="btn-confirm-payment-direct"
                          onClick={() => {
                            onConfirmPaymentDirectly(activeDetailsNumber.id);
                            setActiveDetailsNumber(null);
                          }}
                          className="py-2 px-3 bg-success-vibrant hover:bg-success-vibrant/95 text-black rounded-lg text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Confirmar Pix
                        </button>
                      )}

                      {activeDetailsNumber.status !== NumberStatus.Disponivel && (
                        <button
                          id="btn-cancel-reservation-direct"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja cancelar esta reserva? O número voltará a ficar disponível.")) {
                              onCancelReservationDirectly(activeDetailsNumber.id);
                              setActiveDetailsNumber(null);
                            }
                          }}
                          className="py-2 px-3 bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-900 rounded-lg text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  id="btn-close-details-modal-footer"
                  onClick={() => setActiveDetailsNumber(null)}
                  className="px-4 py-2 bg-dark-card-elevated hover:bg-dark-border text-white border border-dark-border-light rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
