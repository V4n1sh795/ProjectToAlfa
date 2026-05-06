import MeetingCard from "./MeetingCard";
import "./MeetingsList.css";

function MeetingsList({ meetings }) {
  return (
    <div className="meetings-list">
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
    </div>
  );
}

export default MeetingsList;
