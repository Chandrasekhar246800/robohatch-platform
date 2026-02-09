# 🚀 RoboHatch Docker Deployment Guide

## 📋 Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- AWS RDS MySQL database (production)
- AWS S3 bucket configured
- Domain name with DNS configured (production)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              Nginx (Port 80/443)            │
│         (Reverse Proxy + Load Balancer)     │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐  ┌───────▼────────┐
│   Frontend     │  │   Backend API  │
│   (Next.js)    │  │   (Express)    │
│   Port: 3000   │  │   Port: 5000   │
└────────────────┘  └────────┬───────┘
                              │
                    ┌─────────▼────────┐
                    │  MySQL Database  │
                    │  (AWS RDS)       │
                    └──────────────────┘
```

## 🚦 Quick Start

### 1. Clone and Setup

```bash
cd c:\Users\mcsr8\OneDrive\Desktop\robohatch-platform
```

### 2. Configure Environment

```bash
# Copy environment template
copy .env.docker.example .env

# Edit .env with your production values
notepad .env
```

**Critical Values to Update:**
- `DATABASE_URL` - Your AWS RDS connection string
- `JWT_SECRET` - Generate new: `openssl rand -hex 32`
- `AWS_ACCESS_KEY_ID` - Your AWS credentials
- `AWS_SECRET_ACCESS_KEY` - Your AWS credentials
- `FRONTEND_URL` - Your production domain
- `ALLOWED_ORIGINS` - Your production domain(s)

### 3. Build Images

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build api
docker-compose build web
```

### 4. Run Database Migrations

```bash
# Running migrations inside the API container
docker-compose run --rm api npx prisma migrate deploy
```

### 5. Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f nginx
```

### 6. Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Check health
curl http://localhost/health

# Check frontend
curl http://localhost
```

## 🔧 Common Commands

### Service Management

```bash
# Stop all services
docker-compose stop

# Restart a service
docker-compose restart api

# Remove all containers
docker-compose down

# Remove containers and volumes
docker-compose down -v
```

### Monitoring

```bash
# View logs
docker-compose logs -f

# View resource usage
docker stats

# Execute command in container
docker-compose exec api sh
docker-compose exec web sh
```

### Database Operations

```bash
# Run Prisma migrations
docker-compose exec api npx prisma migrate deploy

# Open Prisma Studio
docker-compose exec api npx prisma studio

# Seed database
docker-compose exec api npm run seed

# Backup database
docker-compose exec db mysqldump -u root -p robohatch_db > backup.sql
```

## 🏭 Production Deployment

### AWS ECS Deployment

1. **Push images to ECR:**

```bash
# Login to ECR
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin YOUR_ECR_URI

# Tag images
docker tag robohatch-api:latest YOUR_ECR_URI/robohatch-api:latest
docker tag robohatch-web:latest YOUR_ECR_URI/robohatch-web:latest

# Push images
docker push YOUR_ECR_URI/robohatch-api:latest
docker push YOUR_ECR_URI/robohatch-web:latest
```

2. **Create ECS Task Definitions** (use the environment variables from .env)

3. **Configure Load Balancer** (ALB for HTTPS termination)

4. **Setup Auto Scaling** (CPU/Memory based)

### Vercel + Docker Backend

1. **Deploy Frontend to Vercel:**

```bash
cd apps/web
vercel --prod
```

2. **Deploy Backend to AWS ECS/Fargate or Azure Container Instances**

### Docker Swarm Deployment

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml robohatch

# List services
docker service ls

# Scale service
docker service scale robohatch_api=3
```

## 🔒 Security Considerations

### Production Checklist

- [ ] Change all default passwords
- [ ] Generate new JWT_SECRET
- [ ] Use AWS Secrets Manager for credentials
- [ ] Enable SSL/TLS (Let's Encrypt)
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable database encryption at rest
- [ ] Configure VPC and security groups
- [ ] Set up IAM roles with minimum permissions
- [ ] Enable CloudWatch logging
- [ ] Configure automated backups
- [ ] Set up monitoring and alerts

### SSL/TLS Configuration

```bash
# Generate self-signed certificate (testing only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem

# For production, use Let's Encrypt
certbot certonly --standalone -d yourdomain.com
```

Update `nginx/nginx.conf` to enable HTTPS.

## 📊 Monitoring

### Health Checks

- **API Health:** `http://localhost/health`
- **Frontend:** `http://localhost`
- **Nginx:** `docker-compose ps nginx`

### Logs

```bash
# Application logs
docker-compose logs -f api
docker-compose logs -f web

# Nginx access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# Nginx error logs
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

### Performance Monitoring

```bash
# Container stats
docker stats

# Detailed inspection
docker inspect robohatch-api
```

## 🐛 Troubleshooting

### Common Issues

**1. Container fails to start:**

```bash
docker-compose logs api
docker-compose exec api sh
```

**2. Database connection error:**

- Verify `DATABASE_URL` in .env
- Check database is accessible: `docker-compose exec api ping db`
- Ensure migrations are run: `docker-compose exec api npx prisma migrate deploy`

**3. CORS errors:**

- Check `ALLOWED_ORIGINS` in .env matches your frontend URL
- Verify nginx proxy headers are set correctly

**4. Image build fails:**

```bash
# Clear build cache
docker-compose build --no-cache

# Check Docker disk space
docker system df
docker system prune
```

**5. Port already in use:**

```bash
# Find process using port
netstat -ano | findstr :80
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

## 🔄 Updates and Rollbacks

### Deploying Updates

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose build

# Restart services (zero-downtime)
docker-compose up -d --no-deps --build api
docker-compose up -d --no-deps --build web

# Run migrations
docker-compose exec api npx prisma migrate deploy
```

### Rollback

```bash
# Roll back to previous image
docker-compose down
docker-compose up -d --no-deps robohatch-api:previous-tag

# Or use git
git checkout <previous-commit>
docker-compose build
docker-compose up -d
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale API service
docker-compose up -d --scale api=3

# Update nginx upstream to include all instances
```

### Vertical Scaling

Edit `docker-compose.yml` to add resource limits:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## 🎯 Next Steps

1. Set up CI/CD pipeline (GitHub Actions)
2. Configure monitoring (Prometheus + Grafana)
3. Set up log aggregation (ELK stack)
4. Enable distributed tracing (Jaeger)
5. Configure CDN for static assets (CloudFront)
6. Set up automated backups
7. Implement blue-green deployment
8. Add health check endpoints
9. Configure auto-scaling policies
10. Set up disaster recovery plan

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [AWS ECS Guide](https://docs.aws.amazon.com/ecs/)

## 🆘 Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review environment variables in `.env`
- Verify network connectivity
- Check firewall rules
- Review AWS security groups
