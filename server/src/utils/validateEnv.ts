import { cleanEnv, str, port } from 'envalid';

const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    DATABASE_URL: str(),
    CORS_ORIGIN: str(),
    SSO_API_URL: str(),
    SSO_CLIENT_ID: str(),
    SSO_CLIENT_SECRET: str(),
    SSO_CALLBACK_URL: str(),
    ACCESS_TOKEN_SECRET: str(),
    RESEND_API_KEY: str(),
    RESEND_FROM_EMAIL: str(),
    SSO_FRONTEND_URL: str(),
    INTROSPECT_API_KEY: str(),
    // Optional — S3 presigned URL generation falls through if absent
    AWS_ACCESS_KEY_ID: str({ default: '' }),
    AWS_SECRET_ACCESS_KEY: str({ default: '' }),
    AWS_S3_BUCKET: str({ default: '' }),
    AWS_S3_REGION: str({ default: 'us-west-2' }),
    // Optional — used in email links
    CLIENT_URL: str({ default: 'http://localhost:3001' }),
  });
};

export default validateEnv;
