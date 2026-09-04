import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PersonForm from '../PersonForm';

describe('PersonForm', () => {
  it('envia SÓ { name, belt }, mesmo quando initialData traz o registro inteiro', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(
      <PersonForm
        type="athlete"
        initialData={{
          id: 'a1',
          name: 'Ana',
          belt: 'Azul',
          userId: 'u1',
          technicalSummary: 'RESUMO VELHO',
          analysesCount: 3,
        }}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Roxa' }));
    fireEvent.click(screen.getByRole('button', { name: /salvar atleta/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ana', belt: 'Roxa' });
  });

  it('não submete sem nome e mostra o erro do campo', async () => {
    const onSubmit = vi.fn();
    render(<PersonForm type="opponent" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/nome do adversário/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar adversário/i }));

    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('mostra as mensagens de validação devolvidas pela API (issues do zod)', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: { data: { error: 'Dados inválidos', issues: [{ campo: 'belt', mensagem: 'belt inválida' }] } },
    });
    render(<PersonForm type="athlete" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/nome do atleta/i), { target: { value: 'Bruno' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar atleta/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('belt inválida');
  });

  it('limpa o formulário após criar, mas não após editar', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    const { unmount } = render(<PersonForm type="athlete" onSubmit={onSubmit} />);
    const input = screen.getByLabelText(/nome do atleta/i);
    fireEvent.change(input, { target: { value: 'Carla' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar atleta/i }));
    await waitFor(() => expect(input).toHaveValue(''));
    unmount();

    render(<PersonForm type="athlete" initialData={{ id: 'x', name: 'Dora', belt: 'Preta' }} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /salvar atleta/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Dora', belt: 'Preta' }));
    expect(screen.getByLabelText(/nome do atleta/i)).toHaveValue('Dora');
  });
});
