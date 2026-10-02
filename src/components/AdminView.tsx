import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PaymentRequest, UserProfile } from '../types';
import { getStoredUsers } from '../utils/storage';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  UserCheck,
  UserX,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  BadgeAlert,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export const AdminView: React.FC = () => {
  const {
    user,
    paymentRequests,
    adminConfirmPayment,
    adminRejectPayment,
    adminToggleUserSubscription,
  } = useAuth();

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'informed' | 'confirmed' | 'pending' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'payments' | 'users'>('payments');

  const refreshUsers = () => {
    setAllUsers(getStoredUsers());
  };

  useEffect(() => {
    refreshUsers();
  }, [paymentRequests]);

  // Admin security check
  if (user?.role !== 'admin') {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl p-8 text-center max-w-lg mx-auto my-12 space-y-4">
        <BadgeAlert className="w-12 h-12 text-rose-600 mx-auto" />
        <h2 className="text-xl font-black">Acesso Restrito ao Administrador</h2>
        <p className="text-xs text-rose-700">
          Esta área é restrita à administração do BounceFIN para controle de assinaturas, usuários e validação de pagamentos Pix.
        </p>
      </div>
    );
  }

  // Filter payment requests
  const filteredRequests = paymentRequests.filter(req => {
    const matchesFilter = filterStatus === 'all' ? true : req.status === filterStatus;
    const matchesSearch =
      req.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Filter users
  const filteredUsers = allUsers.filter(u => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const pendingCount = paymentRequests.filter(r => r.status === 'informed').length;
  const confirmedCount = paymentRequests.filter(r => r.status === 'confirmed').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
              Painel Administrativo
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Administrador Conectado
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Gestão de Pagamentos e Assinaturas</h1>
          <p className="text-xs text-slate-500">
            Validação manual de comprovantes Pix de R$ 4,99 e controle geral de contas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('payments')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'payments'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Solicitações Pix</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'users'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Todos Usuários ({allUsers.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Aguardando Validação
            </span>
            <span className="text-2xl font-black text-amber-900 mt-1 block">
              {pendingCount}
            </span>
            <span className="text-[11px] text-slate-400">Usuários que clicaram em "Já realizei"</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Assinaturas Ativas
            </span>
            <span className="text-2xl font-black text-emerald-900 mt-1 block">
              {allUsers.filter(u => u.isSubscribed).length}
            </span>
            <span className="text-[11px] text-slate-400">Acesso liberado pós-teste</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              Receita Pix Acumulada
            </span>
            <span className="text-2xl font-black text-blue-900 mt-1 block">
              {formatCurrency(confirmedCount * 4.99)}
            </span>
            <span className="text-[11px] text-slate-400">{confirmedCount} confirmações de R$ 4,99</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'payments' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Controls bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por e-mail ou nome..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Filtrar:</span>
              {(['all', 'informed', 'confirmed', 'pending', 'rejected'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    filterStatus === status
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status === 'all' && 'Todos'}
                  {status === 'informed' && 'Aguardando Aprovação'}
                  {status === 'confirmed' && 'Aprovados'}
                  {status === 'pending' && 'Apenas Solicitados'}
                  {status === 'rejected' && 'Recusados'}
                </button>
              ))}
            </div>
          </div>

          {/* Table / List */}
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Nenhuma solicitação encontrada</p>
              <p className="text-xs">Quando um usuário clicar em "Já realizei o pagamento via Pix", a solicitação aparecerá aqui para você aprovar.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              {filteredRequests.map(req => {
                const isPendingAction = req.status === 'informed' || req.status === 'pending';

                return (
                  <div
                    key={req.id}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors ${
                      req.status === 'informed' ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{req.userName}</span>
                        <span className="text-xs text-slate-500 font-mono">({req.userEmail})</span>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            req.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : req.status === 'informed'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                              : req.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {req.status === 'informed' && '⏳ Aguardando Aprovação do Pix'}
                          {req.status === 'confirmed' && '✅ Pagamento Confirmado (Assinatura Ativa)'}
                          {req.status === 'rejected' && '❌ Pagamento Recusado'}
                          {req.status === 'pending' && 'Aguardando Envio'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-4 flex-wrap">
                        <span>Valor: <strong className="text-slate-900">R$ {req.amount.toFixed(2)}</strong></span>
                        <span>Chave Pix: <strong className="font-mono text-slate-700">{req.pixKey}</strong></span>
                        <span>Solicitado em: {new Date(req.requestedAt).toLocaleString('pt-BR')}</span>
                        {req.informedAt && (
                          <span className="text-amber-800 font-semibold">
                            Informado pelo cliente em: {new Date(req.informedAt).toLocaleTimeString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {req.status !== 'confirmed' && (
                        <button
                          onClick={() => adminConfirmPayment(req.id)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                          title="Confirmar recebimento do Pix de R$ 4,99 e liberar 30 dias de acesso"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Aprovar Pix (Liberar 30 dias)</span>
                        </button>
                      )}

                      {req.status !== 'rejected' && (
                        <button
                          onClick={() => adminRejectPayment(req.id, 'Não identificado no extrato')}
                          className="px-3 py-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          title="Recusar caso não tenha constado no extrato"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Recusar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Users Management SubTab */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Controle de Contas e Status de Assinatura</h3>
            <span className="text-xs text-slate-400">Total: {filteredUsers.length} usuários</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {filteredUsers.map(u => {
              const regDate = new Date(u.createdAt);
              const daysElapsed = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24));
              const daysLeft = Math.max(0, 35 - daysElapsed);
              const isExpired = daysElapsed >= 35;

              return (
                <div
                  key={u.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                      <span className="text-xs text-slate-500 font-mono">({u.email})</span>
                      {u.role === 'admin' && (
                        <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                      <span>Cadastrado em: {new Date(u.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span>Dias decorridos: {daysElapsed}</span>
                      <span>
                        Status: {u.isSubscribed ? (
                          <strong className="text-emerald-700">
                            Mensalidade Ativa (R$ 4,99/mês)
                            {u.subscriptionExpiresAt ? ` • Vence em: ${new Date(u.subscriptionExpiresAt).toLocaleDateString('pt-BR')}` : ''}
                          </strong>
                        ) : isExpired ? (
                          <strong className="text-rose-700">Teste 35d Expirado (Bloqueado)</strong>
                        ) : (
                          <strong className="text-amber-700">Teste Ativo ({daysLeft} dias restantes)</strong>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        adminToggleUserSubscription(u.id, !u.isSubscribed);
                        refreshUsers();
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        u.isSubscribed
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      }`}
                    >
                      {u.isSubscribed ? (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          <span>Revogar Assinatura</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Liberar 30 dias</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
