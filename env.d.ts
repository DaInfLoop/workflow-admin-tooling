declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production';
            PORT?: string;

            // Slack creds
            BOT_TOKEN: string;
            SIGNING_SECRET: string;

            SLACK_COOKIE: string;
            USER_TOKEN: string;

            // ngrok creds
            NGROK_TOKEN?: "NONE" | string;
            NGROK_DOMAIN?: string;

            // Postgres creds
            PG_HOST: string;
            PG_USER: string;
            PG_DATABASE: string;
            PG_PASSWORD: string;

            // Workspace-specific variables
            ADMIN_USERGROUP_ID: string;
            ADMIN_USER_ID: string;
            ADMIN_REVIEW_CHANNEL: string;
        }
    }
}

export { }