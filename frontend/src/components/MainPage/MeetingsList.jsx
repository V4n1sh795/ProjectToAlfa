import MeetingCard from "./MeetingCard";
import "./MeetingsList.css";

function MeetingsList({ meetings }) {
  return (
    <div className="meetings-list">
      {meetings.map((meeting, index) => (
        <MeetingCard
          key={meeting.meetingKey || `${meeting.date}-${meeting.startAt}-${index}`}
          meeting={meeting}
        />
      ))}
    </div>
  );
}

export default MeetingsList;
