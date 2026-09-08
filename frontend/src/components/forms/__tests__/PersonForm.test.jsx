import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PersonForm from '../PersonForm';

describe('PersonForm', () => {
  it('não vaza campos do registro que o formulário não coleta', async () => {
    // A tela antiga mandava `initialData` inteiro de volta, e era isso que
    // deixava um `technicalSummary` velho em memória sobrescrever o resumo
    // regenerado em background (spec 013).
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
          technicalProfile: { x: 1 },
          analysesCount: 3,
        }}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Roxa' }));
    fireEvent.click(screen.getByRole('button', { name: /salvar atleta/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual({ name: 'Ana', belt: 'Roxa' });
    expect(payload).not.toHaveProperty('technicalSummary');
    expect(payload).not.toHaveProperty('technicalProfile');
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('userId');
  });

  it('envia os campos opcionais preenchidos, com os números como número', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<PersonForm type="athlete" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/nome do atleta/i), { target: { value: 'Bruno' } });
    fireEvent.click(screen.getByRole('button', { name: /dados opcionais/i }));
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '82.5' } });
    fireEvent.change(screen.getByLabelText(/estilo/i), { target: { value: 'Passador' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar atleta/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Bruno',
      belt: 'Branca',
      weight: 82.5,
      style: 'Passador',
    });
  });

  it('campo opcional vazio na criação não é enviado (fica null no banco)', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<PersonForm type="athlete" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/nome do atleta/i), { target: { value: 'Carla' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar atleta/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Carla', belt: 'Branca' });
  });

  it('limpar um campo que tinha valor envia null explícito', async () => {
    // Omitir a chave faria o backend preservar o valor antigo — o usuário
    // apagaria o campo na tela e ele voltaria.
    const onSubmit = vi.fn().mockResolvedValue({});
    render(
      <PersonForm
        type="athlete"
        initialData={{ id: 'a1', name: 'Dora', belt: 'Preta', weight: 70, age: 30 }}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /dados opcionais/i }));
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar atleta/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.weight).toBeNull();
    expect(payload.age).toBe(30);
  });

  it('em modo compacto pede só nome e faixa', () => {
    render(<PersonForm type="opponent" compact onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/nome do adversário/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Preta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dados opcionais/i })).not.toBeInTheDocument();
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
