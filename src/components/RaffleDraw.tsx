/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Tournament, TournamentNumber, Participant, DrawResult, TournamentStatus } from "../types";
import { formatarValor, padronizarNumero, formatarDataHora, gerarHash } from "../utils";
import { Trophy, ShieldAlert, AlertCircle, Play, CheckCircle2, Lock, Sparkles, User, Phone, Coins } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RaffleDrawProps {
  tournament: Tournament | null;
  numbers: TournamentNumber[];
  participants: Participant[];
  drawResult: DrawResult | null;
  onExecuteDraw: (result: DrawResult) => void;
  isAdmin?: boolean;
}

export default function RaffleDraw({
  tournament,
  numbers,
  participants,
  drawResult,
  onExecuteDraw,
  isAdmin,
}: RaffleDrawProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // Animation / Drawing States
  const [isDrawing, setIsDrawing] = useState(false);
  const [tickerNumber, setTickerNumber] = useState<number | null>(null);
  const [winnerAnimObj, setWinnerAnimObj] = useState<TournamentNumber | null>(null);

  if (!tournament) {
    return (
      <div className="p-8 text-center bg-dark-card rounded-2xl border border-dark-border max-w-md mx-auto shadow-md">
        <p className="text-slate-400 text-sm">Crie um torneio primeiro para realizar o sorteio.</p>
      </div>
    );
  }

  const paidNumbers = numbers.filter((n) => n.status === "Pago");
  const totalPaid = paidNumbers.length;
  const totalAmount = totalPaid * tournament.number_price;

  // Validation Flags
  const isValidStatus = tournament.status === TournamentStatus.Aberto || tournament.status === TournamentStatus.ProntoParaSorteio;
  const hasPaidNumbers = totalPaid > 0;
  const canDraw = isValidStatus && hasPaidNumbers && !drawResult && !isDrawing;

  // Run a spinning slot machine ticker during raffle drawing
  useEffect(() => {
    let intervalId: any;
    if (isDrawing && paidNumbers.length > 0) {
      let counter = 0;
      const spinSpeed = 80; // milliseconds
      
      intervalId = setInterval(() => {
        // Pick a random paid number from list
        const randIdx = Math.floor(Math.random() * paidNumbers.length);
        setTickerNumber(paidNumbers[randIdx].number);
        counter++;

        // Stop after 35 iterations (about 2.8 seconds)
        if (counter >= 35) {
          clearInterval(intervalId);
          finalizeDraw();
        }
      }, spinSpeed);
    }
    return () => clearInterval(intervalId);
  }, [isDrawing]);

  const handleDrawClick = () => {
    if (!canDraw) return;
    setIsConfirmOpen(true);
  };

  const handleConfirmDraw = () => {
    setIsConfirmOpen(false);
    setIsDrawing(true);
  };

  const finalizeDraw = () => {
    // 1. Pick absolute winner from paid numbers
    const finalWinnerIndex = Math.floor(Math.random() * paidNumbers.length);
    const winningNumObj = paidNumbers[finalWinnerIndex];
    
    // 2. Find participant
    const winnerParticipant = participants.find((p) => p.id === winningNumObj.participant_id);
    const winnerNick = winningNumObj.participant_nickname || winnerParticipant?.nickname || "Participante";
    const winnerContact = winningNumObj.participant_contact || winnerParticipant?.contact_number || "(00) 00000-0000";

    // 3. Count numbers bought by winner
    const winnerNumbersCount = numbers.filter(
      (n) => n.participant_id === winningNumObj.participant_id && (n.status === "Pago" || n.status === "Reservado")
    ).length;

    const winnerPaidCount = numbers.filter(
      (n) => n.participant_id === winningNumObj.participant_id && n.status === "Pago"
    ).length;

    const winnerInvestment = winnerPaidCount * tournament.number_price;

    // 4. Create Draw Result object
    const result: DrawResult = {
      id: `draw_${tournament.id}_${Date.now()}`,
      tournament_id: tournament.id,
      tournament_number_id: winningNumObj.id,
      participant_id: winningNumObj.participant_id,
      winning_number: winningNumObj.number,
      prize_amount: totalAmount,
      drawn_at: new Date().toISOString(),
      drawn_by: "Administrador",
      draw_hash: gerarHash(),
      created_at: new Date().toISOString(),
      winner_nickname: winnerNick,
      winner_contact: winnerContact,
      numbers_bought: winnerNumbersCount,
      winner_investment: winnerInvestment,
    };

    setTickerNumber(winningNumObj.number);
    setWinnerAnimObj(winningNumObj);
    setIsDrawing(false);

    // Call state update in parent
    onExecuteDraw(result);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8" id="raffle-draw-view">
      
      {/* 1. STATE-SPECIFIC INTERFACES */}

      {/* A. ACTIVE DRAWING PENDING SCREEN */}
      {!drawResult && !isDrawing && (
        <div className="bg-dark-card rounded-3xl border border-dark-border shadow-md overflow-hidden" id="draw-pending-panel">
          
          <div className="bg-dark-card-elevated text-white p-6 sm:p-8 relative overflow-hidden border-b border-dark-border">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-gold-primary rounded-full blur-2xl opacity-10"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="px-2.5 py-1 bg-gold-primary/10 border border-gold-primary/20 text-gold-primary text-[10px] font-black uppercase tracking-wider rounded-full">
                  Etapa Final
                </span>
                <h2 className="text-xl font-black text-white uppercase tracking-wider mt-2.5">{tournament.name}</h2>
                <p className="text-xs text-slate-400 mt-1">Realize a auditoria final de depósitos e faça o sorteio do prêmio.</p>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Prêmio Líquido</span>
                <span className="text-3xl font-black text-gold-primary font-mono">{formatarValor(totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* VALIDATION CHECKLIST */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Verificações de Segurança</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                {/* Rule 1: Tournament is open or ready */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isValidStatus ? "bg-success-vibrant/5 border-success-vibrant/20 text-slate-300" : "bg-danger-vibrant/5 border-danger-vibrant/20 text-slate-300"
                }`}>
                  {isValidStatus ? (
                    <CheckCircle2 className="w-5 h-5 text-success-vibrant shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-danger-vibrant shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="block text-xs font-black uppercase tracking-wider text-white">Status do Torneio</span>
                    <span className="text-[11px] text-slate-400 font-bold">
                      O torneio está {tournament.status}. (Requer: Aberto ou Pronto para sorteio)
                    </span>
                  </div>
                </div>

                {/* Rule 2: Has paid numbers */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  hasPaidNumbers ? "bg-success-vibrant/5 border-success-vibrant/20 text-slate-300" : "bg-danger-vibrant/5 border-danger-vibrant/20 text-slate-300"
                }`}>
                  {hasPaidNumbers ? (
                    <CheckCircle2 className="w-5 h-5 text-success-vibrant shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-danger-vibrant shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="block text-xs font-black uppercase tracking-wider text-white">Cotas Participantes</span>
                    <span className="text-[11px] text-slate-400 font-bold">
                      {totalPaid} número(s) com pagamento confirmado. (Requer: Mínimo 1 pago)
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* AUDIT SUMMARY BOX */}
            <div className="p-4 bg-dark-card-elevated rounded-2xl border border-dark-border flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
              <div className="space-y-1 text-center sm:text-left">
                <span className="font-black text-white uppercase tracking-wider block">Resumo do Concurso</span>
                <span className="text-slate-400 block font-bold">
                  Apenas os <strong className="text-gold-primary">{totalPaid} números pagos</strong> listados na grade participarão. Reservas pendentes e canceladas foram excluídas.
                </span>
              </div>
              <div className="flex gap-4 font-mono text-center shrink-0">
                <div className="bg-dark-card px-3 py-1.5 rounded-lg border border-dark-border shadow-md">
                  <span className="block text-[10px] text-slate-500 font-black uppercase">Números</span>
                  <span className="text-sm font-black text-gold-primary">{totalPaid}</span>
                </div>
                <div className="bg-dark-card px-3 py-1.5 rounded-lg border border-dark-border shadow-md">
                  <span className="block text-[10px] text-slate-500 font-black uppercase">Premiação</span>
                  <span className="text-sm font-black text-success-vibrant">{formatarValor(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* ACTION TRIGGER BUTTON */}
            <div className="pt-4 border-t border-dark-border-light text-center">
              {isAdmin ? (
                <>
                  <button
                    id="btn-trigger-raffle-draw"
                    disabled={!canDraw}
                    onClick={handleDrawClick}
                    className={`px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 mx-auto transition-all shadow-md cursor-pointer ${
                      canDraw 
                        ? "bg-gold-primary hover:bg-gold-dark text-black hover:scale-[1.02] glow-winner" 
                        : "bg-dark-card-elevated text-slate-600 cursor-not-allowed border border-dark-border shadow-none"
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Realizar Sorteio do Vencedor
                  </button>
                  
                  {!canDraw && (
                    <p className="text-[11px] text-danger-vibrant font-black uppercase tracking-wider mt-2.5 flex items-center justify-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      O sorteio está bloqueado. Certifique-se de que há cotas com pagamentos aprovados antes de tentar.
                    </p>
                  )}
                </>
              ) : (
                <div className="p-4 bg-dark-card-elevated border border-dark-border rounded-xl max-w-md mx-auto text-center space-y-1">
                  <span className="block text-xs font-black text-gold-primary uppercase tracking-widest font-mono">AGUARDANDO SORTEIO</span>
                  <p className="text-[11px] text-slate-300">
                    O sorteio será realizado ao vivo pelo administrador do torneio. Garanta suas cotas e boa sorte!
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* B. SUSPENSEFUL SPINNER EXPERIENCE */}
      {isDrawing && (
        <div className="bg-dark-card rounded-3xl p-12 text-center text-white border border-dark-border shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[350px]" id="drawing-spinner-panel">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08),transparent)] pointer-events-none"></div>
          
          <Sparkles className="w-10 h-10 text-gold-primary mb-6 animate-spin" />
          <h2 className="text-lg font-black tracking-widest text-gold-primary uppercase mb-2">Sorteando Número...</h2>
          <p className="text-xs text-slate-400 mb-8 max-w-sm font-bold uppercase tracking-wider">
            Escolhendo aleatoriamente uma das <strong className="text-gold-primary">{totalPaid} cotas pagas</strong> sob as regras criptográficas do torneio.
          </p>

          {/* SPINNING BADGE */}
          <div className="w-36 h-36 rounded-full bg-dark-card-elevated border-4 border-gold-primary/50 flex items-center justify-center shadow-lg shadow-gold-primary/20 mb-4 animate-bounce">
            <span className="text-5xl font-black font-mono tracking-tighter text-gold-primary">
              {tickerNumber ? padronizarNumero(tickerNumber, tournament.number_end) : "---"}
            </span>
          </div>
        </div>
      )}

      {/* C. GORGEOUS FINAL CELEBRATION WINNER CARD */}
      {drawResult && !isDrawing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-dark-card rounded-3xl border border-dark-border shadow-2xl overflow-hidden"
          id="draw-winner-panel"
        >
          
          {/* WINNER HEADER */}
          <div className="bg-gradient-to-r from-gold-primary/10 via-gold-primary/20 to-gold-primary/10 border-b border-dark-border text-white p-8 text-center relative overflow-hidden">
            {/* Sparks/confetti vectors */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent)] pointer-events-none"></div>
            
            <div className="w-20 h-20 bg-gold-primary text-black rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gold-primary/30 backdrop-blur-xs glow-winner">
              <Trophy className="w-10 h-10 text-black animate-bounce" />
            </div>

            <span className="text-xs font-black tracking-widest text-gold-primary uppercase block mb-1">
              CONCURSO FINALIZADO • SORTEIO REALIZADO
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase tracking-wider">NÚMERO VENCEDOR</h1>
            
            {/* BIG WINNING NUMBER */}
            <div className="mt-4 inline-block bg-dark-card text-gold-primary font-mono font-black text-6xl sm:text-7xl px-8 py-2 rounded-2xl shadow-xl shadow-gold-primary/10 border-2 border-gold-primary/50 glow-winner">
              {padronizarNumero(drawResult.winning_number, tournament.number_end)}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* WINNER DETAILS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* CARD: PARTICIPANTE VENCEDOR */}
              <div className="p-5 bg-gold-primary/5 rounded-2xl border border-gold-primary/20 space-y-4">
                <h3 className="text-xs font-black text-gold-primary uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  DADOS DO GANHADOR
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Nick do Personagem</span>
                    <span className="text-lg font-black text-white">{drawResult.winner_nickname}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Contato para Retirada</span>
                    <span className="text-base font-bold text-slate-200 font-mono flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-4 h-4 text-gold-primary" />
                      {drawResult.winner_contact}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD: STATS DO VENCEDOR */}
              <div className="p-5 bg-dark-card-elevated rounded-2xl border border-dark-border space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-gold-primary" />
                  DESEMPENHO NO CONCURSO
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-dark-border-light text-slate-300 font-bold">
                    <span className="text-slate-400 uppercase text-[10px]">Cotas compradas:</span>
                    <span className="font-black font-mono">{drawResult.numbers_bought} números</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-dark-border-light text-slate-300 font-bold">
                    <span className="text-slate-400 uppercase text-[10px]">Valor total investido:</span>
                    <span className="font-black font-mono">{formatarValor(drawResult.winner_investment)}</span>
                  </div>

                  <div className="flex justify-between py-1 text-success-vibrant font-black">
                    <span>Prêmio recebido:</span>
                    <span className="font-black text-base font-mono">{formatarValor(drawResult.prize_amount)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* SEED INFO / IMMUTABILITY BANNER */}
            <div className="p-4 bg-dark-card-elevated rounded-2xl border border-dark-border flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400 font-bold">
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-gold-primary" />
                <span>Auditoria Finalizada em: <strong className="text-white">{formatarDataHora(drawResult.drawn_at)}</strong></span>
              </span>
              <span className="font-mono text-[10px] bg-dark-card px-2.5 py-1 rounded-md text-slate-300 border border-dark-border">
                HASH: {drawResult.draw_hash}
              </span>
            </div>

          </div>

        </motion.div>
      )}

      {/* 2. CONFIRMATION SYSTEM (DIALOG MODAL) */}
      <AnimatePresence>
        {isConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-dark-border text-slate-300 space-y-6"
              id="confirm-draw-modal"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-dark-border-light text-warning-vibrant">
                <ShieldAlert className="w-8 h-8 shrink-0" />
                <h3 className="text-base font-black text-white uppercase tracking-wider">Confirmar Sorteio</h3>
              </div>

              <div className="space-y-4 text-xs font-bold">
                
                <p className="text-slate-300">
                  Tem certeza de que deseja realizar o sorteio?
                </p>

                <div className="p-4 bg-dark-card-elevated rounded-xl space-y-2 border border-dark-border">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400 font-semibold">Números participantes:</span>
                    <span className="font-bold font-mono text-indigo-400">{totalPaid}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400 font-semibold">Montante arrecadado:</span>
                    <span className="font-bold font-mono text-emerald-400">{formatarValor(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dark-border pt-2 text-sm text-gold-primary font-black">
                    <span>Prêmio do vencedor:</span>
                    <span className="font-mono">{formatarValor(totalAmount)}</span>
                  </div>
                </div>

                <p className="text-rose-400 font-semibold">
                  Esta ação não poderá ser desfeita. O torneio será encerrado e o resultado ficará gravado de forma permanente.
                </p>

              </div>

              <div className="flex gap-2.5 pt-4 border-t border-dark-border-light">
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(false)}
                  className="flex-1 py-2.5 bg-dark-card-elevated hover:bg-dark-border text-white border border-dark-border rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-execute-draw"
                  onClick={handleConfirmDraw}
                  className="flex-1 py-2.5 bg-gold-primary hover:bg-gold-dark text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.01] cursor-pointer glow-winner"
                >
                  Confirmar Sorteio!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
