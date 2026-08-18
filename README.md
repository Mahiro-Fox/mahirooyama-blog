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
