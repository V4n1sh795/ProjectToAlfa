# 1. Создаём namespace
k3s kubectl apply -f k3s/namespace.yaml

# 2. Секреты (вручную, не в git!)
k3s kubectl apply -f k3s/secrets.yaml

# 3. PostgreSQL
k3s kubectl apply -f k3s/postgres/pvc.yaml
k3s kubectl apply -f k3s/postgres/statefulset.yaml
k3s kubectl apply -f k3s/postgres/service.yaml

# 4. Ждём, пока PostgreSQL поднимется
k3s kubectl -n alfa wait --for=condition=ready pod -l app=postgres --timeout=120s

# 5. Backend
k3s kubectl apply -f k3s/backend/deployment.yaml
k3s kubectl apply -f k3s/backend/service.yaml

# 6. AI-сервис
k3s kubectl apply -f k3s/ai/deployment.yaml
k3s kubectl apply -f k3s/ai/service.yaml

# 7. Frontend
k3s kubectl apply -f k3s/frontend/configmap.yaml
k3s kubectl apply -f k3s/frontend/deployment.yaml
k3s kubectl apply -f k3s/frontend/service.yaml

# 8. Ingress
k3s kubectl apply -f k3s/ingress.yaml