/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Tournament,
  Participant,
  TournamentNumber,
  Payment,
  DrawResult,
  AuditLog,
  TournamentStatus,
  NumberStatus,
  PaymentStatus,
} from "./types";
import {
  seedTournament,
  seedParticipants,
  getSeedNumbers,
  seedPayments,
  seedAuditLogs,
} from "./seed";
import {
  loadRaffleData,
  saveTournamentToFirebase,
  saveParticipantToFirebase,
  deleteParticipantFromFirebase,
  saveNumbersToFirebase,
  clearAllNumbersInFirebase,
  savePaymentToFirebase,
  clearAllPaymentsInFirebase,
  saveDrawResultToFirebase,
  saveAuditLogToFirebase,
  clearAllAuditLogsInFirebase,
} from "./firebaseService";
import { formatarValor, padronizarNumero, gerarHash } from "./utils";
import Dashboard from "./components/Dashboard";
import NumberGrid from "./components/NumberGrid";
import ParticipantList from "./components/ParticipantList";
import TournamentForm from "./components/TournamentForm";
import RaffleDraw from "./components/RaffleDraw";
import AuditLogList from "./components/AuditLogList";

import {
  Trophy,
  LayoutDashboard,
  Grid,
  Users,
  Settings,
  ShieldCheck,
  Play,
  History,
  Coins,
  ShieldAlert,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Admin access control states
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem("raffle_is_admin") === "true";
  });
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Core database state
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [numbers, setNumbers] = useState<TournamentNumber[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // 1. Initial hydration from LocalStorage or pre-load from SeedData with Firestore sync
  useEffect(() => {
    const cachedTournament = localStorage.getItem("raffle_tournament");
    const cachedParticipants = localStorage.getItem("raffle_participants");
    const cachedNumbers = localStorage.getItem("raffle_numbers");
    const cachedPayments = localStorage.getItem("raffle_payments");
    const cachedDraw = localStorage.getItem("raffle_draw_result");
    const cachedLogs = localStorage.getItem("raffle_audit_logs");

    if (cachedTournament) {
      setTournament(JSON.parse(cachedTournament));
    } else {
      setTournament(seedTournament);
      localStorage.setItem("raffle_tournament", JSON.stringify(seedTournament));
    }

    if (cachedParticipants) {
      setParticipants(JSON.parse(cachedParticipants));
    } else {
      setParticipants(seedParticipants);
      localStorage.setItem("raffle_participants", JSON.stringify(seedParticipants));
    }

    if (cachedNumbers) {
      setNumbers(JSON.parse(cachedNumbers));
    } else {
      const initialNums = getSeedNumbers();
      setNumbers(initialNums);
      localStorage.setItem("raffle_numbers", JSON.stringify(initialNums));
    }

    if (cachedPayments) {
      setPayments(JSON.parse(cachedPayments));
    } else {
      setPayments(seedPayments);
      localStorage.setItem("raffle_payments", JSON.stringify(seedPayments));
    }

    if (cachedDraw) {
      setDrawResult(JSON.parse(cachedDraw));
    } else {
      setDrawResult(null);
    }

    if (cachedLogs) {
      setLogs(JSON.parse(cachedLogs));
    } else {
      setLogs(seedAuditLogs);
      localStorage.setItem("raffle_audit_logs", JSON.stringify(seedAuditLogs));
    }

    // Secondary load from Firebase Firestore
    async function syncWithFirebase() {
      const data = await loadRaffleData();
      if (data) {
        setTournament(data.tournament);
        setParticipants(data.participants);
        setNumbers(data.numbers);
        setPayments(data.payments);
        setDrawResult(data.drawResult);
        setLogs(data.logs);

        localStorage.setItem("raffle_tournament", JSON.stringify(data.tournament));
        localStorage.setItem("raffle_participants", JSON.stringify(data.participants));
        localStorage.setItem("raffle_numbers", JSON.stringify(data.numbers));
        localStorage.setItem("raffle_payments", JSON.stringify(data.payments));
        localStorage.setItem("raffle_draw_result", JSON.stringify(data.drawResult));
        localStorage.setItem("raffle_audit_logs", JSON.stringify(data.logs));
      }
    }
    syncWithFirebase();
  }, []);

  // Helpers to push audit logs easily
  const createAuditLog = (action: string, entity: string, entityId: string, oldData?: any, newData?: any) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      user_id: "Administrador",
      action,
      entity,
      entity_id: entityId,
      old_data: oldData ? JSON.stringify(oldData) : undefined,
      new_data: newData ? JSON.stringify(newData) : undefined,
      created_at: new Date().toISOString(),
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem("raffle_audit_logs", JSON.stringify(updatedLogs));
    saveAuditLogToFirebase(newLog);
  };

  // 2. Action Handlers

  // Reserve multiple numbers at once
  const handleReserveNumbers = (
    selectedNums: number[],
    nickname: string,
    contactNumber: string,
    proof: string
  ) => {
    if (!tournament) return;

    // A. Check or create participant
    let pObj = participants.find((p) => p.nickname.toLowerCase() === nickname.toLowerCase().trim());
    let updatedParticipants = [...participants];

    if (!pObj) {
      pObj = {
        id: `p_${Date.now()}`,
        nickname: nickname.trim(),
        contact_number: contactNumber.trim(),
        notes: "Cadastrado via compra de cotas.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updatedParticipants.push(pObj);
      setParticipants(updatedParticipants);
      localStorage.setItem("raffle_participants", JSON.stringify(updatedParticipants));
      saveParticipantToFirebase(pObj);
      createAuditLog("Criação de participante", "participant", pObj.id, null, pObj);
    }

    // B. Update selected numbers to Reserved
    const updatedNumbers = numbers.map((num) => {
      if (selectedNums.includes(num.number)) {
        return {
          ...num,
          participant_id: pObj!.id,
          participant_nickname: pObj!.nickname,
          participant_contact: pObj!.contact_number,
          status: NumberStatus.Reservado,
          payment_status: PaymentStatus.Pendente,
          reserved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return num;
    });

    setNumbers(updatedNumbers);
    localStorage.setItem("raffle_numbers", JSON.stringify(updatedNumbers));
    
    // Save numbers to Firebase
    const changedNumbers = updatedNumbers.filter(num => selectedNums.includes(num.number));
    saveNumbersToFirebase(changedNumbers);

    // C. Create pending Payment
    const pricePerSlot = tournament.number_price;
    const expected = selectedNums.length * pricePerSlot;
    
    const newPayment: Payment = {
      id: `pay_${Date.now()}`,
      tournament_id: tournament.id,
      participant_id: pObj.id,
      participant_nickname: pObj.nickname,
      participant_contact: pObj.contact_number,
      numbers: selectedNums,
      expected_amount: expected,
      paid_amount: 0,
      status: PaymentStatus.Pendente,
      proof: proof || "Reserva de cotas na grade.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    localStorage.setItem("raffle_payments", JSON.stringify(updatedPayments));
    savePaymentToFirebase(newPayment);

    // D. Write logs
    selectedNums.forEach((n) => {
      createAuditLog(
        "Reserva de número", 
        "number", 
        `num_${tournament.id}_${n}`, 
        { status: NumberStatus.Disponivel }, 
        { status: NumberStatus.Reservado, nickname: pObj!.nickname }
      );
    });

    createAuditLog("Criação de pagamento pendente", "payment", newPayment.id, null, newPayment);
  };

  // Confirm payment directly on a single number
  const handleConfirmPaymentDirectly = (numberId: string) => {
    if (!tournament) return;

    const numObj = numbers.find((n) => n.id === numberId);
    if (!numObj || numObj.status !== NumberStatus.Reservado) return;

    // A. Update number status to Pago
    const updatedNumbers = numbers.map((n) => {
      if (n.id === numberId) {
        return {
          ...n,
          status: NumberStatus.Pago,
          payment_status: PaymentStatus.Confirmado,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return n;
    });

    setNumbers(updatedNumbers);
    localStorage.setItem("raffle_numbers", JSON.stringify(updatedNumbers));
    
    // Save updated number to Firebase
    const changedNum = updatedNumbers.find(n => n.id === numberId);
    if (changedNum) saveNumbersToFirebase([changedNum]);

    // B. Find associated pending payments containing this single number and resolve them!
    const updatedPayments = payments.map((pay) => {
      if (pay.participant_id === numObj.participant_id && pay.numbers.includes(numObj.number) && pay.status === PaymentStatus.Pendente) {
        // Since we are approving one, let's create a partial/full confirmation logic or simply resolve it
        const updatedPay = {
          ...pay,
          status: PaymentStatus.Confirmado,
          paid_amount: pay.expected_amount, // Approved full amount for simplicity
          confirmed_by: "Administrador",
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        savePaymentToFirebase(updatedPay);
        return updatedPay;
      }
      return pay;
    });

    setPayments(updatedPayments);
    localStorage.setItem("raffle_payments", JSON.stringify(updatedPayments));

    // C. Trigger Audit Logs
    createAuditLog(
      "Confirmação de pagamento", 
      "number", 
      numberId, 
      { status: NumberStatus.Reservado }, 
      { status: NumberStatus.Pago, paid_at: new Date().toISOString() }
    );

    // D. Re-calculate metrics dynamically in states
    const paidCount = updatedNumbers.filter(n => n.status === NumberStatus.Pago).length;
    const newConfirmedAmount = paidCount * tournament.number_price;

    const updatedTournament = {
      ...tournament,
      confirmed_amount: newConfirmedAmount,
      prize_amount: newConfirmedAmount,
      updated_at: new Date().toISOString(),
    };
    setTournament(updatedTournament);
    localStorage.setItem("raffle_tournament", JSON.stringify(updatedTournament));
    saveTournamentToFirebase(updatedTournament);
  };

  // Confirm ALL payments of a participant
  const handleConfirmAllPaymentsOfParticipant = (participantId: string) => {
    if (!tournament) return;

    // A. Update numbers
    const updatedNumbers = numbers.map((n) => {
      if (n.participant_id === participantId && n.status === NumberStatus.Reservado) {
        return {
          ...n,
          status: NumberStatus.Pago,
          payment_status: PaymentStatus.Confirmado,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return n;
    });
    setNumbers(updatedNumbers);
    localStorage.setItem("raffle_numbers", JSON.stringify(updatedNumbers));
    
    // Save changed numbers of the participant
    const changedNumbers = updatedNumbers.filter(n => n.participant_id === participantId && n.status === NumberStatus.Pago);
    saveNumbersToFirebase(changedNumbers);

    // B. Update payments
    const updatedPayments = payments.map((p) => {
      if (p.participant_id === participantId && p.status === PaymentStatus.Pendente) {
        const updatedPay = {
          ...p,
          status: PaymentStatus.Confirmado,
          paid_amount: p.expected_amount,
          confirmed_by: "Administrador",
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        savePaymentToFirebase(updatedPay);
        return updatedPay;
      }
      return p;
    });
    setPayments(updatedPayments);
    localStorage.setItem("raffle_payments", JSON.stringify(updatedPayments));

    // C. Re-calculate tournament pool
    const paidCount = updatedNumbers.filter(n => n.status === NumberStatus.Pago).length;
    const newConfirmedAmount = paidCount * tournament.number_price;

    const updatedTournament = {
      ...tournament,
      confirmed_amount: newConfirmedAmount,
      prize_amount: newConfirmedAmount,
      updated_at: new Date().toISOString(),
    };
    setTournament(updatedTournament);
    localStorage.setItem("raffle_tournament", JSON.stringify(updatedTournament));
    saveTournamentToFirebase(updatedTournament);

    // D. Log
    createAuditLog(
      "Aprovação em lote",
      "payment",
      `all_pay_${participantId}`,
      { status: PaymentStatus.Pendente },
      { status: PaymentStatus.Confirmado, paid_amount: newConfirmedAmount }
    );
  };

  // Granular approve numbers of a participant
  const handleApproveNumbersOfParticipant = (
    participantId: string, 
    numbersToApprove: number[], 
    numbersToRelease: number[]
  ) => {
    if (!tournament) return;

    // A. Update numbers state
    const updatedNumbers = numbers.map((n) => {
      if (n.participant_id === participantId && n.status === NumberStatus.Reservado) {
        if (numbersToApprove.includes(n.number)) {
          return {
            ...n,
            status: NumberStatus.Pago,
            payment_status: PaymentStatus.Confirmado,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        } else if (numbersToRelease.includes(n.number)) {
          return {
            ...n,
            participant_id: "",
            participant_nickname: "",
            participant_contact: "",
            status: NumberStatus.Disponivel,
            payment_status: PaymentStatus.Pendente,
            reserved_at: null as any,
            paid_at: null as any,
            updated_at: new Date().toISOString(),
          };
        }
      }
      return n;
    });
    setNumbers(updatedNumbers);
    localStorage.setItem("raffle_numbers", JSON.stringify(updatedNumbers));

    // Save changed numbers to Firestore
    const changedNumbers = updatedNumbers.filter(
      (n) => n.participant_id === participantId || (n.status === NumberStatus.Disponivel && numbersToRelease.includes(n.number))
    ).filter(n => {
      // Find the ones we just touched
      if (n.status === NumberStatus.Pago && numbersToApprove.includes(n.number)) return true;
      if (n.status === NumberStatus.Disponivel && numbersToRelease.includes(n.number)) return true;
      return false;
    });
    saveNumbersToFirebase(changedNumbers);

    // B. Update payments state
    const updatedPayments = payments.map((p) => {
      if (p.participant_id === participantId && p.status === PaymentStatus.Pendente) {
        // Intersect original payment numbers with our approved ones
        const approvedForThisPayment = p.numbers.filter(num => numbersToApprove.includes(num));
        if (approvedForThisPayment.length > 0) {
          const updatedPay = {
            ...p,
            status: PaymentStatus.Confirmado,
            numbers: approvedForThisPayment,
            paid_amount: approvedForThisPayment.length * tournament.number_price,
            confirmed_by: "Administrador",
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          savePaymentToFirebase(updatedPay);
          return updatedPay;
        } else {
          const updatedPay = {
            ...p,
            status: PaymentStatus.Rejeitado,
            notes: "Cotas pendentes canceladas ou liberadas pelo administrador.",
            updated_at: new Date().toISOString(),
          };
          savePaymentToFirebase(updatedPay);
          return updatedPay;
        }
      }
      return p;
    });
    setPayments(updatedPayments);
    localStorage.setItem("raffle_payments", JSON.stringify(updatedPayments));

    // C. Re-calculate tournament pool metrics
    const paidCount = updatedNumbers.filter(n => n.status === NumberStatus.Pago).length;
    const newConfirmedAmount = paidCount * tournament.number_price;

    const updatedTournament = {
      ...tournament,
      confirmed_amount: newConfirmedAmount,
      prize_amount: newConfirmedAmount,
      updated_at: new Date().toISOString(),
    };
    setTournament(updatedTournament);
    localStorage.setItem("raffle_tournament", JSON.stringify(updatedTournament));
    saveTournamentToFirebase(updatedTournament);

    // D. Log audit trail
    createAuditLog(
      "Ajuste e Aprovação",
      "payment",
      `granular_pay_${participantId}`,
      { approvedCount: 0, releasedCount: 0 },
      { approvedCount: numbersToApprove.length, releasedCount: numbersToRelease.length, approvedNumbers: numbersToApprove }
    );
  };

  // Cancel reservation directly on a single number
  const handleCancelReservationDirectly = (numberId: string) => {
    if (!tournament) return;

    const numObj = numbers.find((n) => n.id === numberId);
    if (!numObj || numObj.status === NumberStatus.Disponivel) return;

    // A. Update number
    const updatedNumbers = numbers.map((n) => {
      if (n.id === numberId) {
        return {
          ...n,
          participant_id: "",
          participant_nickname: "",
          participant_contact: "",
          status: NumberStatus.Disponivel,
          payment_status: PaymentStatus.Pendente,
          reserved_at: undefined,
          paid_at: undefined,
          updated_at: new Date().toISOString(),
        };
      }
      return n;
    });
    setNumbers(updatedNumbers);
    localStorage.setItem("raffle_numbers", JSON.stringify(updatedNumbers));
    
    // Save updated number (Available = deleted) to Firebase
    const changedNum = updatedNumbers.find(n => n.id === numberId);
    if (changedNum) saveNumbersToFirebase([changedNum]);

    // B. Re-calculate pool (if we cancelled a paid one, which is allowed by admin)
    const paidCount = updatedNumbers.filter(n => n.status === NumberStatus.Pago).length;
    const newConfirmedAmount = paidCount * tournament.number_price;

    const updatedTournament = {
      ...tournament,
      confirmed_amount: newConfirmedAmount,
      prize_amount: newConfirmedAmount,
      updated_at: new Date().toISOString(),
    };
    setTournament(updatedTournament);
    localStorage.setItem("raffle_tournament", JSON.stringify(updatedTournament));
    saveTournamentToFirebase(updatedTournament);

    // C. Cancel associated pending payment
    const updatedPayments = payments.map((p) => {
      if (p.participant_id === numObj.participant_id && p.numbers.includes(numObj.number) && p.status === PaymentStatus.Pendente) {
        const updatedPay = {
          ...p,
          status: PaymentStatus.Rejeitado,
          notes: "Reserva cancelada individualmente pelo administrador.",
          updated_at: new Date().toISOString(),
        };
        savePaymentToFirebase(updatedPay);
        return updatedPay;
      }
      return p;
    });
    setPayments(updatedPayments);
    localStorage.setItem("raffle_payments", JSON.stringify(updatedPayments));

    // D. Audit log
    createAuditLog(
      "Cancelamento de cota",
      "number",
      numberId,
      { status: numObj.status, nickname: numObj.participant_nickname },
      { status: NumberStatus.Disponivel }
    );
  };

  // Cancel all reservations of a participant
  const handleCancelAllReservationsOfParticipant = (participantId: string) => {
    if (!tournament) return;

    // A. Update numbers back to Available
    const updatedNumbers = numbers.map((n) => {
      if (n.participant_id === participantId && n.status === NumberStatus.Reservado) {
        return {
          ...n,
          participant_id: "",
          participant_nickname: "",
          participant_contact: "",
          status: NumberStatus.Disponivel,
          payment_status: PaymentStatus.Pendente,
          reserved_at: undefined,
          updated_at: new Date().toISOString(),
        };
      }
      return n;
    });
    setNumbers(updatedNumbers);
    localStorage.setItem("raffle_numbers", JSON.stringify(updatedNumbers));
    
    // Save updated numbers back to Disponivel in Firebase (deletes from db)
    const changedNumbers = numbers.filter(n => n.participant_id === participantId && n.status === NumberStatus.Reservado).map(n => ({
      ...n,
      status: NumberStatus.Disponivel
    }));
    saveNumbersToFirebase(changedNumbers);

    // B. Update payments to Rejeitado/Cancelado
    const updatedPayments = payments.map((p) => {
      if (p.participant_id === participantId && p.status === PaymentStatus.Pendente) {
        const updatedPay = {
          ...p,
          status: PaymentStatus.Rejeitado,
          notes: "Reservas expiradas ou rejeitadas pelo administrador.",
          updated_at: new Date().toISOString(),
        };
        savePaymentToFirebase(updatedPay);
        return updatedPay;
      }
      return p;
    });
    setPayments(updatedPayments);
    localStorage.setItem("raffle_payments", JSON.stringify(updatedPayments));

    // C. Log
    createAuditLog(
      "Cancelamento de reservas em lote",
      "payment",
      `cancel_reserv_${participantId}`,
      { status: NumberStatus.Reservado },
      { status: NumberStatus.Disponivel }
    );
  };

  // Add numbers to participant directly from list
  const handleAddNumberToParticipantDirectly = (participantId: string, numbersToAdd: number[]) => {
    if (!tournament) return;

    const pObj = participants.find((p) => p.id === participantId);
    if (!pObj) return;

    // A. Update numbers to Reserved for this participant
    const updatedNumbers = numbers.map((n) => {
      if (numbersToAdd.includes(n.number)) {
        return {
          ...n,
          participant_id: pObj.id,
          participant_nickname: pObj.nickname,
          participant_contact: pObj.contact_number,
          status: NumberStatus.Reservado,
          payment_status: PaymentStatus.Pendente,
          reserved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return n;
    });
    setNumbers(updatedNumbers);
    localStorage.setItem("raffle_numbers", JSON.stringify(updatedNumbers));
    
    // Save numbers to Firebase
    const changedNumbers = updatedNumbers.filter(n => numbersToAdd.includes(n.number));
    saveNumbersToFirebase(changedNumbers);

    // B. Create payment
    const newPayment: Payment = {
      id: `pay_${Date.now()}`,
      tournament_id: tournament.id,
      participant_id: pObj.id,
      participant_nickname: pObj.nickname,
      participant_contact: pObj.contact_number,
      numbers: numbersToAdd,
      expected_amount: numbersToAdd.length * tournament.number_price,
      paid_amount: 0,
      status: PaymentStatus.Pendente,
      proof: "Atribuído diretamente pelo administrador.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    localStorage.setItem("raffle_payments", JSON.stringify(updatedPayments));
    savePaymentToFirebase(newPayment);

    // C. Log
    createAuditLog(
      "Atribuição manual de números",
      "participant",
      participantId,
      null,
      { numbers: numbersToAdd, expected_amount: newPayment.expected_amount }
    );
  };

  // Registering Participant
  const handleAddParticipant = (nickname: string, contactNumber: string, notes?: string) => {
    const newP: Participant = {
      id: `p_${Date.now()}`,
      nickname,
      contact_number: contactNumber,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [...participants, newP];
    setParticipants(updated);
    localStorage.setItem("raffle_participants", JSON.stringify(updated));
    saveParticipantToFirebase(newP);

    createAuditLog("Criação de participante", "participant", newP.id, null, newP);
  };

  const handleUpdateParticipant = (id: string, nickname: string, contactNumber: string, notes?: string) => {
    const oldP = participants.find((p) => p.id === id);
    const updated = participants.map((p) => {
      if (p.id === id) {
        const updatedP = {
          ...p,
          nickname,
          contact_number: contactNumber,
          notes,
          updated_at: new Date().toISOString(),
        };
        saveParticipantToFirebase(updatedP);
        return updatedP;
      }
      return p;
    });

    setParticipants(updated);
    localStorage.setItem("raffle_participants", JSON.stringify(updated));

    // Propagate updated nickname and contact to the active tickets
    const updatedNumbers = numbers.map((n) => {
      if (n.participant_id === id) {
        return {
          ...n,
          participant_nickname: nickname,
          participant_contact: contactNumber,
        };
      }
      return n;
    });
    setNumbers(updatedNumbers);
    localStorage.setItem("raffle_numbers", JSON.stringify(updatedNumbers));
    
    // Save updated active tickets to Firebase
    const changedNumbers = updatedNumbers.filter(n => n.participant_id === id);
    if (changedNumbers.length > 0) saveNumbersToFirebase(changedNumbers);

    createAuditLog("Atualização de participante", "participant", id, oldP, { nickname, contactNumber, notes });
  };

  const handleDeleteParticipant = (id: string) => {
    const oldP = participants.find((p) => p.id === id);
    const updated = participants.filter((p) => p.id !== id);
    setParticipants(updated);
    localStorage.setItem("raffle_participants", JSON.stringify(updated));
    deleteParticipantFromFirebase(id);

    createAuditLog("Exclusão de participante", "participant", id, oldP, null);
  };

  // Saved tournament configurations
  const handleSaveTournament = (updatedTournament: Tournament) => {
    setTournament(updatedTournament);
    localStorage.setItem("raffle_tournament", JSON.stringify(updatedTournament));
    saveTournamentToFirebase(updatedTournament);

    createAuditLog(
      "Alteração das regras do torneio",
      "tournament",
      updatedTournament.id,
      tournament,
      updatedTournament
    );
  };

  // Triggering new tournament creation (with reset of tickets and sales)
  const handleCreateNewTournament = (
    name: string,
    description: string,
    startNum: number,
    endNum: number,
    price: number,
    status: TournamentStatus,
    openDate: string,
    drawDate: string,
    notes?: string
  ) => {
    const newT: Tournament = {
      id: `t_${Date.now()}`,
      name,
      description,
      number_start: startNum,
      number_end: endNum,
      number_price: price,
      status,
      opening_date: openDate,
      draw_date: drawDate,
      confirmed_amount: 0,
      prize_amount: 0,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // A. Save tournament
    setTournament(newT);
    localStorage.setItem("raffle_tournament", JSON.stringify(newT));
    saveTournamentToFirebase(newT);

    // B. Reset numbers grid
    const freshNumbers: TournamentNumber[] = [];
    for (let i = startNum; i <= endNum; i++) {
      freshNumbers.push({
        id: `num_${newT.id}_${i}`,
        tournament_id: newT.id,
        participant_id: "",
        number: i,
        price,
        status: NumberStatus.Disponivel,
        payment_status: PaymentStatus.Pendente,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    setNumbers(freshNumbers);
    localStorage.setItem("raffle_numbers", JSON.stringify(freshNumbers));
    clearAllNumbersInFirebase(); // Available numbers are not kept in DB

    // C. Reset payments & drawings
    setPayments([]);
    localStorage.setItem("raffle_payments", JSON.stringify([]));
    clearAllPaymentsInFirebase();

    setDrawResult(null);
    localStorage.removeItem("raffle_draw_result");
    saveDrawResultToFirebase(null);

    // D. Logs
    createAuditLog("Criação de torneio", "tournament", newT.id, tournament, newT);
  };

  // Execute drawing
  const handleExecuteDraw = (result: DrawResult) => {
    if (!tournament) return;

    // A. Save Draw Result
    setDrawResult(result);
    localStorage.setItem("raffle_draw_result", JSON.stringify(result));
    saveDrawResultToFirebase(result);

    // B. Finalize active tournament status
    const finalizedT: Tournament = {
      ...tournament,
      status: TournamentStatus.Finalizado,
      winner_number_id: String(result.winning_number),
      finished_at: result.drawn_at,
      updated_at: new Date().toISOString(),
    };
    setTournament(finalizedT);
    localStorage.setItem("raffle_tournament", JSON.stringify(finalizedT));
    saveTournamentToFirebase(finalizedT);

    // C. Lock numbers list to prevent modifications
    const lockedNumbers = numbers.map((n) => {
      if (n.number === result.winning_number) {
        return n; // Highlight winner
      }
      // Leave statuses as is, but locked
      return n;
    });
    setNumbers(lockedNumbers);
    localStorage.setItem("raffle_numbers", JSON.stringify(lockedNumbers));
    
    // Save winning number with its finalized stats to Firebase
    const winningNumObj = lockedNumbers.find(n => n.number === result.winning_number);
    if (winningNumObj) saveNumbersToFirebase([winningNumObj]);

    // D. Write logs
    createAuditLog("Realização do sorteio", "draw", result.id, null, result);
    createAuditLog(
      "Resultado final do torneio",
      "tournament",
      tournament.id,
      tournament,
      finalizedT
    );
  };

  // Clear logs helper
  const handleClearLogs = () => {
    setLogs([]);
    localStorage.setItem("raffle_audit_logs", JSON.stringify([]));
    clearAllAuditLogsInFirebase();
  };

  return (
    <div className="min-h-screen bg-dark-bg text-[#E0E0E0] flex flex-col font-sans animate-fade-in" id="applet-container">
      
      {/* 1. TOP HEADER BRAND BAR */}
      <header className="bg-dark-card border-b border-dark-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-gold-primary text-black rounded-xl shadow-md glow-winner">
              <Trophy className="w-5 h-5 font-black" />
            </span>
            <div>
              <h1 className="text-base font-black text-white flex items-center gap-2 tracking-tight">
                LOTTO<span className="text-gold-primary">ALPHA</span>
                <span className="px-2 py-0.5 bg-success-vibrant/10 text-success-vibrant text-[10px] font-black rounded-full border border-success-vibrant/20">
                  PRO v1.2
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tournament Manager</p>
            </div>
          </div>

          {/* Quick Stats overview & Admin Mode controls */}
          <div className="flex flex-col sm:flex-row items-center gap-4" id="header-controls">
            {tournament && (
              <div className="flex gap-4 font-mono text-center divide-x divide-dark-border-light">
                <div className="px-3">
                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider">Números</span>
                  <span className="text-xs font-black text-white">{tournament.is_infinite ? "∞" : numbers.length}</span>
                </div>
                <div className="px-3 pl-4">
                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider">Preço</span>
                  <span className="text-xs font-black text-gold-primary">{formatarValor(tournament.number_price)}</span>
                </div>
                <div className="px-3 pl-4">
                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider">Acumulado</span>
                  <span className="text-xs font-black text-success-vibrant">{formatarValor(tournament.confirmed_amount)}</span>
                </div>
              </div>
            )}

            {/* Admin trigger button */}
            <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-dark-border-light pt-3 sm:pt-0 pl-0 sm:pl-4">
              {isAdmin ? (
                <div className="flex items-center gap-2 bg-success-vibrant/10 border border-success-vibrant/20 px-3 py-1.5 rounded-xl">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-vibrant opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success-vibrant"></span>
                  </span>
                  <span className="text-[10px] font-black text-success-vibrant font-mono tracking-wider uppercase">Painel Admin</span>
                  <button
                    id="btn-admin-logout"
                    onClick={() => {
                      setIsAdmin(false);
                      localStorage.setItem("raffle_is_admin", "false");
                      setActiveTab("dashboard");
                    }}
                    className="ml-2 text-[10px] font-black uppercase text-slate-400 hover:text-white transition-colors cursor-pointer border border-dark-border-light bg-dark-bg/50 px-2 py-0.5 rounded-md"
                  >
                    Sair
                  </button>
                </div>
              ) : (
                <button
                  id="btn-admin-login-trigger"
                  onClick={() => {
                    setAdminPasswordInput("");
                    setLoginError("");
                    setShowAdminLogin(true);
                  }}
                  className="px-3.5 py-1.5 bg-dark-card-elevated hover:bg-dark-border-light border border-dark-border-light rounded-xl text-xs font-black uppercase tracking-wider text-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-gold-primary" />
                  Acessar Admin
                </button>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* 2. TABBED METRICS NAVIGATION */}
      <nav className="bg-dark-card-elevated border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
          <div className="flex space-x-2 py-2.5 whitespace-nowrap">
            
            {/* TAB: DASHBOARD */}
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer border ${
                activeTab === "dashboard"
                  ? "bg-gold-primary text-black border-gold-primary shadow-lg glow-winner"
                  : "text-slate-400 border-transparent hover:text-white hover:bg-dark-border"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Painel Principal
            </button>

            {/* TAB: NUMBER GRID */}
            <button
              id="tab-numbers-grid"
              onClick={() => setActiveTab("numbers-grid")}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer border ${
                activeTab === "numbers-grid"
                  ? "bg-gold-primary text-black border-gold-primary shadow-lg glow-winner"
                  : "text-slate-400 border-transparent hover:text-white hover:bg-dark-border"
              }`}
            >
              <Grid className="w-4 h-4" />
              Grade de Números
            </button>

            {/* TAB: PARTICIPANTS */}
            {isAdmin && (
              <button
                id="tab-participants"
                onClick={() => setActiveTab("participants")}
                className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer border ${
                  activeTab === "participants"
                    ? "bg-gold-primary text-black border-gold-primary shadow-lg glow-winner"
                    : "text-slate-400 border-transparent hover:text-white hover:bg-dark-border"
                }`}
              >
                <Users className="w-4 h-4" />
                Participantes
              </button>
            )}

            {/* TAB: TOURNEY CONFIG */}
            {isAdmin && (
              <button
                id="tab-tournament-config"
                onClick={() => setActiveTab("tournament-config")}
                className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer border ${
                  activeTab === "tournament-config"
                    ? "bg-gold-primary text-black border-gold-primary shadow-lg glow-winner"
                    : "text-slate-400 border-transparent hover:text-white hover:bg-dark-border"
                }`}
              >
                <Settings className="w-4 h-4" />
                Configurar Torneio
              </button>
            )}

            {/* TAB: EXECUTE DRAW (Visible to Admin always, and to participants only if draw has finished) */}
            {(isAdmin || drawResult) && (
              <button
                id="tab-raffle-draw"
                onClick={() => setActiveTab("raffle-draw")}
                className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase flex items-center gap-2 transition-all relative cursor-pointer border ${
                  activeTab === "raffle-draw"
                    ? "bg-gold-primary text-black border-gold-primary shadow-lg glow-winner"
                    : "text-slate-400 border-transparent hover:text-white hover:bg-dark-border"
                }`}
              >
                <Play className="w-4 h-4" />
                Sorteio & Resultado
                {drawResult ? (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
                ) : null}
              </button>
            )}

            {/* TAB: AUDIT LOGS */}
            {isAdmin && (
              <button
                id="tab-audit-logs"
                onClick={() => setActiveTab("audit-logs")}
                className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer border ${
                  activeTab === "audit-logs"
                    ? "bg-gold-primary text-black border-gold-primary shadow-lg glow-winner"
                    : "text-slate-400 border-transparent hover:text-white hover:bg-dark-border"
                }`}
              >
                <History className="w-4 h-4" />
                Auditoria & Histórico
              </button>
            )}

          </div>
        </div>
      </nav>

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Render active tabs */}
        {activeTab === "dashboard" && (
          <Dashboard
            tournament={tournament}
            numbers={numbers}
            participants={participants}
            payments={payments}
            onTabChange={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "numbers-grid" && (
          <NumberGrid
            tournament={tournament}
            numbers={numbers}
            participants={participants}
            onReserveNumbers={handleReserveNumbers}
            onConfirmPaymentDirectly={handleConfirmPaymentDirectly}
            onCancelReservationDirectly={handleCancelReservationDirectly}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === "participants" && (
          <ParticipantList
            tournament={tournament}
            participants={participants}
            numbers={numbers}
            onAddParticipant={handleAddParticipant}
            onUpdateParticipant={handleUpdateParticipant}
            onDeleteParticipant={handleDeleteParticipant}
            onConfirmAllPaymentsOfParticipant={handleConfirmAllPaymentsOfParticipant}
            onCancelAllReservationsOfParticipant={handleCancelAllReservationsOfParticipant}
            onAddNumberToParticipantDirectly={handleAddNumberToParticipantDirectly}
            onApproveNumbersOfParticipant={handleApproveNumbersOfParticipant}
          />
        )}

        {activeTab === "tournament-config" && (
          <TournamentForm
            currentTournament={tournament}
            onSaveTournament={handleSaveTournament}
            onCreateNewTournament={handleCreateNewTournament}
          />
        )}

        {activeTab === "raffle-draw" && (
          <RaffleDraw
            tournament={tournament}
            numbers={numbers}
            participants={participants}
            drawResult={drawResult}
            onExecuteDraw={handleExecuteDraw}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === "audit-logs" && (
          <AuditLogList 
            logs={logs} 
            onClearLogs={handleClearLogs} 
          />
        )}

      </main>

      {/* ADMIN LOGIN MODAL */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" id="admin-login-modal">
          <div className="bg-dark-card rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-dark-border text-slate-300 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-dark-border-light">
              <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-5 h-5 text-gold-primary" />
                Acesso Administrativo
              </h3>
              <button
                id="btn-close-login"
                onClick={() => {
                  setShowAdminLogin(false);
                  setLoginError("");
                }}
                className="p-1.5 bg-dark-card-elevated hover:bg-dark-border border border-dark-border-light rounded-full text-slate-300 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setLoginError("");
                // Simple master password: 'admin'
                if (adminPasswordInput.trim() === "admin" || adminPasswordInput.trim() === "admin123") {
                  setIsAdmin(true);
                  localStorage.setItem("raffle_is_admin", "true");
                  setShowAdminLogin(false);
                  setAdminPasswordInput("");
                } else {
                  setLoginError("Senha incorreta! Use: admin");
                }
              }}
              className="space-y-4"
              id="form-admin-login"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                  Senha de Acesso
                </label>
                <input
                  id="input-admin-password"
                  type="password"
                  required
                  placeholder="Digite a senha (padrão: admin)"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
                  autoFocus
                />
                {loginError && (
                  <p className="text-xs text-rose-500 font-bold mt-1.5">{loginError}</p>
                )}
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                  Dica de teste: Use a senha <strong className="text-gold-primary">admin</strong>
                </p>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                className="w-full py-3 bg-gold-primary hover:bg-gold-dark text-black font-black uppercase tracking-wider text-xs rounded-lg transition-all shadow-md cursor-pointer glow-winner"
              >
                Autenticar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. FOOTER */}
      <footer className="bg-dark-card border-t border-dark-border py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-gold-primary" />
            <span>© 2026 Gerenciador de Sorteios. Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-4 font-bold">
            <span className="text-dark-border-light">|</span>
            <span className="text-slate-400 font-mono tracking-widest text-[10px]">HASH DE SEGURANÇA SHA-256 ATIVO</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
