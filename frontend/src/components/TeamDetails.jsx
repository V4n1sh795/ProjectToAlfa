import editIcon from "../assets/telegram-bot/team-edit-pencil.svg";

export default function TeamDetails({ cardData, onEdit, emptyValue = "" }) {
  return (
    <>
      <section className="team-info-block team-info-block--project">
        <span>Название проекта</span>
        <strong>{cardData.projectName}</strong>
      </section>

      <section className="team-info-block team-info-block--split">
        <div>
          <span>День встречи</span>
          <strong>{cardData.meetingDay}</strong>
        </div>
        <div>
          <span>Время встречи</span>
          <strong>{cardData.meetingTime}</strong>
        </div>
      </section>

      <section className="team-info-block team-info-block--artifacts">
        <span>Артефакты</span>
        {String(cardData.artifacts).startsWith("http") ? (
          <a href={cardData.artifacts}>{cardData.artifacts}</a>
        ) : (
          <strong>{cardData.artifacts}</strong>
        )}
      </section>

      <section className="team-info-block team-info-block--split team-info-block--members">
        <div>
          <span>Участники команды</span>
          {cardData.members.map((member, index) => (
            <strong key={member.id ?? index}>{member.name}</strong>
          ))}
        </div>
        <div>
          <span>Роли участников</span>
          {cardData.members.map((member, index) => (
            <strong key={member.id ?? index}>
              {member.role || emptyValue}
            </strong>
          ))}
        </div>
      </section>

      <section className="team-info-block">
        <span>Кураторы команды</span>
        {cardData.curators.length > 0 ? (
          cardData.curators.map((curator, index) => (
            <strong key={`${curator.id ?? curator.name}-${index}`}>
              {curator.name || emptyValue}
            </strong>
          ))
        ) : (
          <strong>{emptyValue}</strong>
        )}
      </section>

      <div className="team-summary-grid">
        <section className="team-info-block team-info-block--grades">
          <strong>
            1 контрольная точка - {cardData.grades.checkpoint1}
          </strong>
          <strong>
            2 контрольная точка - {cardData.grades.checkpoint2}
          </strong>
          <strong>
            3 контрольная точка - {cardData.grades.checkpoint3}
          </strong>
          <strong>Итоговая оценка - {cardData.grades.final}</strong>
        </section>

        <section className="team-info-block team-info-block--comment">
          <span>Комментарий</span>
          <strong>{cardData.comment}</strong>
        </section>
      </div>

      <button
        className="team-edit-button"
        type="button"
        onClick={onEdit}
      >
        Редактировать
        <img src={editIcon} alt="" className="team-edit-icon" />
      </button>
    </>
  );
}
