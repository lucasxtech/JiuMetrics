import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadVideo } from '../videoUploadService';
import api from '../api';

let lastFormDataInstance;

class MockFormData {
  constructor() {
    this.entries = [];
    lastFormDataInstance = this;
  }

  append(key, value) {
    this.entries.push([key, value]);
  }
}

// eslint-disable-next-line no-undef
global.FormData = MockFormData;

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('videoUploadService', () => {
  beforeEach(() => {
    api.post.mockReset();
    lastFormDataInstance = undefined;
  });

  it('monta o FormData com os metadados obrigatórios', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    const payload = {
      videos: [
        { file: { name: 'luta.mp4', type: 'video/mp4' }, giColor: 'azul' }
      ],
      athleteName: 'Maria Santos',
      personId: '1',
      personType: 'athlete',
    };

    const response = await uploadVideo(payload);

    expect(api.post).toHaveBeenCalledWith('/video/upload', expect.any(FormData), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    expect(response).toEqual({ success: true });
    expect(lastFormDataInstance.entries).toEqual([
      ['videos', payload.videos[0].file],
      ['giColors[0]', payload.videos[0].giColor],
      ['personId', payload.personId],
      ['personType', payload.personType],
      ['athleteName', payload.athleteName],
    ]);
  });
});
