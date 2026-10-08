import { APP_NAME } from '@/lib/config';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Copy, Users, DollarSign, Clock, Check, Gift, Share2, TrendingUp, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function Referral() {
  const { user } = useAuth();
  const [linkData, setLinkData] = useState<{ code: string; url: string } | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, pending: 0, closed: 0, total_earned: 0, total_pending: 0 });

  useEffect(() => {
    api.get<{ code: string; url: string }>('/referrals/my-link').then(setLinkData);
    api.get<{ referrals: any[]; stats: any }>('/referrals/my-referrals').then((data) => {
      setReferrals(data.referrals);
      setStats(data.stats);
    });
  }, []);

  const copyLink = () => {
    if (!linkData) return;
    navigator.clipboard.writeText(linkData.url);
    toast.success('Link copiado!');
  };

  const shareLink = () => {
    if (!linkData) return;
    const text = `Estou em ${APP_NAME} e estou indicando você! Preencha a ficha: ${linkData.url}`;
    if (navigator.share) {
      navigator.share({ title: `${APP_NAME} — Indicação`, text, url: linkData.url });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'Aguardando contato', color: 'bg-yellow-500/20 text-yellow-400' },
    contacted: { label: 'Em negociação', color: 'bg-blue-500/20 text-blue-400' },
    closed: { label: 'Fechado!', color: 'bg-green-500/20 text-green-400' },
    lost: { label: 'Não fechou', color: 'bg-gray-500/20 text-gray-400' },
  };

  const commissionLabels: Record<string, { label: string; color: string }> = {
    none: { label: '', color: '' },
    pending: { label: 'A receber', color: 'text-yellow-400' },
    paid: { label: 'Pago', color: 'text-green-400' },
  };

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
            <Gift size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Programa de <span className="gradient-text">Indicação</span></h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Indique pessoas para {APP_NAME} e ganhe <strong className="text-white">10% de comissão</strong> sobre cada venda fechada.
          </p>
        </motion.div>

        {/* Como funciona */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Share2, title: 'Compartilhe', desc: 'Envie seu link único para seus contatos' },
            { icon: Users, title: 'Indicado aplica', desc: 'Ele preenche a ficha de seleção' },
            { icon: DollarSign, title: 'Ganhe comissão', desc: '10% de comissão por venda fechada' },
          ].map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-3">
                <step.icon size={20} className="text-white" />
              </div>
              <h3 className="font-bold text-sm mb-1">{step.title}</h3>
              <p className="text-xs text-gray-500">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Link de indicação */}
        <div className="card mb-8">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Share2 size={16} className="text-red-500" /> Seu link de indicação</h3>
          <div className="flex gap-3">
            <div className="flex-1 flex items-center px-4 py-3 rounded-lg text-sm font-mono truncate" style={{ background: 'hsl(var(--muted))' }}>
              {linkData?.url || 'Gerando...'}
            </div>
            <button onClick={copyLink} className="btn-primary !px-4 flex items-center gap-2 text-sm">
              <Copy size={14} /> Copiar
            </button>
            <button onClick={shareLink} className="btn-secondary !px-4 flex items-center gap-2 text-sm">
              <Share2 size={14} /> Enviar
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Sua comissão: <strong className="text-green-400">10%</strong> por venda fechada
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-500">Indicações</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.pending}</div>
            <div className="text-xs text-gray-500">Em andamento</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-400">R${stats.total_earned?.toFixed(0) || 0}</div>
            <div className="text-xs text-gray-500">Recebido</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-400">R${stats.total_pending?.toFixed(0) || 0}</div>
            <div className="text-xs text-gray-500">A receber</div>
          </div>
        </div>

        {/* Lista de indicações */}
        <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-gray-400" /> Suas indicações</h3>
        {referrals.length === 0 ? (
          <div className="card text-center py-10">
            <Users size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">Nenhuma indicação ainda.</p>
            <p className="text-sm text-gray-500 mt-1">Compartilhe seu link e comece a ganhar!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref) => (
              <div key={ref.id} className="card !p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-red-500">{ref.full_name?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{ref.full_name}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(ref.created_at)} | {ref.payment_preference === 'avista' ? 'À vista' : 'Parcelado'}
                  </div>
                </div>
                <span className={`badge text-xs ${statusLabels[ref.status]?.color}`}>
                  {statusLabels[ref.status]?.label}
                </span>
                {ref.commission_status !== 'none' && (
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-bold ${commissionLabels[ref.commission_status]?.color}`}>
                      R${ref.commission_amount?.toFixed(0)}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {ref.commission_status === 'pending' && ref.commission_due_date
                        ? `Recebe em ${formatDate(ref.commission_due_date)}`
                        : ref.commission_status === 'paid' ? 'Pago' : ''}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
