import apiClient from './client';

export interface TourScene {
  id: string;
  externalSceneId: string;
  panoramaUrl: string;
  thumbnailUrl: string | null;
  label: string | null;
  displayOrder: number;
  floor: number;
  shelves: TourShelf[];
}

export interface TourShelf {
  id: string;
  label: string;
  yaw: string;
  pitch: string;
  shelfImageUrl: string | null;
  displayOrder: number;
}

export interface Tour {
  id: string;
  storeId: string;
  version: number;
  status: 'processing' | 'active' | 'archived';
  isBaseline: boolean;
  sceneCount: number;
  shelfCount: number;
  capturedBy: string | null;
  createdAt: string;
  scenes?: TourScene[];
}

export const toursApi = {
  async getActiveForStore(storeId: string) {
    const res = await apiClient.get(`/tours/stores/${storeId}/active`);
    return res.data as { success: boolean; data: Tour | null };
  },
  async getById(id: string) {
    const res = await apiClient.get(`/tours/${id}`);
    return res.data as { success: boolean; data: Tour };
  },
  async list(params?: { storeId?: string; status?: string; page?: number; perPage?: number }) {
    const res = await apiClient.get('/tours', { params });
    return res.data as { success: boolean; data: { data: Tour[]; total: number; totalPages: number } };
  },
};
