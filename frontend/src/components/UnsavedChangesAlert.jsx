import closeAlertIcon from "../assets/icons/close_alert.svg";
import "./UnsavedChangesAlert.css";

const UnsavedChangesAlert = ({ children, onClose }) => (
  <div className="project-alert-backdrop">
    <section className="project-alert project-alert--exit">
      <button
        className="project-alert__close"
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
      >
        <img src={closeAlertIcon} alt="" />
      </button>
      {children}
    </section>
  </div>
);

export default UnsavedChangesAlert;
