import React, { useEffect, useState } from 'react';
import './App.css';

// 🔹 Интерфейс под ваш API-ответ
interface Team {
  id: number;
  name: string;
  createdAt: string;
  // добавьте другие поля, если они есть
}

// 🔹 Вспомогательная функция для форматирования даты
const formatDate = (isoString: string): string => {
  return new Date(isoString).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("api/get_team/")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Team[]) => {
        console.log("✅ Данные получены:", data); // отладка
        setTeams(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Ошибка:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">🔄 Загрузка...</div>;
  if (error) return <div className="error">⚠️ Ошибка: {error}</div>;

  return (
    <div className="App">
      <header className="App-header">
        <h2>Команды ({teams.length})</h2>
        
        <div className="teams-list">
          {teams.map((team) => (
            <div key={team.id} className="team-card">
              <h3>#{team.id} — {team.name}</h3>
              <p className="created-at">
                🕐 Создана: {formatDate(team.createdAt)}
              </p>
            </div>
          ))}
        </div>

        {teams.length === 0 && (
          <p style={{ color: '#888' }}>Список пуст</p>
        )}
      </header>
    </div>
  );
}

export default App;