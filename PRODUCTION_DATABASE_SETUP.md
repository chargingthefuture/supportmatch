# Production Database Setup Guide

## Overview
This project now supports separate development and production databases with strict environment separation to prevent production traffic from hitting the development database.

## Environment Configuration

### Development Environment
- Uses `DATABASE_URL` environment variable
- Automatically provisioned Replit database
- Schema changes applied via `npm run db:push`

### Production Environment
- **Requires** `PROD_DATABASE_URL` environment variable
- Will **refuse to start** if `PROD_DATABASE_URL` is not set in production
- Never falls back to development database URL

## Setting Up Production Database

### Step 1: Create Production Database Instance
1. **Using Replit Database Tool** (Recommended):
   - Click the PostgreSQL icon in the Tools pane
   - Create a new database instance for production
   - Copy the connection string provided

2. **Using External Neon Database**:
   - Go to [Neon Console](https://neon.tech)
   - Create a new database project
   - Copy the connection string

### Step 2: Set Production Environment Variable
```bash
# Set in Replit secrets or environment variables
PROD_DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require
```

### Step 3: Deploy Schema to Production
Since `drizzle.config.ts` only reads `DATABASE_URL`, you need to temporarily set it to your production URL when running migrations:

```bash
# Set DATABASE_URL to production URL for schema deployment
DATABASE_URL="$PROD_DATABASE_URL" npm run db:push

# Or use --force if there are breaking changes
DATABASE_URL="$PROD_DATABASE_URL" npm run db:push --force
```

## Production Best Practices

### Security
- Keep production and development databases completely separate
- Use different credentials for each environment
- Enable SSL/TLS (required by default with Neon)
- Set up IP allowlisting if needed

### Performance
- Disable scale-to-zero for production workloads
- Use connection pooling (already configured in the code)
- Set appropriate connection limits

### Monitoring
- Monitor database connections and performance
- Set up alerts for connection limits and query performance
- Regular backup verification

## Environment Variables Summary

| Environment | Variable | Purpose |
|-------------|----------|---------|
| Development | `DATABASE_URL` | Development database connection |
| Production | `PROD_DATABASE_URL` | Production database connection (required) |
| Any | `NODE_ENV` | Environment detection ('production' or 'development') |

## Migration Workflow

1. **Development**: Make schema changes in `shared/schema.ts`
2. **Development**: Test with `npm run db:push`
3. **Production**: Deploy schema with `DATABASE_URL="$PROD_DATABASE_URL" npm run db:push`
4. **Production**: Deploy application with `NODE_ENV=production` and `PROD_DATABASE_URL` set

## Troubleshooting

### "PROD_DATABASE_URL must be set for production environment"
- Ensure `PROD_DATABASE_URL` is set in your production environment
- Verify `NODE_ENV` is set to 'production'

### Schema deployment issues
- Use `--force` flag if there are breaking changes
- Ensure `DATABASE_URL` is temporarily set to production URL during migration
- Check that production database is accessible

### Connection issues
- Verify SSL configuration in connection string
- Check IP allowlisting settings
- Confirm database credentials are correct