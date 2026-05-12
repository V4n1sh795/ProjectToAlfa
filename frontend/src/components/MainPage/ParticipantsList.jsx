function ParticipantsList({ participants }) {
  const hasParticipants = participants && participants.length > 0;

  return (
    <div>
      <p className="participants-title">Участники</p>
      {hasParticipants ? (
        participants.map((name, index) => (
          <div key={index} className="participants-list">
            {name}
          </div>
        ))
      ) : (
        <p className="participants-list">Участники не добавлены</p>
      )}
    </div>
  );
}

export default ParticipantsList;