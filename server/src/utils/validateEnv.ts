import { cleanEnv, str, port } from 'envalid';

const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    CORS_ORIGIN: str(),
    SSO_API_URL: str(),
    SSO_CLIENT_ID: str(),
    SSO_CLIENT_SECRET: str(),
    SSO_CALLBACK_URL: str(),
    ACCESS_TOKEN_SECRET: str(),
  });
};

export default validateEnv;
