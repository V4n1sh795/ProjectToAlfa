function ParticipantsList({ participants }) {
  const hasParticipants = participants && participants.length > 0;

  return (
    <div>
      <p className="participants-title">Участники</p>
      {hasParticipants ? (
        participants.map((p) => (
          <div key={p.id} className="participants-list">
            {p.fullName}
          </div>
        ))
      ) : (
        <p className="participants-list">Участники не добавлены</p>
      )}
    </div>
  );
}

export default ParticipantsList;
