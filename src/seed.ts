/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tournament, Participant, TournamentNumber, Payment, AuditLog, TournamentStatus, NumberStatus, PaymentStatus } from "./types";

const tournamentId = "t1_inauguracao";

export const seedTournament: Tournament = {
  id: tournamentId,
  name: "Torneio de Inauguração - Grande Sorteio",
  description: "Torneio oficial de abertura da plataforma de sorteios. Participe e ganhe o prêmio acumulado de 100% dos números pagos!",
  number_start: 1,
  number_end: 100,
  number_price: 100000, // 100K
  status: TournamentStatus.Aberto,
  opening_date: "2026-07-20",
  draw_date: "2026-07-31",
  confirmed_amount: 600000, // 6 paid numbers
  prize_amount: 600000,
  notes: "Sorteio será transmitido ao vivo pelo canal oficial da comunidade.",
  created_at: "2026-07-20T10:00:00Z",
  updated_at: "2026-07-20T10:00:00Z"
};

export const seedParticipants: Participant[] = [
  {
    id: "p1_playermaster",
    nickname: "PlayerMaster",
    contact_number: "(82) 99999-9999",
    notes: "Doador frequente de prêmios da guilda.",
    created_at: "2026-07-20T10:30:00Z",
    updated_at: "2026-07-20T10:30:00Z"
  },
  {
    id: "p2_gamerchanger",
    nickname: "GamerChanger",
    contact_number: "(11) 98888-8888",
    notes: "Novo membro da guilda principal.",
    created_at: "2026-07-20T11:15:00Z",
    updated_at: "2026-07-20T11:15:00Z"
  },
  {
    id: "p3_luckyvibe",
    nickname: "LuckyVibe",
    contact_number: "(21) 97777-7777",
    notes: "Comprou na última edição e quase ganhou.",
    created_at: "2026-07-21T08:00:00Z",
    updated_at: "2026-07-21T08:00:00Z"
  }
];

export function getSeedNumbers(): TournamentNumber[] {
  const numbers: TournamentNumber[] = [];
  
  // Fill all 100 numbers
  for (let i = 1; i <= 100; i++) {
    let participantId = "";
    let nickname = "";
    let contact = "";
    let status = NumberStatus.Disponivel;
    let payment_status = PaymentStatus.Pendente;
    let reserved_at = undefined;
    let paid_at = undefined;

    if ([7, 27, 44].includes(i)) {
      participantId = "p1_playermaster";
      nickname = "PlayerMaster";
      contact = "(82) 99999-9999";
      status = NumberStatus.Pago;
      payment_status = PaymentStatus.Confirmado;
      reserved_at = "2026-07-20T10:45:00Z";
      paid_at = "2026-07-20T11:00:00Z";
    } else if (i === 12) {
      participantId = "p1_playermaster";
      nickname = "PlayerMaster";
      contact = "(82) 99999-9999";
      status = NumberStatus.Reservado;
      payment_status = PaymentStatus.Pendente;
      reserved_at = "2026-07-21T09:00:00Z";
    } else if ([15, 30, 75].includes(i)) {
      participantId = "p2_gamerchanger";
      nickname = "GamerChanger";
      contact = "(11) 98888-8888";
      status = NumberStatus.Pago;
      payment_status = PaymentStatus.Confirmado;
      reserved_at = "2026-07-20T11:30:00Z";
      paid_at = "2026-07-20T12:00:00Z";
    } else if ([9, 99].includes(i)) {
      participantId = "p3_luckyvibe";
      nickname = "LuckyVibe";
      contact = "(21) 97777-7777";
      status = NumberStatus.Reservado;
      payment_status = PaymentStatus.Pendente;
      reserved_at = "2026-07-21T08:10:00Z";
    }

    numbers.push({
      id: `num_${tournamentId}_${i}`,
      tournament_id: tournamentId,
      participant_id: participantId,
      number: i,
      price: 100000,
      status,
      payment_status,
      reserved_at,
      paid_at,
      created_at: "2026-07-20T10:00:00Z",
      updated_at: "2026-07-20T10:00:00Z",
      participant_nickname: nickname || undefined,
      participant_contact: contact || undefined,
    });
  }
  
  return numbers;
}

export const seedPayments: Payment[] = [
  {
    id: "pay_1",
    tournament_id: tournamentId,
    participant_id: "p1_playermaster",
    participant_nickname: "PlayerMaster",
    participant_contact: "(82) 99999-9999",
    numbers: [7, 27, 44],
    expected_amount: 300000,
    paid_amount: 300000,
    status: PaymentStatus.Confirmado,
    proof: "Depósito PIX de 300K realizado com sucesso.",
    notes: "Aprovado manualmente pelo Admin.",
    confirmed_by: "Administrador",
    confirmed_at: "2026-07-20T11:00:00Z",
    created_at: "2026-07-20T10:45:00Z",
    updated_at: "2026-07-20T11:00:00Z"
  },
  {
    id: "pay_2",
    tournament_id: tournamentId,
    participant_id: "p2_gamerchanger",
    participant_nickname: "GamerChanger",
    participant_contact: "(11) 98888-8888",
    numbers: [15, 30, 75],
    expected_amount: 300000,
    paid_amount: 300000,
    status: PaymentStatus.Confirmado,
    proof: "Comprovante enviado no Discord.",
    notes: "Pagamento verificado em conta bancária.",
    confirmed_by: "Administrador",
    confirmed_at: "2026-07-20T12:00:00Z",
    created_at: "2026-07-20T11:30:00Z",
    updated_at: "2026-07-20T12:00:00Z"
  },
  {
    id: "pay_3",
    tournament_id: tournamentId,
    participant_id: "p1_playermaster",
    participant_nickname: "PlayerMaster",
    participant_contact: "(82) 99999-9999",
    numbers: [12],
    expected_amount: 100000,
    paid_amount: 0,
    status: PaymentStatus.Pendente,
    proof: "Reserva de número extra.",
    notes: "Aguardando envio do comprovante.",
    created_at: "2026-07-21T09:00:00Z",
    updated_at: "2026-07-21T09:00:00Z"
  },
  {
    id: "pay_4",
    tournament_id: tournamentId,
    participant_id: "p3_luckyvibe",
    participant_nickname: "LuckyVibe",
    participant_contact: "(21) 97777-7777",
    numbers: [9, 99],
    expected_amount: 200000,
    paid_amount: 0,
    status: PaymentStatus.Pendente,
    proof: "Prometeu enviar Pix.",
    notes: "Reservas pendentes.",
    created_at: "2026-07-21T08:10:00Z",
    updated_at: "2026-07-21T08:10:00Z"
  }
];

export const seedAuditLogs: AuditLog[] = [
  {
    id: "log_1",
    user_id: "Administrador",
    action: "Criação do torneio",
    entity: "tournament",
    entity_id: tournamentId,
    new_data: JSON.stringify({ name: "Torneio de Inauguração - Grande Sorteio", number_start: 1, number_end: 100 }),
    created_at: "2026-07-20T10:00:00Z"
  },
  {
    id: "log_2",
    user_id: "Administrador",
    action: "Reserva de número",
    entity: "number",
    entity_id: `num_${tournamentId}_7`,
    new_data: JSON.stringify({ number: 7, nickname: "PlayerMaster", status: "Reservado" }),
    created_at: "2026-07-20T10:45:00Z"
  },
  {
    id: "log_3",
    user_id: "Administrador",
    action: "Confirmação de pagamento",
    entity: "payment",
    entity_id: "pay_1",
    new_data: JSON.stringify({ nickname: "PlayerMaster", numbers: [7, 27, 44], paid_amount: 300000 }),
    created_at: "2026-07-20T11:00:00Z"
  },
  {
    id: "log_4",
    user_id: "Administrador",
    action: "Reserva de número",
    entity: "number",
    entity_id: `num_${tournamentId}_15`,
    new_data: JSON.stringify({ number: 15, nickname: "GamerChanger", status: "Reservado" }),
    created_at: "2026-07-20T11:30:00Z"
  },
  {
    id: "log_5",
    user_id: "Administrador",
    action: "Confirmação de pagamento",
    entity: "payment",
    entity_id: "pay_2",
    new_data: JSON.stringify({ nickname: "GamerChanger", numbers: [15, 30, 75], paid_amount: 300000 }),
    created_at: "2026-07-20T12:00:00Z"
  }
];
