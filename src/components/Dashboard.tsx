/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Tournament, TournamentNumber, Participant, Payment, TournamentStatus } from "../types";
import { formatarValor, formatarData, formatarDataHora } from "../utils";
import { Trophy, Coins, Users, Hash, Calendar, ShieldCheck, TrendingUp, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  tournament: Tournament | null;
  numbers: TournamentNumber[];
  participants: Participant[];
  payments: Payment[];
  onTabChange: (tab: string) => void;
}

export default function Dashboard({
  tournament,
  numbers,
  participants,
  payments,
  onTabChange,
}: DashboardProps) {
  if (!tournament) {
    return (
      <div id="no-active-tournament" className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl shadow-xs border border-slate-100 max-w-lg mx-auto mt-8">
        <AlertCircle className="w-16 h-16 text-amber-500 mb-4 animate-bounce" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum Torneio Ativo</h3>
        <p className="text-slate-500 text-sm mb-6">
          Para começar a gerenciar o sorteio, você precisa cadastrar um torneio primeiro.
        </p>
        <button
          id="btn-create-tournament-dash"
          onClick={() => onTabChange("tournament-config")}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-xs"
        >
          Criar Novo Torneio
        </button>
      </div>
    );
  }

  // Calculate metrics based on state
  const totalNumbers = numbers.length;
  const availableNumbers = numbers.filter((n) => n.status === "Disponível").length;
  const reservedNumbers = numbers.filter((n) => n.status === "Reservado").length;
  const paidNumbers = numbers.filter((n) => n.status === "Pago").length;
  const blockedNumbers = numbers.filter((n) => n.status === "Bloqueado").length;

  // Financial calculations
  // Valor aguardando pagamento = sum of expected_amount for pending payments
  const awaitingPaymentAmount = payments
    .filter((p) => p.status === "Pendente")
    .reduce((sum, p) => sum + p.expected_amount, 0);

  // Montante confirmado = paidNumbers * tournament.number_price
  const confirmedAmount = paidNumbers * tournament.number_price;
  const prizeAmount = confirmedAmount; // prize is 100% of confirmed amount
  const maxPossibleAmount = totalNumbers * tournament.number_price;

  // Participant calculations
  const totalParticipants = participants.length;
  
  // Average numbers per participant
  const totalNumbersSold = paidNumbers + reservedNumbers;
  const averageNumbersPerParticipant = totalParticipants > 0 
    ? (totalNumbersSold / totalParticipants).toFixed(1)
    : "0.0";

  // Top buyer
  // Group numbers by participant_id to find who bought the most
  const buyerCounts: Record<string, { nickname: string; count: number }> = {};
  numbers.forEach((num) => {
    if (num.participant_id) {
      if (!buyerCounts[num.participant_id]) {
        buyerCounts[num.participant_id] = {
          nickname: num.participant_nickname || "Participante",
          count: 0,
        };
      }
      // Count reserved or paid numbers as "bought" for metrics
      if (num.status === "Pago" || num.status === "Reservado") {
        buyerCounts[num.participant_id].count += 1;
      }
    }
  });

  let topBuyerName = "-";
  let topBuyerCount = 0;
  Object.values(buyerCounts).forEach((buyer) => {
    if (buyer.count > topBuyerCount) {
      topBuyerCount = buyer.count;
      topBuyerName = buyer.nickname;
    }
  });

  // Calculate percentages
  const paidPercentage = totalNumbers > 0 ? Math.round((paidNumbers / totalNumbers) * 100) : 0;
  const reservedPercentage = totalNumbers > 0 ? Math.round((reservedNumbers / totalNumbers) * 100) : 0;

  // Winner information
  const isFinalized = tournament.status === TournamentStatus.Finalizado;
  const winningNumObj = isFinalized && tournament.winner_number_id
    ? numbers.find((n) => String(n.number) === String(tournament.winner_number_id) || n.id === tournament.winner_number_id)
    : null;

  return (
    <div className="space-y-8" id="dashboard-view">
      
      {/* WINNER CELEBRATION BANNER */}
      {isFinalized && winningNumObj && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black rounded-3xl p-6 sm:p-8 shadow-2xl border border-amber-300 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
          id="dashboard-winner-celebration"
        >
          <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center gap-4 relative z-10">
            <span className="p-4 bg-black text-gold-primary rounded-2xl shadow-xl animate-bounce shrink-0">
              <Trophy className="w-8 h-8" />
            </span>
            <div>
              <span className="text-[10px] font-black tracking-widest text-black/80 uppercase bg-black/10 px-2.5 py-1 rounded-full border border-black/10">🏆 Sorteio Realizado</span>
              <h2 className="text-2xl font-black text-black mt-2 tracking-tight">O Grande Vencedor é {winningNumObj.participant_nickname}!</h2>
              <p className="text-xs text-black/80 mt-1 font-bold">Portador da cota de número <span className="font-mono text-sm bg-black text-white px-2 py-0.5 rounded-md font-black">#{winningNumObj.number}</span></p>
            </div>
          </div>
          <div className="text-center md:text-right relative z-10 bg-black/10 p-4 rounded-2xl border border-black/5 min-w-[200px] w-full md:w-auto">
            <span className="block text-[10px] font-black text-black/70 uppercase tracking-widest mb-1">Prêmio Total Recebido</span>
            <span className="text-3xl font-black text-black tracking-tighter">{formatarValor(confirmedAmount)}</span>
            <p className="text-[9px] font-bold text-black/60 mt-1 uppercase tracking-widest font-mono">100% Arrecadado Pago</p>
          </div>
        </motion.div>
      )}

      {/* 1. PRINCIPAL HIGHLIGHT BANNER (PRIZE DISPLAY) */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden prize-gradient text-black rounded-2xl p-8 shadow-xl glow-winner border-none"
        id="highlight-banner"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center divide-y md:divide-y-0 md:divide-x divide-black/10">
          
          {/* NÚMEROS PAGOS */}
          <div className="flex flex-col items-center md:items-start justify-center p-4" id="highlight-paid-numbers">
            <span className="text-[11px] font-black tracking-widest text-black/70 uppercase mb-2">
              COTAS CONFIRMADAS
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl sm:text-7xl font-black tracking-tighter leading-none text-black">
                {String(paidNumbers).padStart(3, '0')}
              </span>
              <span className="text-black/60 text-sm font-bold">
                / {tournament.is_infinite ? "∞" : totalNumbers}
              </span>
            </div>
            {!tournament.is_infinite ? (
              <div className="mt-4 w-full max-w-[180px] bg-black/10 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-black h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${paidPercentage}%` }}
                ></div>
              </div>
            ) : (
              <div className="mt-4 text-[10px] font-black uppercase text-black/60 font-mono tracking-widest">
                Grade Infinita Ativa
              </div>
            )}
          </div>

          {/* MONTANTE ARRECADADO */}
          <div className="flex flex-col items-center justify-center p-4 pt-6 md:pt-4" id="highlight-collected-amount">
            <span className="text-[11px] font-black tracking-widest text-black/70 uppercase mb-2">
              MONTANTE CONFIRMADO
            </span>
            <div className="flex items-center gap-2">
              <span className="text-6xl sm:text-7xl font-black tracking-tighter leading-none text-black">
                {formatarValor(confirmedAmount)}
              </span>
            </div>
            <p className="text-black/60 text-xs mt-2 font-mono uppercase tracking-wider font-bold">
              Seguro e Auditado
            </p>
          </div>

          {/* PRÊMIO ACUMULADO */}
          <div className="flex flex-col items-center md:items-end justify-center p-4 pt-6 md:pt-4" id="highlight-prize-pool">
            <span className="text-[11px] font-black tracking-widest text-black/70 uppercase mb-2">
              PRÊMIO ACUMULADO (100%)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-6xl sm:text-7xl font-black tracking-tighter leading-none text-black">
                {formatarValor(prizeAmount)}
              </span>
            </div>
            <p className="text-black/60 text-xs mt-2 font-bold uppercase tracking-wider">
              Vencedor Leva Tudo
            </p>
          </div>

        </div>
      </motion.div>

      {/* 2. ADMIN CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-cards-grid">
        
        {/* CARDS: TORNEIO ATUAL */}
        <div id="card-tournament-info" className="bg-dark-card rounded-2xl p-6 border border-dark-border shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 bg-gold-primary/10 text-gold-primary rounded-xl border border-gold-primary/20">
                <Trophy className="w-5 h-5" />
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                tournament.status === TournamentStatus.Aberto ? "bg-success-vibrant/10 text-success-vibrant border-success-vibrant/20 animate-pulse" :
                tournament.status === TournamentStatus.ProntoParaSorteio ? "bg-gold-primary/10 text-gold-primary border-gold-primary/20 font-black" :
                tournament.status === TournamentStatus.AguardandoPagamento ? "bg-warning-vibrant/10 text-warning-vibrant border-warning-vibrant/20" :
                tournament.status === TournamentStatus.Finalizado ? "bg-slate-800 text-slate-400 border-slate-700" :
                "bg-rose-950 text-rose-400 border-rose-900"
              }`}>
                {tournament.status}
              </span>
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Torneio Ativo</h4>
            <p className="text-xl font-black text-white line-clamp-1 mt-1.5">{tournament.name}</p>
          </div>
          <div className="mt-5 pt-4 border-t border-dark-border-light flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-mono font-bold">
              <Calendar className="w-3.5 h-3.5 text-gold-primary" />
              DRAW: {formatarData(tournament.draw_date)}
            </span>
            <button 
              onClick={() => onTabChange("tournament-config")}
              className="text-gold-primary hover:text-white font-bold transition-colors cursor-pointer uppercase tracking-wider text-[10px]"
            >
              Configurar
            </button>
          </div>
        </div>

        {/* CARDS: NÚMEROS */}
        <div id="card-numbers-info" className="bg-dark-card rounded-2xl p-6 border border-dark-border shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 bg-success-vibrant/10 text-success-vibrant rounded-xl border border-success-vibrant/20">
                <Hash className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black font-mono text-slate-300 bg-dark-card-elevated px-2.5 py-1 rounded-md border border-dark-border-light">
                RANGE: {tournament.is_infinite ? "1 a 999.999 (Infinita)" : `${tournament.number_start}-${tournament.number_end}`}
              </span>
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adesão das Cotas</h4>
            <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-center">
              {tournament.is_infinite ? (
                <>
                  <div className="bg-dark-card-elevated border border-dark-border-light p-2 rounded-lg">
                    <span className="block text-sm font-black text-slate-300">∞</span>
                    <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Disponível</span>
                  </div>
                  <div className="bg-warning-vibrant/10 border border-warning-vibrant/20 p-2 rounded-lg">
                    <span className="block text-sm font-black text-warning-vibrant">{reservedNumbers}</span>
                    <span className="text-[9px] text-warning-vibrant/80 block uppercase font-bold tracking-wider">Reserv</span>
                  </div>
                  <div className="bg-success-vibrant/10 border border-success-vibrant/20 p-2 rounded-lg animate-pulse">
                    <span className="block text-sm font-black text-success-vibrant">{paidNumbers}</span>
                    <span className="text-[9px] text-success-vibrant/80 block uppercase font-bold tracking-wider">Pago</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-dark-card-elevated border border-dark-border-light p-2 rounded-lg">
                    <span className="block text-sm font-black text-slate-300">{availableNumbers}</span>
                    <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Livre</span>
                  </div>
                  <div className="bg-warning-vibrant/10 border border-warning-vibrant/20 p-2 rounded-lg">
                    <span className="block text-sm font-black text-warning-vibrant">{reservedNumbers}</span>
                    <span className="text-[9px] text-warning-vibrant/80 block uppercase font-bold tracking-wider">Reserv</span>
                  </div>
                  <div className="bg-success-vibrant/10 border border-success-vibrant/20 p-2 rounded-lg animate-pulse">
                    <span className="block text-sm font-black text-success-vibrant">{paidNumbers}</span>
                    <span className="text-[9px] text-success-vibrant/80 block uppercase font-bold tracking-wider">Pago</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-dark-border-light flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-slate-300 text-[10px] uppercase tracking-wider">
              {tournament.is_infinite ? `Total Adquirido: ${numbers.length}` : `Total: ${totalNumbers} cotas`}
            </span>
            <button 
              onClick={() => onTabChange("numbers-grid")}
              className="text-gold-primary hover:text-white font-bold transition-colors cursor-pointer uppercase tracking-wider text-[10px]"
            >
              Ver Grade
            </button>
          </div>
        </div>

        {/* CARDS: FINANCEIRO */}
        <div id="card-financial-info" className="bg-dark-card rounded-2xl p-6 border border-dark-border shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 bg-warning-vibrant/10 text-warning-vibrant rounded-xl border border-warning-vibrant/20">
                <Coins className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black font-mono text-success-vibrant bg-success-vibrant/10 px-2.5 py-1 rounded-md border border-success-vibrant/20">
                COTA: {formatarValor(tournament.number_price)}
              </span>
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balanço Financeiro</h4>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Pendente (Reservado):</span>
                <span className="font-black text-warning-vibrant">{formatarValor(awaitingPaymentAmount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Confirmado (Ativo):</span>
                <span className="font-black text-success-vibrant">{formatarValor(confirmedAmount)}</span>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-dark-border-light flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">
              {tournament.is_infinite ? "MÁX: Sem Limite" : `MÁX: ${formatarValor(maxPossibleAmount)}`}
            </span>
            <button 
              onClick={() => onTabChange("participants")}
              className="text-gold-primary hover:text-white font-bold transition-colors cursor-pointer uppercase tracking-wider text-[10px]"
            >
              Aprovar Pix
            </button>
          </div>
        </div>

        {/* CARDS: PARTICIPANTES */}
        <div id="card-participants-info" className="bg-dark-card rounded-2xl p-6 border border-dark-border shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
                <Users className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black font-mono text-slate-300 bg-dark-card-elevated px-2.5 py-1 rounded-md border border-dark-border-light">
                MÉD: {averageNumbersPerParticipant}/P
              </span>
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Participantes</h4>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total Cadastrados:</span>
                <span className="font-black text-white">{totalParticipants}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Top Comprador:</span>
                <span className="font-black text-gold-primary truncate max-w-[100px]">{topBuyerName} ({topBuyerCount})</span>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-dark-border-light flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">COMPRADORES ATIVOS</span>
            <button 
              onClick={() => onTabChange("participants")}
              className="text-gold-primary hover:text-white font-bold transition-colors cursor-pointer uppercase tracking-wider text-[10px]"
            >
              Ver Lista
            </button>
          </div>
        </div>

      </div>

      {/* 3. QUICK ACTIONS & IMPORTANT NOTES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-extras">
        
        {/* REGRAS IMPORTANTES BANNER */}
        <div className="bg-dark-card rounded-2xl p-6 border border-dark-border lg:col-span-2">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
            <ShieldCheck className="w-5 h-5 text-gold-primary" />
            Regras de Negócio e Diretrizes de Operação
          </h3>
          <ul className="space-y-3 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="inline-block w-1.5 h-1.5 bg-gold-primary rounded-full mt-1.5 shrink-0"></span>
              <span>Cada cota tem o valor fixo inalterável de <strong className="text-white font-extrabold">100K</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="inline-block w-1.5 h-1.5 bg-gold-primary rounded-full mt-1.5 shrink-0"></span>
              <span>Não há limite de números por participante, desde que estejam disponíveis.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="inline-block w-1.5 h-1.5 bg-gold-primary rounded-full mt-1.5 shrink-0"></span>
              <span>O vencedor receberá o prêmio acumulado de <strong className="text-white font-extrabold">100% dos valores pagos e confirmados</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="inline-block w-1.5 h-1.5 bg-gold-primary rounded-full mt-1.5 shrink-0"></span>
              <span>Números apenas reservados (sem pagamento manual aprovado pelo administrador) <strong className="text-warning-vibrant font-extrabold">NÃO participam do sorteio</strong> e não integram a premiação.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="inline-block w-1.5 h-1.5 bg-gold-primary rounded-full mt-1.5 shrink-0"></span>
              <span>Após realizado o sorteio, o torneio é finalizado automaticamente e o resultado torna-se permanente e <strong className="text-danger-vibrant font-extrabold">completamente imutável</strong>.</span>
            </li>
          </ul>
        </div>

        {/* STATUS QUICK PROGRESS */}
        <div className="bg-dark-card rounded-2xl p-6 border border-dark-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-success-vibrant" />
              Progresso de Vendas
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              {tournament.is_infinite 
                ? "Estatísticas de adesão acumulada para o modo de grade infinita."
                : "Porcentagem de cotas reservadas e pagas em relação ao total do torneio."
              }
            </p>
            
            {tournament.is_infinite ? (
              <div className="space-y-4">
                <div className="p-4 bg-dark-card-elevated border border-dark-border-light rounded-xl text-center">
                  <span className="block text-[11px] font-black uppercase text-gold-primary tracking-widest mb-1 font-mono">MODO GRADE INFINITA ATIVO</span>
                  <span className="text-xs text-slate-300">
                    Os participantes criam e compram qualquer cota sob demanda de 1 a 999.999. Não há limites de estoque!
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-2.5 bg-success-vibrant/5 border border-success-vibrant/20 rounded-xl">
                    <span className="block text-lg font-black text-success-vibrant">{paidNumbers}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Confirmados</span>
                  </div>
                  <div className="p-2.5 bg-warning-vibrant/5 border border-warning-vibrant/20 rounded-xl">
                    <span className="block text-lg font-black text-warning-vibrant">{reservedNumbers}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Reservados</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-bold">Confirmadas ({paidNumbers})</span>
                    <span className="font-black text-success-vibrant font-mono">{paidPercentage}%</span>
                  </div>
                  <div className="w-full bg-dark-bg rounded-full h-2.5 overflow-hidden border border-dark-border-light">
                    <div 
                      className="bg-success-vibrant h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${paidPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-bold">Reservadas ({reservedNumbers})</span>
                    <span className="font-black text-warning-vibrant font-mono">{reservedPercentage}%</span>
                  </div>
                  <div className="w-full bg-dark-bg rounded-full h-2.5 overflow-hidden border border-dark-border-light">
                    <div 
                      className="bg-warning-vibrant h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${reservedPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-dark-border-light">
            <button
              onClick={() => onTabChange("numbers-grid")}
              className="w-full text-center py-2.5 bg-gold-primary hover:bg-gold-dark text-black rounded-lg text-xs font-black uppercase tracking-wider transition-colors cursor-pointer glow-winner"
            >
              Adquirir Mais Números
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
