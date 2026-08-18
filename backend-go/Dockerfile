# 构建阶段（用最新稳定版 Go，兼容 gin v1.12+ 要求的 Go 1.25）
FROM golang:1.25-alpine AS builder
WORKDIR /app
# 先拷依赖文件，利用 docker 层缓存（源码变动不触发重新下载依赖）
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server ./cmd/server \
    && CGO_ENABLED=0 go build -o migrator ./cmd/migrator

# 运行阶段：极简镜像
FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/server ./server
COPY --from=builder /app/migrator ./migrator
EXPOSE 8080
CMD ["./server"]
