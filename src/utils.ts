/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formata um valor numérico para a abreviação em K (milhares) ou KK (milhões).
 * Internamente armazenado como inteiro, mas exibido de forma abreviada e legível.
 * 
 * Exemplos:
 * - 100.000 = 100K
 * - 1.000.000 = 1KK
 * - 2.500.000 = 2,5KK
 */
export function formatarValor(valor: number): string {
  if (valor >= 1000000) {
    const resultado = valor / 1000000;
    return `${resultado.toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
    })}KK`;
  }

  if (valor >= 1000) {
    const resultado = valor / 1000;
    return `${resultado.toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
    })}K`;
  }

  return valor.toLocaleString("pt-BR");
}

/**
 * Formata uma data ISO em string legível formato PT-BR (DD/MM/AAAA)
 */
export function formatarData(dataIso: string): string {
  if (!dataIso) return "-";
  try {
    const data = new Date(dataIso);
    return data.toLocaleDateString("pt-BR");
  } catch (e) {
    return dataIso;
  }
}

/**
 * Formata uma data e hora ISO em formato PT-BR (DD/MM/AAAA HH:MM)
 */
export function formatarDataHora(dataIso: string): string {
  if (!dataIso) return "-";
  try {
    const data = new Date(dataIso);
    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dataIso;
  }
}

/**
 * Padroniza número visual (ex: 7 -> "007", 27 -> "027", 105 -> "105")
 */
export function padronizarNumero(num: number, maxNum: number = 100): string {
  const largura = String(maxNum).length;
  return String(num).padStart(largura, "0");
}

/**
 * Gera um hash aleatório de auditoria ou sorteio
 */
export function gerarHash(): string {
  return Math.random().toString(16).substring(2, 10).toUpperCase() + 
         Math.random().toString(16).substring(2, 10).toUpperCase();
}
