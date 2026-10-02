import React, { useState } from 'react';
import { useAuth, PIX_OFFICIAL_KEY, PIX_FORMATTED_KEY, SUBSCRIPTION_PRICE } from '../context/AuthContext';
import { BounceFinLogo } from './BounceFinLogo';
import {
  Lock,
  QrCode,
  Check,
  Copy,
  Clock,
  Sparkles,
  ArrowRight,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  HelpCircle,
} from 'lucide-react';

export const SubscriptionBlockView: React.FC = () => {
  const { user, subscriptionStatus, logout, informPixPayment, resetTrial } = useAuth();
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(PIX_OFFICIAL_KEY);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleInformPayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await informPixPayment();
      setSubmissionFeedback(res);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial highlights */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full relative z-10 space-y-6">
        {/* Header / Brand */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BounceFinLogo size="lg" showText={true} showSlogan={true} variant="light" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mt-4">
            <Clock className="w-3.5 h-3.5" />
            <span>Período de teste gratuito de 35 dias finalizado</span>
          </div>
        </div>

        {/* Main Subscription Card */}
        <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Assinatura BounceFIN
              </h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Seus 35 dias de teste grátis foram concluídos. Para continuar organizando seu dinheiro com segurança e privacidade total, ative sua assinatura via Pix por apenas <strong>R$ 4,99</strong>.
              </p>
            </div>
          </div>

          {/* Pricing Highlight Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Pagamento via Pix
              </span>
              <div className="text-3xl font-black text-slate-900 mt-0.5">
                R$ 4,99 <span className="text-xs font-medium text-slate-500">/mês (30 dias de acesso)</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Sem renovação automática abusiva no cartão. Você paga mês a mês via Pix.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Liberação por 30 dias</span>
            </div>
          </div>

          {/* PIX Details Area */}
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-slate-900">
                Dados para Pagamento via Pix
              </h3>
            </div>

            {/* Pix Box */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-slate-900 text-white">
              {/* QR Code Illustration */}
              <div className="w-24 h-24 bg-white p-2 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                  <rect x="10" y="10" width="25" height="25" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="18" y="18" width="9" height="9" fill="currentColor" />
                  <rect x="65" y="10" width="25" height="25" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="73" y="18" width="9" height="9" fill="currentColor" />
                  <rect x="10" y="65" width="25" height="25" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="18" y="73" width="9" height="9" fill="currentColor" />
                  <circle cx="50" cy="50" r="10" fill="#10b981" />
                  <rect x="42" y="15" width="16" height="6" fill="currentColor" />
                  <rect x="42" y="27" width="16" height="6" fill="currentColor" />
                  <rect x="15" y="42" width="6" height="16" fill="currentColor" />
                  <rect x="27" y="42" width="6" height="16" fill="currentColor" />
                  <rect x="65" y="42" width="25" height="6" fill="currentColor" />
                  <rect x="65" y="55" width="15" height="6" fill="currentColor" />
                  <rect x="42" y="65" width="16" height="25" fill="currentColor" />
                  <rect x="65" y="70" width="25" height="20" fill="currentColor" />
                </svg>
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Chave Pix
                </span>
                <div className="font-mono text-base sm:text-lg font-black bg-slate-800 px-3.5 py-2 rounded-xl text-emerald-300 border border-slate-700 tracking-wide flex items-center justify-between gap-2">
                  <span>{PIX_OFFICIAL_KEY}</span>
                </div>
                <div className="pt-1">
                  <button
                    onClick={handleCopyPix}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Chave Copiada!' : 'COPIAR CHAVE PIX'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Instruction steps */}
            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside bg-slate-50 p-4 rounded-xl border border-slate-200">
              <li>Abra o aplicativo do seu banco de preferência;</li>
              <li>Acesse a área <strong>Pix &gt; Transferir</strong>;</li>
              <li>Cole a chave Pix: <strong>{PIX_OFFICIAL_KEY}</strong>;</li>
              <li>Confira o valor de <strong>R$ 4,99</strong> e confirme a transferência;</li>
              <li>Clique no botão <strong>"JÁ REALIZEI O PAGAMENTO"</strong> abaixo para informar a administração.</li>
            </ol>

            {/* Status Feedback */}
            {submissionFeedback ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Hourglass className="w-4 h-4 text-amber-600 animate-spin" />
                  <span>Pagamento Informado com Sucesso!</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Obrigado! Sua notificação de pagamento foi registrada no sistema administrativo. A administração verificará o recebimento de R$ 4,99 e sua conta será liberada.
                </p>
              </div>
            ) : subscriptionStatus.hasInformedPayment ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Aguardando Validação da Administração</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Você já informou o pagamento via Pix de R$ 4,99. Nossa equipe administrativa validará a compensação e ativará sua assinatura. Você pode recarregar a página periodicamente.
                </p>
              </div>
            ) : (
              <button
                onClick={handleInformPayment}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registrando solicitação...</span>
                  </>
                ) : (
                  <>
                    <span>JÁ REALIZEI O PAGAMENTO</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* User info & Sign out */}
          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Conectado como <strong className="text-slate-800">{user?.email}</strong>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={resetTrial}
                title="Para fins de teste e desenvolvimento"
                className="text-slate-400 hover:text-slate-600 underline text-[11px]"
              >
                Resetar Teste (35 dias)
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Trocar de Conta</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
