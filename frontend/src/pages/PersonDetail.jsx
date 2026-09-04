// Detalhe de atleta OU adversário (spec 013). Substitui `AthleteDetail.jsx`
// (697 linhas, 15 `useState`, `useEffect` cru sem invalidação de cache).
//
// Toda leitura passa por React Query e toda escrita invalida o que leu —
// é isso que fecha o bug da lista desatualizada por 5 minutos após apagar
// ou trocar a faixa.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePerson, usePersonMutations, personKey, personAnalysesKey } from '../hooks/usePersons';
import { personLabels } from '../constants/persons';
import { getAnalysesByPerson, deleteAnalysis } from '../services/fightAnalysisService';
import { consolidateProfile } from '../services/aiService';
import { saveProfileSummary } from '../services/chatService';
import { useAnalysisProgress } from '../contexts/AnalysisProgressContext';
import PersonHeader from '../components/person/PersonHeader';
import TechnicalSummaryPanel from '../components/person/TechnicalSummaryPanel';
import AnalysesSection from '../components/person/AnalysesSection';
import PersonDetailSkeleton from '../components/person/PersonDetailSkeleton';
import PersonForm from '../components/forms/PersonForm';
import Modal from '../components/common/Modal';
import ErrorMessage from '../components/common/ErrorMessage';
import ConfirmDeleteModal from '../components/common/ConfirmDeleteModal';
import ProfileSummaryModal from '../components/analysis/ProfileSummaryModal';
import AnalysisDetailModal from '../components/analysis/AnalysisDetailModal';

export default function PersonDetail({ type }) {
  const labels = personLabels(type);
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: person, isLoading, error } = usePerson(type, id);
  const { data: analyses = [], isLoading: loadingAnalyses } = useQuery({
    queryKey: personAnalysesKey(id),
    queryFn: async () => (await getAnalysesByPerson(id))?.data ?? [],
    enabled: Boolean(id),
  });
  const { update, remove } = usePersonMutations(type);
  const { lastSavedPersonId } = useAnalysisProgress();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState(null);

  const refreshPerson = () => queryClient.invalidateQueries({ queryKey: personKey(type, id) });
  const refreshAnalyses = () => queryClient.invalidateQueries({ queryKey: personAnalysesKey(id) });

  // Uma análise nova desta pessoa acabou de ser salva em outra tela. O
  // servidor regenera o resumo DEPOIS de responder (fire-and-forget), sem
  // sinalizar conclusão — o 1s é o mesmo compromisso da versão anterior.
  useEffect(() => {
    if (!lastSavedPersonId || lastSavedPersonId !== id) return undefined;
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: personKey(type, id) });
      queryClient.invalidateQueries({ queryKey: personAnalysesKey(id) });
    }, 1000);
    return () => clearTimeout(timer);
  }, [lastSavedPersonId, id, type, queryClient]);

  const handleBeltChange = async (belt) => {
    if (!belt || belt === person?.belt) return;
    setActionError(null);
    try {
      await update.mutateAsync({ id, data: { belt } });
    } catch {
      setActionError('Não foi possível atualizar a faixa. Tente novamente.');
    }
  };

  const handleEditSubmit = async (values) => {
    await update.mutateAsync({ id, data: values });
    setIsEditing(false);
  };

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(id);
      navigate(labels.route);
    } catch {
      setShowDeleteModal(false);
      setActionError(`Erro ao excluir ${labels.singular.toLowerCase()}. Tente novamente.`);
    }
  };

  const handleGenerateSummary = async () => {
    if (analyses.length === 0) return;
    setGenerating(true);
    setActionError(null);
    try {
      await consolidateProfile(id, type);
      await refreshPerson();
    } catch (err) {
      setActionError(`Erro ao gerar resumo: ${err.response?.data?.error || err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSummaryUpdated = async (newSummary, editReason = 'Atualização de resumo técnico') => {
    await saveProfileSummary(id, type, newSummary, editReason);
    await refreshPerson();
  };

  const confirmDeleteAnalysis = async () => {
    if (!analysisToDelete) return;
    try {
      await deleteAnalysis(analysisToDelete);
      setAnalysisToDelete(null);
      refreshAnalyses();
      // O servidor regenera (ou limpa) o resumo em background após responder.
      setTimeout(refreshPerson, 3000);
    } catch {
      setActionError('Erro ao excluir análise. Tente novamente.');
    }
  };

  if (isLoading) return <PersonDetailSkeleton />;

  if (error || !person) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <ErrorMessage message={error ? `Não foi possível carregar ${labels.article}.` : `${labels.singular} não encontrado.`} />
        <button
          type="button"
          onClick={() => navigate(labels.route)}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-white shadow-sm hover:bg-slate-700"
        >
          Voltar para {labels.plural.toLowerCase()}
        </button>
      </div>
    );
  }

  // Sem consolidação salva, mostra o resumo da última análise (a regeneração
  // em background é tolerante a falha — pode não ter acontecido).
  const summary = person.technicalSummary || analyses[0]?.summary || null;
  const summaryIsFallback = !person.technicalSummary && Boolean(summary);
  const summaryUpdatedAt = person.technicalSummaryUpdatedAt || analyses[0]?.createdAt || null;

  return (
    <div className="space-y-6">
      <PersonHeader
        person={person}
        type={type}
        savingBelt={update.isPending}
        onBeltChange={handleBeltChange}
        onBack={() => navigate(labels.route)}
        onEdit={() => setIsEditing(true)}
        onDelete={() => setShowDeleteModal(true)}
      />

      {actionError && <ErrorMessage message={actionError} onDismiss={() => setActionError(null)} />}

      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title={`Editar ${labels.singular.toLowerCase()}`}
        size="md"
      >
        <PersonForm type={type} initialData={person} onSubmit={handleEditSubmit} submitLabel="Salvar" />
      </Modal>

      <TechnicalSummaryPanel
        summary={summary}
        isFallback={summaryIsFallback}
        updatedAt={summaryUpdatedAt}
        analysesCount={analyses.length}
        generating={generating}
        onGenerate={handleGenerateSummary}
        onOpenDetails={() => setShowProfileModal(true)}
      />

      <AnalysesSection
        analyses={analyses}
        loading={loadingAnalyses}
        onNew={() => navigate('/analyze-video')}
        onDelete={(analysisId) => setAnalysisToDelete(analysisId)}
        onViewDetails={setSelectedAnalysis}
      />

      {person.videoUrl && (
        <section className="panel">
          <div className="panel__head mb-4">
            <p className="eyebrow">Referências</p>
            <h3 className="panel__title">Vídeo de referência</h3>
          </div>
          <a
            href={person.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 break-all text-indigo-600 underline decoration-dotted hover:text-indigo-700"
          >
            {person.videoUrl}
          </a>
        </section>
      )}

      {selectedAnalysis && (
        <AnalysisDetailModal
          analysis={selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
          onAnalysisUpdated={(updated) => {
            queryClient.setQueryData(personAnalysesKey(id), (prev = []) =>
              prev.map((a) => (a.id === updated.id ? updated : a))
            );
            setSelectedAnalysis(updated);
          }}
        />
      )}

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={`Excluir ${labels.singular}`}
        message="Essa ação é permanente. As análises de vídeo já feitas não são apagadas junto."
        itemName={person.name}
        confirmText={remove.isPending ? 'Removendo...' : 'Sim, excluir'}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(analysisToDelete)}
        onClose={() => setAnalysisToDelete(null)}
        onConfirm={confirmDeleteAnalysis}
        title="Excluir análise"
        message="Deseja remover esta análise? Esta ação não pode ser desfeita."
      />

      {showProfileModal && summary && (
        <ProfileSummaryModal
          person={person}
          personType={type}
          currentSummary={summary}
          lastUpdated={summaryUpdatedAt}
          onClose={() => setShowProfileModal(false)}
          onSummaryUpdated={handleSummaryUpdated}
        />
      )}
    </div>
  );
}
