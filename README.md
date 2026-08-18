# 启动 postgres + backend-go

docker-compose up -d postgres backend-go

# 跑数据迁移

docker-compose run --rm backend-go ./migrator

# 本地 dev 模式跑前端（已有 .env.local 配好）

pnpm dev

# 访问 http://localhost:3000/cn/movies

# 或全栈容器化

docker-compose up -d --build

# 前端 http://localhost:3000，后端 http://localhost:8080，pgAdmin http://localhost:5050

# 日常运维命令

# 查看所有服务状态

docker compose ps

# 查看日志（实时）

docker compose logs -f backend-go # Go 后端日志
docker compose logs -f next-frontend # Next.js 日志
docker compose logs -f postgres # 数据库日志

# 重启单个服务

docker compose restart backend-go

# 更新代码后重新部署

git pull
docker compose up -d --build next-frontend backend-go

# 进入容器调试

docker compose exec next-frontend sh
docker compose exec backend-go sh
docker compose exec postgres psql -U mahiro -d mahiro
