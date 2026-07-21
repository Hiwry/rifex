/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { TournamentHistoryEntry } from "../types";
import { formatarValor, padronizarNumero, formatarDataHora } from "../utils";
import { Trophy, Calendar, Coins, Award, Hash, ListFilter, Users, Sparkles } from "lucide-react";

interface HistoryListProps {
  history: TournamentHistoryEntry[];
}

export default function HistoryList({ history }: HistoryListProps) {
  const totalTournaments = history.length;
  const totalPrizes = history.reduce((sum, item) => sum + item.prize_amount, 0);
  const totalAccumulated = history.reduce((sum, item) => sum + item.confirmed_amount, 0);

  return (
    <div className="space-y-6" id="tournament-history-view">
      
      {/* HEADER SECTION */}
      <div className="bg-dark-card p-6 rounded-3xl border border-dark-border shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold-primary animate-bounce" />
            Histórico de Sorteios
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Veja a lista de todos os torneios finalizados, seus respectivos vencedores, valores arrecadados e prêmios entregues.
          </p>
        </div>

        {/* SUMMARY METRICS */}
        <div className="flex flex-wrap gap-4">
          <div className="bg-dark-card-elevated px-4 py-2.5 rounded-2xl border border-dark-border-light text-center min-w-[100px]">
            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Sorteios Realizados</span>
            <span className="text-lg font-black text-white">{totalTournaments}</span>
          </div>
          <div className="bg-dark-card-elevated px-4 py-2.5 rounded-2xl border border-dark-border-light text-center min-w-[150px]">
            <span className="block text-[9px] font-black uppercase text-gold-primary tracking-wider">Total em Prêmios</span>
            <span className="text-lg font-black text-gold-primary">{formatarValor(totalPrizes)}</span>
          </div>
        </div>
      </div>

      {/* HISTORY TABLE / CARDS */}
      {history.length === 0 ? (
        <div className="py-16 text-center bg-dark-card rounded-3xl border border-dark-border max-w-md mx-auto shadow-md">
          <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-300">Nenhum sorteio finalizado no histórico.</p>
          <p className="text-xs text-slate-500 mt-1.5">Conclua o sorteio de um torneio ativo para que ele apareça aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {history.map((item) => (
            <div 
              key={item.id} 
              className="bg-dark-card border border-dark-border hover:border-gold-primary/30 rounded-3xl p-6 transition-all duration-300 relative overflow-hidden group shadow-md"
            >
              {/* Decorative Corner Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold-primary/5 rounded-full blur-3xl group-hover:bg-gold-primary/10 transition-colors duration-500"></div>

              {/* Tournament Meta Row */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-dark-border-light">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white group-hover:text-gold-primary transition-colors">
                      {item.name}
                    </h3>
                    {item.is_infinite && (
                      <span className="px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[8px] font-black uppercase rounded-full tracking-widest shrink-0">
                        Infinito
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {item.description || "Sem descrição disponível."}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Concluído em</span>
                  <span className="text-xs text-slate-300 font-bold font-mono flex items-center justify-end gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(item.finished_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>

              {/* Winner Details Card */}
              <div className="my-5 bg-dark-card-elevated border border-dark-border-light rounded-2xl p-4 flex items-center justify-between gap-4 relative">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gold-primary/10 border border-gold-primary/20 text-gold-primary rounded-xl shrink-0 shadow-sm">
                    <Trophy className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Ganhador do Sorteio</span>
                    <span className="text-sm font-black text-white">
                      {item.winner_nickname || "Não Identificado"}
                    </span>
                    {item.winner_contact && (
                      <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                        {item.winner_contact}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-gold-primary">Nº Sorteado</span>
                  <span className="text-xl font-black text-gold-primary font-mono tracking-tight flex items-center justify-end gap-1">
                    <Hash className="w-4 h-4 text-gold-primary" />
                    {padronizarNumero(item.winning_number || 0, item.is_infinite ? 999999 : 100)}
                  </span>
                </div>
              </div>

              {/* Values Info Grid */}
              <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                <div className="p-3 bg-dark-card-elevated/40 border border-dark-border-light/50 rounded-xl">
                  <span className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Valor Arrecadado</span>
                  <span className="font-bold text-slate-300 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-slate-400" />
                    {formatarValor(item.confirmed_amount)}
                  </span>
                </div>
                <div className="p-3 bg-dark-card-elevated/40 border border-dark-border-light/50 rounded-xl">
                  <span className="block text-[9px] font-black uppercase text-gold-primary tracking-wider mb-1">Prêmio Pago</span>
                  <span className="font-black text-gold-primary flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-gold-primary" />
                    {formatarValor(item.prize_amount)}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
