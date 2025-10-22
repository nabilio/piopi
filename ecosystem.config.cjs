module.exports = {
  apps: [
    {
      name: 'piopi-prod',
      script: 'node',
      args: 'scripts/serve-dist.mjs',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001
      }
    }
  ]
};
