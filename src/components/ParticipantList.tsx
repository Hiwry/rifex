/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Participant, TournamentNumber, Payment, NumberStatus, PaymentStatus, Tournament } from "../types";
import { formatarValor, padronizarNumero, formatarData } from "../utils";
import { Search, Plus, Trash2, Edit3, CheckCircle2, XCircle, Eye, AlertCircle, Phone, User, MessageSquare, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ParticipantListProps {
  tournament: Tournament | null;
  participants: Participant[];
  numbers: TournamentNumber[];
  onAddParticipant: (nickname: string, contactNumber: string, notes?: string) => void;
  onUpdateParticipant: (id: string, nickname: string, contactNumber: string, notes?: string) => void;
  onDeleteParticipant: (id: string) => void;
  onConfirmAllPaymentsOfParticipant: (participantId: string) => void;
  onCancelAllReservationsOfParticipant: (participantId: string) => void;
  onAddNumberToParticipantDirectly: (participantId: string, numbers: number[]) => void;
  onApproveNumbersOfParticipant: (participantId: string, numbersToApprove: number[], numbersToRelease: number[]) => void;
}

export default function ParticipantList({
  tournament,
  participants,
  numbers,
  onAddParticipant,
  onUpdateParticipant,
  onDeleteParticipant,
  onConfirmAllPaymentsOfParticipant,
  onCancelAllReservationsOfParticipant,
  onAddNumberToParticipantDirectly,
  onApproveNumbersOfParticipant,
}: ParticipantListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals / dialogs state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [viewingParticipant, setViewingParticipant] = useState<Participant | null>(null);
  const [addingNumbersToParticipant, setAddingNumbersToParticipant] = useState<Participant | null>(null);
  const [approvingParticipant, setApprovingParticipant] = useState<Participant | null>(null);
  const [selectedApprovalNums, setSelectedApprovalNums] = useState<number[]>([]);

  // Form states
  const [nickForm, setNickForm] = useState("");
  const [contactForm, setContactForm] = useState("");
  const [notesForm, setNotesForm] = useState("");
  const [newNumbersStr, setNewNumbersStr] = useState("");

  if (!tournament) {
    return (
      <div className="p-8 text-center bg-dark-card rounded-2xl border border-dark-border max-w-md mx-auto shadow-md">
        <p className="text-slate-400 text-sm">Crie um torneio primeiro para cadastrar participantes.</p>
      </div>
    );
  }

  // Find numbers owned by a participant
  const getParticipantNumbers = (pId: string) => {
    return numbers.filter((n) => n.participant_id === pId);
  };

  // Check overall payment status for participant
  const getParticipantPaymentStatus = (pId: string, pNumbers: TournamentNumber[]) => {
    if (pNumbers.length === 0) return "Sem números";
    const hasPending = pNumbers.some((n) => n.status === NumberStatus.Reservado);
    const hasPaid = pNumbers.some((n) => n.status === NumberStatus.Pago);

    if (hasPending && hasPaid) return "Parcialmente Pago";
    if (hasPending) return "Aguardando Pagamento";
    if (hasPaid) return "Pago";
    return "Nenhum";
  };

  // Filter participants based on search query (nick, contact, or specific number owned)
  const filteredParticipants = participants.filter((p) => {
    const pNumbers = getParticipantNumbers(p.id);
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    // Search by nickname
    if (p.nickname.toLowerCase().includes(query)) return true;
    
    // Search by contact
    if (p.contact_number.includes(query)) return true;

    // Search by number owned (e.g. user typed "27")
    const isNumberOwned = pNumbers.some((n) => {
      const padNum = padronizarNumero(n.number, tournament.number_end);
      return String(n.number) === query || padNum === query;
    });
    if (isNumberOwned) return true;

    return false;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickForm.trim() || !contactForm.trim()) {
      alert("Nick e Contato são obrigatórios!");
      return;
    }

    // Check if nickname already exists
    const nickExists = participants.some((p) => p.nickname.toLowerCase() === nickForm.trim().toLowerCase());
    if (nickExists) {
      alert("Erro: Este Nick já está cadastrado no sistema!");
      return;
    }

    onAddParticipant(nickForm.trim(), contactForm.trim(), notesForm.trim());
    setIsAddOpen(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    if (!nickForm.trim() || !contactForm.trim()) {
      alert("Nick e Contato são obrigatórios!");
      return;
    }

    // Check if new nickname already exists (excluding current)
    const nickExists = participants.some((p) => p.id !== editingParticipant.id && p.nickname.toLowerCase() === nickForm.trim().toLowerCase());
    if (nickExists) {
      alert("Erro: Este Nick já está sendo usado por outro participante!");
      return;
    }

    onUpdateParticipant(editingParticipant.id, nickForm.trim(), contactForm.trim(), notesForm.trim());
    setEditingParticipant(null);
    resetForm();
  };

  const handleAddNumbersSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingNumbersToParticipant) return;
    
    // Parse input string of numbers, e.g. "5, 12, 45"
    const minVal = tournament.is_infinite ? 1 : tournament.number_start;
    const maxVal = tournament.is_infinite ? 999999 : tournament.number_end;
    const inputNumbers = newNumbersStr
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n >= minVal && n <= maxVal);

    if (inputNumbers.length === 0) {
      alert("Por favor, digite números válidos dentro do range do torneio!");
      return;
    }

    // Check availability of each requested number
    const unavailable: number[] = [];
    inputNumbers.forEach((num) => {
      const match = numbers.find((n) => n.number === num);
      if (match && match.status !== NumberStatus.Disponivel) {
        unavailable.push(num);
      }
    });

    if (unavailable.length > 0) {
      alert(`Os seguintes números estão indisponíveis: ${unavailable.join(", ")}`);
      return;
    }

    // Success!
    onAddNumberToParticipantDirectly(addingNumbersToParticipant.id, inputNumbers);
    setAddingNumbersToParticipant(null);
    setNewNumbersStr("");
  };

  const resetForm = () => {
    setNickForm("");
    setContactForm("");
    setNotesForm("");
  };

  const openAddModal = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEditModal = (p: Participant) => {
    setNickForm(p.nickname);
    setContactForm(p.contact_number);
    setNotesForm(p.notes || "");
    setEditingParticipant(p);
  };

  const openAddNumbersModal = (p: Participant) => {
    setNewNumbersStr("");
    setAddingNumbersToParticipant(p);
  };

  const openApprovalModal = (p: Participant) => {
    const pNumbers = getParticipantNumbers(p.id);
    const activeNums = pNumbers
      .filter((n) => n.status === NumberStatus.Reservado || n.status === NumberStatus.Pago)
      .map((n) => n.number);
    setSelectedApprovalNums(activeNums);
    setApprovingParticipant(p);
  };

  return (
    <div className="space-y-6" id="participants-view">
      
      {/* 1. FILTER & ADD BUTTON */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-dark-card p-4 rounded-2xl border border-dark-border shadow-md">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            id="input-search-participants"
            type="text"
            placeholder="Buscar por Nick, Contato ou Número (Ex: 027)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
          />
        </div>

        {/* Add Participant Button */}
        <button
          id="btn-add-participant-trigger"
          onClick={openAddModal}
          className="w-full sm:w-auto px-5 py-2.5 bg-gold-primary hover:bg-gold-dark text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer glow-winner"
        >
          <Plus className="w-4 h-4" />
          Novo Participante
        </button>
      </div>

      {/* 2. TABLE AND CARDS CONTAINER */}
      <div className="bg-dark-card rounded-3xl border border-dark-border shadow-md overflow-hidden">
        
        {filteredParticipants.length === 0 ? (
          <div className="p-16 text-center text-slate-500" id="empty-participants-state">
            <User className="w-12 h-12 mx-auto text-slate-600 mb-3 animate-pulse" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-wider">Nenhum participante encontrado.</p>
            <p className="text-xs text-slate-500 mt-1">Experimente buscar por outros termos ou cadastre um novo jogador.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="participants-table">
              <thead>
                <tr className="bg-dark-card-elevated border-b border-dark-border-light text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6">Nick / Personagem</th>
                  <th className="py-4 px-6">Contato</th>
                  <th className="py-4 px-6">Números Reservados</th>
                  <th className="py-4 px-6">Total Investido</th>
                  <th className="py-4 px-6">Status Financeiro</th>
                  <th className="py-4 px-6">Cadastro</th>
                  <th className="py-4 px-6 text-right">Ações Administrador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border-light text-xs text-slate-300">
                {filteredParticipants.map((p) => {
                  const pNumbers = getParticipantNumbers(p.id);
                  const payStatus = getParticipantPaymentStatus(p.id, pNumbers);
                  
                  // Total price calculations
                  const reservedCount = pNumbers.filter(n => n.status === NumberStatus.Reservado).length;
                  const paidCount = pNumbers.filter(n => n.status === NumberStatus.Pago).length;
                  const totalInvested = paidCount * tournament.number_price;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors" id={`row-participant-${p.nickname}`}>
                      
                      {/* NICK */}
                      <td className="py-4 px-6 font-black text-white">
                        <div className="flex flex-col">
                          <span className="text-sm">{p.nickname}</span>
                          {p.notes && <span className="text-[10px] text-slate-400 font-normal line-clamp-1 italic mt-0.5">{p.notes}</span>}
                        </div>
                      </td>

                      {/* CONTACT */}
                      <td className="py-4 px-6 font-mono font-bold text-slate-300">
                        {p.contact_number}
                      </td>

                      {/* NUMBERS */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1.5 max-w-[220px]">
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
                            Totais: {pNumbers.length} ({paidCount} pagos, {reservedCount} resv)
                          </div>
                          
                          {pNumbers.length === 0 ? (
                            <span className="text-slate-500 italic text-[11px]">Nenhum número</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                              {pNumbers.map((num) => (
                                <span 
                                  key={num.id}
                                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black border ${
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
                        </div>
                      </td>

                      {/* TOTAL INVESTED */}
                      <td className="py-4 px-6 font-black text-white font-mono">
                        {formatarValor(totalInvested)}
                        {reservedCount > 0 && (
                          <span className="block text-[10px] text-warning-vibrant font-bold mt-0.5">
                            + {formatarValor(reservedCount * tournament.number_price)} pendente
                          </span>
                        )}
                      </td>

                      {/* FINANCE STATUS */}
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          payStatus === "Pago" ? "bg-success-vibrant/15 text-success-vibrant border-success-vibrant/20" :
                          payStatus === "Aguardando Pagamento" ? "bg-warning-vibrant/15 text-warning-vibrant border-warning-vibrant/20" :
                          payStatus === "Parcialmente Pago" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                          "bg-dark-card-elevated text-slate-400 border-dark-border-light"
                        }`}>
                          {payStatus}
                        </span>
                      </td>

                      {/* REGISTRATION */}
                      <td className="py-4 px-6 text-slate-400 font-bold font-mono">
                        {formatarData(p.created_at)}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end items-center gap-1">
                          {/* Add numbers button */}
                          <button
                            id={`btn-add-numbers-p-${p.nickname}`}
                            onClick={() => openAddNumbersModal(p)}
                            title="Adicionar Números"
                            className="p-1.5 hover:bg-gold-primary/10 text-gold-primary rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gold-primary/20"
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          {/* Quick confirm all payments */}
                          {reservedCount > 0 && (
                            <button
                              id={`btn-confirm-all-pay-p-${p.nickname}`}
                              onClick={() => openApprovalModal(p)}
                              title="Aprovar / Ajustar Reservas"
                              className="p-1.5 hover:bg-success-vibrant/10 text-success-vibrant rounded-lg transition-colors cursor-pointer border border-transparent hover:border-success-vibrant/20"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Release reservations */}
                          {reservedCount > 0 && (
                            <button
                              id={`btn-cancel-reserv-p-${p.nickname}`}
                              onClick={() => {
                                if (confirm(`Cancelar todas as reservas pendentes de ${p.nickname}? Os números serão liberados.`)) {
                                  onCancelAllReservationsOfParticipant(p.id);
                                }
                              }}
                              title="Cancelar reservas"
                              className="p-1.5 hover:bg-rose-950 text-rose-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-900"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* View notes */}
                          <button
                            id={`btn-view-notes-p-${p.nickname}`}
                            onClick={() => setViewingParticipant(p)}
                            title="Visualizar observações"
                            className="p-1.5 hover:bg-dark-card-elevated text-slate-300 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-dark-border"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit info */}
                          <button
                            id={`btn-edit-p-${p.nickname}`}
                            onClick={() => openEditModal(p)}
                            title="Editar Participante"
                            className="p-1.5 hover:bg-warning-vibrant/10 text-warning-vibrant rounded-lg transition-colors cursor-pointer border border-transparent hover:border-warning-vibrant/20"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete participant */}
                          <button
                            id={`btn-delete-p-${p.nickname}`}
                            onClick={() => {
                              if (pNumbers.length > 0) {
                                alert("Não é possível excluir um participante que já possui cotas compradas ou reservadas! Cancele as reservas primeiro.");
                                return;
                              }
                              if (confirm(`Excluir definitivamente o cadastro de ${p.nickname}?`)) {
                                onDeleteParticipant(p.id);
                              }
                            }}
                            title="Excluir cadastro"
                            className="p-1.5 hover:bg-rose-950 text-rose-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. MODALS SYSTEM */}
      <AnimatePresence>
        
        {/* ADD PARTICIPANT MODAL */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-dark-border text-slate-300 space-y-6"
              id="add-participant-modal"
            >
              <div className="flex items-center justify-between pb-3 border-b border-dark-border-light">
                <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <User className="w-5 h-5 text-gold-primary" />
                  Cadastrar Novo Participante
                </h3>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="p-1.5 bg-dark-card-elevated hover:bg-dark-border border border-dark-border-light rounded-full text-slate-300 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4" id="form-add-participant">
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                    Nick do Personagem <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-add-p-nick"
                    type="text"
                    required
                    placeholder="Ex: PlayerMaster"
                    value={nickForm}
                    onChange={(e) => setNickForm(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-card-elevated border border-dark-border rounded-lg text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                    Número para Contato <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-add-p-contact"
                    type="text"
                    required
                    placeholder="Ex: (82) 99999-9999"
                    value={contactForm}
                    onChange={(e) => setContactForm(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-card-elevated border border-dark-border rounded-lg text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">Observações do Jogador</label>
                  <textarea
                    id="input-add-p-notes"
                    rows={3}
                    placeholder="Alguma nota sobre o participante, guilda, etc."
                    value={notesForm}
                    onChange={(e) => setNotesForm(e.target.value)}
                    className="w-full p-3 bg-dark-card-elevated border border-dark-border rounded-lg text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none resize-none"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-dark-border-light">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 bg-dark-card-elevated hover:bg-dark-border text-white border border-dark-border-light rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-add-p-submit"
                    type="submit"
                    className="px-4 py-2 bg-gold-primary hover:bg-gold-dark text-black rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer glow-winner"
                  >
                    Salvar Cadastro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* EDIT PARTICIPANT MODAL */}
        {editingParticipant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-dark-border text-slate-300 space-y-6"
              id="edit-participant-modal"
            >
              <div className="flex items-center justify-between pb-3 border-b border-dark-border-light">
                <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Edit3 className="w-5 h-5 text-gold-primary" />
                  Editar Cadastro de {editingParticipant.nickname}
                </h3>
                <button
                  onClick={() => setEditingParticipant(null)}
                  className="p-1.5 bg-dark-card-elevated hover:bg-dark-border border border-dark-border-light rounded-full text-slate-300 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4" id="form-edit-participant">
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                    Nick do Personagem <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-edit-p-nick"
                    type="text"
                    required
                    placeholder="Ex: PlayerMaster"
                    value={nickForm}
                    onChange={(e) => setNickForm(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-card-elevated border border-dark-border rounded-lg text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                    Número para Contato <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-edit-p-contact"
                    type="text"
                    required
                    placeholder="Ex: (82) 99999-9999"
                    value={contactForm}
                    onChange={(e) => setContactForm(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-card-elevated border border-dark-border rounded-lg text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">Observações do Jogador</label>
                  <textarea
                    id="input-edit-p-notes"
                    rows={3}
                    placeholder="Alguma nota sobre o participante"
                    value={notesForm}
                    onChange={(e) => setNotesForm(e.target.value)}
                    className="w-full p-3 bg-dark-card-elevated border border-dark-border rounded-lg text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none resize-none"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-dark-border-light">
                  <button
                    type="button"
                    onClick={() => setEditingParticipant(null)}
                    className="px-4 py-2 bg-dark-card-elevated hover:bg-dark-border text-white border border-dark-border-light rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-edit-p-submit"
                    type="submit"
                    className="px-4 py-2 bg-gold-primary hover:bg-gold-dark text-black rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer glow-winner"
                  >
                    Confirmar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* DETAILS VIEW PARTICIPANT */}
        {viewingParticipant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-dark-border text-slate-300 space-y-6"
              id="view-participant-details-modal"
            >
              <div className="flex items-center justify-between pb-3 border-b border-dark-border-light">
                <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Eye className="w-5 h-5 text-gold-primary" />
                  Visualizar Participante
                </h3>
                <button
                  onClick={() => setViewingParticipant(null)}
                  className="p-1.5 bg-dark-card-elevated hover:bg-dark-border border border-dark-border-light rounded-full text-slate-300 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-center py-4 bg-dark-card-elevated border border-dark-border-light rounded-2xl">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gold-primary text-black rounded-full flex items-center justify-center text-lg font-black mx-auto mb-2 glow-winner">
                      {viewingParticipant.nickname.charAt(0).toUpperCase()}
                    </div>
                    <h4 className="text-base font-black text-white uppercase tracking-wider">{viewingParticipant.nickname}</h4>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">ID: {viewingParticipant.id}</span>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-dark-border-light">
                    <span className="text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider text-[10px]"><Phone className="w-3.5 h-3.5 text-gold-primary" /> Contato:</span>
                    <span className="text-white font-bold font-mono">{viewingParticipant.contact_number}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-dark-border-light">
                    <span className="text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider text-[10px]"><Calendar className="w-3.5 h-3.5 text-gold-primary" /> Cadastro:</span>
                    <span className="text-slate-300 font-bold font-mono">{formatarData(viewingParticipant.created_at)}</span>
                  </div>

                  <div className="py-1">
                    <span className="text-slate-400 font-bold flex items-center gap-1 mb-1.5 uppercase tracking-wider text-[10px]">
                      <MessageSquare className="w-3.5 h-3.5 text-gold-primary" /> Observações:
                    </span>
                    <p className="bg-dark-card-elevated border border-dark-border-light p-3 rounded-lg text-slate-300 text-xs italic font-semibold">
                      {viewingParticipant.notes || "Nenhuma observação cadastrada."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setViewingParticipant(null)}
                  className="px-5 py-2.5 bg-dark-card-elevated hover:bg-dark-border border border-dark-border-light text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ADD NUMBERS DIRECTLY MODAL */}
        {addingNumbersToParticipant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-dark-border text-slate-300 space-y-6"
              id="add-numbers-participant-modal"
            >
              <div className="flex items-center justify-between pb-3 border-b border-dark-border-light">
                <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Plus className="w-5 h-5 text-gold-primary" />
                  Atribuir Números a {addingNumbersToParticipant.nickname}
                </h3>
                <button
                  onClick={() => setAddingNumbersToParticipant(null)}
                  className="p-1.5 bg-dark-card-elevated hover:bg-dark-border border border-dark-border-light rounded-full text-slate-300 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddNumbersSubmit} className="space-y-4" id="form-add-numbers-to-participant">
                <div className="p-3.5 bg-warning-vibrant/10 text-slate-300 rounded-2xl text-xs space-y-1.5 border border-warning-vibrant/20">
                  <div className="font-black flex items-center gap-1 uppercase tracking-wider text-warning-vibrant">
                    <AlertCircle className="w-4 h-4 shrink-0 text-warning-vibrant" />
                    Regra Importante
                  </div>
                  <p>
                    Os números adicionados por aqui serão atribuídos diretamente como <strong className="text-white font-extrabold uppercase">RESERVADOS</strong> para o jogador. Você deverá confirmar o Pix deles depois para que participem do sorteio.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                    Digite os números (separados por vírgula ou espaço):
                  </label>
                  <input
                    id="input-add-p-numbers"
                    type="text"
                    required
                    placeholder="Ex: 5, 27, 88"
                    value={newNumbersStr}
                    onChange={(e) => setNewNumbersStr(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-card-elevated border border-dark-border rounded-lg text-xs font-mono text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1.5 font-bold uppercase tracking-wider">
                    Valores permitidos: de {tournament.is_infinite ? "1" : tournament.number_start} a {tournament.is_infinite ? "999.999" : tournament.number_end}
                  </span>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-dark-border-light">
                  <button
                    type="button"
                    onClick={() => setAddingNumbersToParticipant(null)}
                    className="px-4 py-2 bg-dark-card-elevated hover:bg-dark-border text-white border border-dark-border-light rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-add-p-numbers-submit"
                    type="submit"
                    className="px-4 py-2 bg-gold-primary hover:bg-gold-dark text-black rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer glow-winner"
                  >
                    Atribuir Cotas
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* GRANULAR APPROVAL MODAL */}
        {approvingParticipant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-dark-border text-slate-300 space-y-6"
              id="granular-approval-modal"
            >
              <div className="flex items-center justify-between pb-3 border-b border-dark-border-light">
                <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle2 className="w-5 h-5 text-success-vibrant" />
                  Aprovar Reservas: {approvingParticipant.nickname}
                </h3>
                <button
                  onClick={() => setApprovingParticipant(null)}
                  className="p-1.5 bg-dark-card-elevated hover:bg-dark-border border border-dark-border-light rounded-full text-slate-300 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Marque abaixo quais números você deseja <strong className="text-success-vibrant font-extrabold uppercase">APROVAR (PAGO)</strong>. Os números desmarcados serão <strong className="text-rose-500 font-extrabold uppercase">EXCLUÍDOS / LIBERADOS</strong> e voltarão a ficar disponíveis.
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 bg-dark-card-elevated/50 p-2.5 rounded-xl border border-dark-border-light">
                  {getParticipantNumbers(approvingParticipant.id)
                    .filter((n) => n.status === NumberStatus.Reservado || n.status === NumberStatus.Pago)
                    .map((n) => {
                      const numStr = padronizarNumero(n.number, tournament.number_end);
                      const isChecked = selectedApprovalNums.includes(n.number);

                      return (
                        <div 
                          key={n.id} 
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                            isChecked 
                              ? "bg-success-vibrant/5 border-success-vibrant/20 text-white shadow-[0_0_8px_rgba(34,197,94,0.05)]" 
                              : "bg-rose-950/10 border-rose-900/20 text-slate-400"
                          }`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer select-none w-full">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedApprovalNums(selectedApprovalNums.filter((num) => num !== n.number));
                                } else {
                                  setSelectedApprovalNums([...selectedApprovalNums, n.number]);
                                }
                              }}
                              className="w-4 h-4 accent-success-vibrant cursor-pointer rounded border-dark-border bg-dark-card"
                            />
                            <div className="flex flex-col">
                              <span className="font-mono font-black text-sm tracking-wide flex items-center gap-2">
                                Número: {numStr}
                                {n.status === NumberStatus.Pago && (
                                  <span className="text-[8px] bg-success-vibrant/20 text-success-vibrant px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                    Pago
                                  </span>
                                )}
                              </span>
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                Preço: {formatarValor(tournament.number_price)}
                              </span>
                            </div>
                          </label>

                          <div>
                            {isChecked ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-success-vibrant/15 text-success-vibrant border border-success-vibrant/20">
                                {n.status === NumberStatus.Pago ? "Manter Pago" : "Aprovar"}
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Excluir / Liberar
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Total Preview */}
                <div className="flex justify-between items-center p-3 bg-dark-card-elevated border border-dark-border-light rounded-xl font-mono text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Selecionado:</span>
                    <span className="font-black text-white">{selectedApprovalNums.length} cotas</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">A Confirmar:</span>
                    <span className="font-black text-success-vibrant">{formatarValor(selectedApprovalNums.length * tournament.number_price)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-dark-border-light">
                <button
                  type="button"
                  onClick={() => setApprovingParticipant(null)}
                  className="px-4 py-2 bg-dark-card-elevated hover:bg-dark-border border border-dark-border-light text-white rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  id="btn-confirm-granular-approval"
                  type="button"
                  onClick={() => {
                    const allActive = getParticipantNumbers(approvingParticipant.id)
                      .filter((n) => n.status === NumberStatus.Reservado || n.status === NumberStatus.Pago)
                      .map((n) => n.number);

                    const numbersToApprove = selectedApprovalNums;
                    const numbersToRelease = allActive.filter((num) => !selectedApprovalNums.includes(num));

                    onApproveNumbersOfParticipant(approvingParticipant.id, numbersToApprove, numbersToRelease);
                    setApprovingParticipant(null);
                  }}
                  className="px-5 py-2 bg-gold-primary hover:bg-gold-dark text-black rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer glow-winner"
                >
                  Aplicar Ajustes
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </div>
  );
}
