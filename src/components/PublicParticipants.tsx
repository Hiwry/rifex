/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Participant, TournamentNumber, NumberStatus, Tournament } from "../types";
import { formatarValor, padronizarNumero } from "../utils";
import { Search, Users, Award, ShieldAlert, Coins, Ticket } from "lucide-react";
import { motion } from "motion/react";

interface PublicParticipantsProps {
  tournament: Tournament | null;
  participants: Participant[];
  numbers: TournamentNumber[];
  isAdmin: boolean;
}

export default function PublicParticipants({
  tournament,
  participants,
  numbers,
  isAdmin,
}: PublicParticipantsProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!tournament) {
    return (
      <div className="p-8 text-center bg-dark-card rounded-2xl border border-dark-border max-w-md mx-auto shadow-md">
        <p className="text-slate-400 text-sm">Crie um torneio primeiro para visualizar candidatos e doações.</p>
      </div>
    );
  }

  // Find numbers owned by a participant
  const getParticipantNumbers = (pId: string) => {
    return numbers.filter((n) => n.participant_id === pId);
  };

  // Mask contact number for privacy of non-admins
  const formatContactNumber = (contact: string) => {
    if (isAdmin) return contact;
    // Mask contact for public view, e.g. "999******88" or similar
    const clean = contact.trim();
    if (clean.length <= 4) return "****";
    return clean.slice(0, 3) + "****" + clean.slice(-3);
  };

  // Filter participants based on search
  const filteredParticipants = participants.filter((p) => {
    const pNumbers = getParticipantNumbers(p.id);
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    // Search by nickname
    if (p.nickname.toLowerCase().includes(query)) return true;

    // Search by number owned
    const isNumberOwned = pNumbers.some((n) => {
      const padNum = padronizarNumero(n.number, tournament.number_end);
      return String(n.number) === query || padNum === query;
    });
    if (isNumberOwned) return true;

    return false;
  });

  // Global calculations for widgets
  const totalParticipants = participants.length;
  const paidNumbersCount = numbers.filter((n) => n.status === NumberStatus.Pago).length;
  const reservedNumbersCount = numbers.filter((n) => n.status === NumberStatus.Reservado).length;
  const totalDonations = paidNumbersCount * tournament.number_price;

  return (
    <div className="space-y-6" id="public-participants-view">
      
      {/* 1. METRICS BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="public-participants-metrics">
        
        {/* Total Participants */}
        <div className="bg-dark-card p-5 rounded-2xl border border-dark-border flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Total de Candidatos</span>
            <span className="text-xl font-black text-white font-mono">{totalParticipants}</span>
          </div>
        </div>

        {/* Paid Numbers (Cotadas) */}
        <div className="bg-dark-card p-5 rounded-2xl border border-dark-border flex items-center gap-4">
          <div className="p-3 bg-success-vibrant/10 text-success-vibrant rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Números Confirmados</span>
            <span className="text-xl font-black text-white font-mono">{paidNumbersCount}</span>
          </div>
        </div>

        {/* Reserved Numbers (Pending) */}
        <div className="bg-dark-card p-5 rounded-2xl border border-dark-border flex items-center gap-4">
          <div className="p-3 bg-warning-vibrant/10 text-warning-vibrant rounded-xl">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Reservas Pendentes</span>
            <span className="text-xl font-black text-white font-mono">{reservedNumbersCount}</span>
          </div>
        </div>

        {/* Total Donations */}
        <div className="bg-dark-card p-5 rounded-2xl border border-dark-border flex items-center gap-4">
          <div className="p-3 bg-gold-primary/10 text-gold-primary rounded-xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Total Arrecadado</span>
            <span className="text-xl font-black text-gold-primary font-mono">{formatarValor(totalDonations)}</span>
          </div>
        </div>

      </div>

      {/* 2. FILTER & SEARCH BLOCK */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-dark-card p-4 rounded-2xl border border-dark-border shadow-md">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            id="input-search-public-participants"
            type="text"
            placeholder="Buscar candidato por Nick ou Número (Ex: 027)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
          />
        </div>
      </div>

      {/* 3. PARTICIPANTS LIST TABLE */}
      <div className="bg-dark-card rounded-3xl border border-dark-border shadow-md overflow-hidden">
        {filteredParticipants.length === 0 ? (
          <div className="p-16 text-center text-slate-500" id="empty-public-participants-state">
            <Users className="w-12 h-12 mx-auto text-slate-600 mb-3 animate-pulse" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-wider">Nenhum candidato encontrado.</p>
            <p className="text-xs text-slate-500 mt-1">Nenhum registro corresponde aos filtros inseridos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="public-participants-table">
              <thead>
                <tr className="bg-dark-card-elevated border-b border-dark-border-light text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6">Nick / Personagem</th>
                  <th className="py-4 px-6">Contato</th>
                  <th className="py-4 px-6">Números Reservados / Comprados</th>
                  <th className="py-4 px-6">Doação Confirmada (Pago)</th>
                  <th className="py-4 px-6">Doação Pendente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border-light text-xs text-slate-300">
                {filteredParticipants.map((p) => {
                  const pNumbers = getParticipantNumbers(p.id);
                  const paidNums = pNumbers.filter((n) => n.status === NumberStatus.Pago);
                  const reservedNums = pNumbers.filter((n) => n.status === NumberStatus.Reservado);

                  const totalPaidAmount = paidNums.length * tournament.number_price;
                  const totalPendingAmount = reservedNums.length * tournament.number_price;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors" id={`row-public-participant-${p.nickname}`}>
                      {/* Nickname */}
                      <td className="py-4 px-6 font-black text-white">
                        <div className="flex flex-col">
                          <span className="text-sm">{p.nickname}</span>
                          {p.notes && <span className="text-[10px] text-slate-400 font-normal italic mt-0.5">{p.notes}</span>}
                        </div>
                      </td>

                      {/* Contact (Masked if not Admin) */}
                      <td className="py-4 px-6 font-mono font-bold text-slate-400">
                        {formatContactNumber(p.contact_number)}
                      </td>

                      {/* Numbers badges */}
                      <td className="py-4 px-6">
                        {pNumbers.length === 0 ? (
                          <span className="text-slate-500 italic text-[11px]">Nenhum número adquirido</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                            {pNumbers.map((num) => (
                              <span
                                key={num.id}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black border ${
                                  num.status === NumberStatus.Pago
                                    ? "bg-success-vibrant/15 text-success-vibrant border-success-vibrant/20"
                                    : "bg-warning-vibrant/15 text-warning-vibrant border-warning-vibrant/20"
                                }`}
                                title={num.status}
                              >
                                {padronizarNumero(num.number, tournament.number_end)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Paid donation */}
                      <td className="py-4 px-6 font-black text-success-vibrant font-mono text-sm">
                        {totalPaidAmount > 0 ? formatarValor(totalPaidAmount) : "-"}
                      </td>

                      {/* Pending donation */}
                      <td className="py-4 px-6 font-black text-warning-vibrant font-mono text-sm">
                        {totalPendingAmount > 0 ? formatarValor(totalPendingAmount) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
