import apiClient from '@/lib/api/client';

export interface Survey {
  id: string;
  storeId: string;
  storeName: string | null;
  surveyorId: string;
  surveyorName: string | null;
  surveyorEmail?: string | null;
  status: 'in_progress' | 'completed' | 'processing';
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  sceneCount: number;
  shelfCount: number;
  scheduleInstanceId: string | null;
  createdAt: string;
}

export interface SurveyDetail extends Survey {
  scenes: {
    id: string;
    externalSceneId: string;
    panoramaUrl: string;
    thumbnailUrl: string | null;
    displayOrder: number;
    photos: SurveyPhoto[];
  }[];
  photos: SurveyPhoto[];
}

export interface SurveyPhoto {
  id: string;
  photoUrl: string;
  thumbnailUrl: string | null;
  photoType: 'shelf' | 'panorama_crop' | 'manual';
  aiStatus: string;
  shelfId: string | null;
}

export const surveysApi = {
  async list(params?: {
    storeId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    perPage?: number;
    sortOrder?: 'asc' | 'desc';
  }) {
    const res = await apiClient.get('/surveys', { params });
    return res.data as {
      success: boolean;
      data: { data: Survey[]; total: number; totalPages: number; page: number; perPage: number };
    };
  },
  async getById(id: string) {
    const res = await apiClient.get(`/surveys/${id}`);
    return res.data as { success: boolean; data: SurveyDetail };
  },
};
