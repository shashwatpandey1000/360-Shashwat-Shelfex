export { default as SurveyList } from './components/SurveyList';
export { default as SurveyDetail } from './components/SurveyDetail';
export { useSurveysQuery, useSurveyByIdQuery } from './queries';
export { surveysApi } from './api';
export type { Survey, SurveyPhoto } from './api';
// SurveyDetail type re-exported with alias to avoid collision with the component
export type { SurveyDetail as SurveyDetailType } from './api';
