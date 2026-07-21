/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AuditLog } from "../types";
import { formatarDataHora } from "../utils";
import { ShieldAlert, Search, Calendar, User, Eye, ArrowRight, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuditLogListProps {
  logs: AuditLog[];
  onClearLogs?: () => void;
}

export default function AuditLogList({ logs, onClearLogs }: AuditLogListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      log.action.toLowerCase().includes(query) ||
      log.entity.toLowerCase().includes(query) ||
      log.user_id.toLowerCase().includes(query) ||
      (log.old_data && log.old_data.toLowerCase().includes(query)) ||
      (log.new_data && log.new_data.toLowerCase().includes(query))
    );
  });

  const getEntityLabel = (entity: string) => {
    switch (entity) {
      case "tournament": return "🗃️ TORNEIO";
      case "participant": return "👤 JOGADOR";
      case "number": return "🔢 NÚMERO";
      case "payment": return "💰 PAGAMENTO";
      case "draw": return "🏆 SORTEIO";
      default: return entity.toUpperCase();
    }
  };

  const parseJsonData = (jsonStr?: string) => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      return jsonStr; // fallback if plain text
    }
  };

  return (
    <div className="space-y-6" id="audit-logs-view">
      
      {/* 1. HEADER ACTION PANEL */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-dark-card p-4 rounded-2xl border border-dark-border shadow-md">
        
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            id="input-search-logs"
            type="text"
            placeholder="Buscar por ação, usuário, dados antigos ou novos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-card-elevated border border-dark-border rounded-xl text-xs text-white focus:bg-dark-card focus:border-gold-primary focus:ring-1 focus:ring-gold-primary outline-none"
          />
        </div>

        {onClearLogs && (
          <button
            onClick={() => {
              if (confirm("Deseja mesmo redefinir o histórico de auditoria? Todas as logs gravadas serão apagadas.")) {
                onClearLogs();
              }
            }}
            className="w-full sm:w-auto px-4 py-2 bg-dark-card-elevated hover:bg-dark-border border border-dark-border-light text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            Limpar Histórico
          </button>
        )}

      </div>

      {/* 2. TABLE AUDIT DATA */}
      <div className="bg-dark-card rounded-3xl border border-dark-border shadow-md overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <ShieldAlert className="w-12 h-12 mx-auto text-slate-500 mb-3" />
            <p className="text-sm font-bold text-white uppercase tracking-wider">Nenhuma log de auditoria encontrada.</p>
            <p className="text-xs text-slate-400 mt-1">Todas as operações relevantes do sistema serão salvas aqui.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="audit-logs-table">
              <thead>
                <tr className="bg-dark-card-elevated border-b border-dark-border text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Data e Hora</th>
                  <th className="py-4 px-6">Usuário</th>
                  <th className="py-4 px-6">Ação Realizada</th>
                  <th className="py-4 px-6">Entidade</th>
                  <th className="py-4 px-6">Dados Novos</th>
                  <th className="py-4 px-6 text-right">Detalhar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border-light text-xs text-slate-300">
                {filteredLogs.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((log) => {
                  const dataNovos = parseJsonData(log.new_data);
                  const displayDetails = typeof dataNovos === "object" ? JSON.stringify(dataNovos).substring(0, 50) + "..." : log.new_data || "-";

                  return (
                    <tr key={log.id} className="hover:bg-dark-border/40 transition-colors" id={`row-audit-log-${log.id}`}>
                      
                      {/* TIMESTAMP */}
                      <td className="py-4 px-6 font-mono font-bold text-slate-400 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {formatarDataHora(log.created_at)}
                        </span>
                      </td>

                      {/* USER ID */}
                      <td className="py-4 px-6 font-black text-slate-100">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gold-primary" />
                          {log.user_id}
                        </span>
                      </td>

                      {/* ACTION DESCRIPTION */}
                      <td className="py-4 px-6 font-bold text-white">
                        {log.action}
                      </td>

                      {/* ENTITY TYPE */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-dark-card-elevated text-gold-primary border border-gold-primary/20 text-[9px] font-bold">
                          {getEntityLabel(log.entity)}
                        </span>
                      </td>

                      {/* NEW DATA PREVIEW */}
                      <td className="py-4 px-6 font-mono text-[10px] text-slate-500 max-w-[200px] truncate">
                        {displayDetails}
                      </td>

                      {/* QUICK DETAILED VIEW */}
                      <td className="py-4 px-6 text-right">
                        <button
                          id={`btn-view-log-details-${log.id}`}
                          onClick={() => setActiveLog(log)}
                          className="p-1.5 hover:bg-dark-card-elevated text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. LOG DETAIL DRAWER/DIALOG */}
      <AnimatePresence>
        {activeLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-dark-border text-slate-300 space-y-6"
              id="audit-log-details-modal"
            >
              <div className="flex items-center justify-between pb-3 border-b border-dark-border-light">
                <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Settings className="w-5 h-5 text-gold-primary animate-spin" />
                  Detalhes do Log de Auditoria
                </h3>
                <button
                  onClick={() => setActiveLog(null)}
                  className="p-1.5 bg-dark-card-elevated hover:bg-dark-border rounded-full text-slate-300 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-dark-card-elevated border border-dark-border p-4 rounded-xl">
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider">Ação</span>
                  <span className="font-bold text-white">{activeLog.action}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider">Data e Hora</span>
                  <span className="font-mono text-slate-300">{formatarDataHora(activeLog.created_at)}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider">Entidade / ID</span>
                  <span className="font-mono text-gold-primary font-bold">
                    {getEntityLabel(activeLog.entity)} ({activeLog.entity_id})
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider">Operador Responsável</span>
                  <span className="font-bold text-white">{activeLog.user_id}</span>
                </div>
              </div>

              {/* JSON COMPARATIVE PANELS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                
                {/* OLD DATA */}
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Dados Anteriores (Antes)</span>
                  <div className="bg-slate-950 text-slate-400 p-3.5 rounded-xl border border-dark-border max-h-48 overflow-y-auto overflow-x-auto whitespace-pre-wrap select-all">
                    {activeLog.old_data ? (
                      JSON.stringify(parseJsonData(activeLog.old_data), null, 2)
                    ) : (
                      <span className="italic text-slate-600">[Nenhum dado anterior]</span>
                    )}
                  </div>
                </div>

                {/* NEW DATA */}
                <div>
                  <span className="block text-[9px] font-black text-gold-primary uppercase mb-1.5 tracking-wider">Dados Novos (Depois)</span>
                  <div className="bg-slate-950 text-gold-primary/80 p-3.5 rounded-xl border border-dark-border max-h-48 overflow-y-auto overflow-x-auto whitespace-pre-wrap select-all">
                    {activeLog.new_data ? (
                      JSON.stringify(parseJsonData(activeLog.new_data), null, 2)
                    ) : (
                      <span className="italic text-slate-600">[Nenhum dado novo]</span>
                    )}
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setActiveLog(null)}
                  className="px-5 py-2.5 bg-dark-card-elevated hover:bg-dark-border border border-dark-border text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
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
