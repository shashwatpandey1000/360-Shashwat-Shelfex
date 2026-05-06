import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import {
  listSurveysSchema,
  mySlotsSchema,
  uploadUrlSchema,
  startSurveySchema,
  submitSceneSchema,
  submitPhotoSchema,
  submitSurveySchema,
} from '../validations/survey.validation';
import {
  startSurvey,
  submitSurvey,
  submitScene,
  submitPhoto,
  listSurveys,
  getSurveyById,
  getMySlots,
  generateUploadUrl,
} from '../services/survey.service';

// POST /surveys/start
export const start = asyncHandler(async (req: Request, res: Response) => {
  const input = startSurveySchema.parse(req.body);
  try {
    const survey = await startSurvey(req.orgId!, req.accessMap!.userId, input);
    ApiResponse.created(res, survey, 'Survey started');
  } catch (err: any) {
    if (err.statusCode === 404) { ApiResponse.notFound(res, err.message); return; }
    if (err.statusCode === 403) { ApiResponse.forbidden(res, err.message); return; }
    if (err.statusCode === 409) { ApiResponse.badRequest(res, err.message); return; }
    throw err;
  }
});

// POST /surveys/:id/scenes
export const addScene = asyncHandler(async (req: Request, res: Response) => {
  const input = submitSceneSchema.parse(req.body);
  try {
    const scene = await submitScene(req.orgId!, req.params['id'] as string, input);
    ApiResponse.created(res, scene, 'Scene submitted');
  } catch (err: any) {
    if (err.statusCode === 404) { ApiResponse.notFound(res, err.message); return; }
    throw err;
  }
});

// POST /surveys/:id/photos
export const addPhoto = asyncHandler(async (req: Request, res: Response) => {
  const input = submitPhotoSchema.parse(req.body);
  try {
    const photo = await submitPhoto(req.orgId!, req.params['id'] as string, input);
    ApiResponse.created(res, photo, 'Photo submitted');
  } catch (err: any) {
    if (err.statusCode === 404) { ApiResponse.notFound(res, err.message); return; }
    throw err;
  }
});

// POST /surveys/:id/submit
export const submit = asyncHandler(async (req: Request, res: Response) => {
  const input = submitSurveySchema.parse(req.body);
  try {
    const survey = await submitSurvey(req.orgId!, req.params['id'] as string, input);
    ApiResponse.success(res, survey, 'Survey submitted');
  } catch (err: any) {
    if (err.statusCode === 404) { ApiResponse.notFound(res, err.message); return; }
    if (err.statusCode === 409) { ApiResponse.badRequest(res, err.message); return; }
    throw err;
  }
});

// GET /surveys/:id/upload-url
export const getUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const input = uploadUrlSchema.parse(req.query);
  const result = generateUploadUrl(req.params['id'] as string, input);
  ApiResponse.success(res, result);
});

// GET /surveys
export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = listSurveysSchema.parse(req.query);
  const result = await listSurveys(req.orgId!, query, req.accessMap!);
  ApiResponse.success(res, result);
});

// GET /surveys/:id
export const detail = asyncHandler(async (req: Request, res: Response) => {
  const survey = await getSurveyById(req.orgId!, req.params['id'] as string, req.accessMap!);
  if (!survey) { ApiResponse.notFound(res, 'Survey not found'); return; }
  ApiResponse.success(res, survey);
});

// GET /surveys/my-slots
export const mySlots = asyncHandler(async (req: Request, res: Response) => {
  const query = mySlotsSchema.parse(req.query);
  const result = await getMySlots(req.accessMap!.userId, req.orgId!, query);
  ApiResponse.success(res, result);
});
