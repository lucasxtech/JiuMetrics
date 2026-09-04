// Cadastro rápido de atleta/adversário — agora sobre o `Modal` comum e o
// `PersonForm` único (spec 013). Antes tinha overlay e formulário próprios.
import Modal from './Modal';
import PersonForm from '../forms/PersonForm';
import { personLabels } from '../../constants/persons';

/**
 * @param {{ isOpen: boolean, onClose: () => void, type: 'athlete'|'opponent',
 *   onSuccess: (values: { name: string, belt: string }) => Promise<unknown> }} props
 *   `onSuccess` recebe os valores e é quem cria o registro; o modal fecha se
 *   a promessa resolver e mostra o erro se rejeitar.
 */
export default function QuickAddModal({ isOpen, onClose, type, onSuccess }) {
  const labels = personLabels(type);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cadastro rápido"
      subtitle={`Novo ${labels.singular.toLowerCase()}`}
      size="sm"
    >
      <PersonForm
        type={type}
        submitLabel="Cadastrar"
        onSubmit={async (values) => {
          await onSuccess(values);
          onClose();
        }}
      />
    </Modal>
  );
}
