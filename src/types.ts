/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TournamentStatus {
  Rascunho = "Rascunho",
  Aberto = "Aberto",
  AguardandoPagamento = "Aguardando pagamentos",
  ProntoParaSorteio = "Pronto para sorteio",
  Finalizado = "Finalizado",
  Cancelado = "Cancelado"
}

export enum NumberStatus {
  Disponivel = "Disponível",
  Reservado = "Reservado",
  Pago = "Pago",
  Bloqueado = "Bloqueado",
  Cancelado = "Cancelado"
}

export enum PaymentStatus {
  Pendente = "Pendente",
  Confirmado = "Confirmado",
  Rejeitado = "Rejeitado"
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  number_start: number;
  number_end: number;
  number_price: number; // 100000 by default (100K)
  status: TournamentStatus;
  opening_date: string;
  draw_date: string;
  winner_number_id?: string; // Links to tournament_number ID or number itself
  confirmed_amount: number;
  prize_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  finished_at?: string;
  is_infinite?: boolean;
}

export interface Participant {
  id: string;
  nickname: string;
  contact_number: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TournamentNumber {
  id: string;
  tournament_id: string;
  participant_id: string;
  number: number; // Formatted visually like 001, 027, etc.
  price: number;
  status: NumberStatus;
  payment_status: PaymentStatus;
  reserved_at?: string;
  paid_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  // Included fields for easy displays
  participant_nickname?: string;
  participant_contact?: string;
}

export interface Payment {
  id: string;
  tournament_id: string;
  participant_id: string;
  participant_nickname: string;
  participant_contact: string;
  numbers: number[]; // List of numbers paid in this batch
  expected_amount: number;
  paid_amount: number;
  status: PaymentStatus;
  proof?: string; // Comprovante / observação do depósito
  notes?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DrawResult {
  id: string;
  tournament_id: string;
  tournament_number_id: string;
  participant_id: string;
  winning_number: number;
  prize_amount: number;
  drawn_at: string;
  drawn_by: string;
  draw_hash: string;
  created_at: string;
  // Extra fields for displaying
  winner_nickname: string;
  winner_contact: string;
  numbers_bought: number;
  winner_investment: number;
}

export interface AuditLog {
  id: string;
  user_id: string; // "admin" or other
  action: string;
  entity: string; // "tournament" | "participant" | "number" | "payment" | "draw"
  entity_id: string;
  old_data?: string; // JSON string or text representation
  new_data?: string; // JSON string or text representation
  created_at: string;
}
