import { useEffect, useState } from "react";

const ACTIVITY_KEY = "studyorbit_recent_activity";

function readActivities() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    return Array.isArray(saved) ? saved.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export default function RecentActivity() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const refresh = () => setActivities(readActivities());
    refresh();
    window.addEventListener("studyorbit:recent-activity", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("studyorbit:recent-activity", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <section id="recent-activity" className="recent-activity-section">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="kicker">PICK UP WHERE YOU LEFT OFF</div>
            <h2>Recent Activity</h2>
            <p>Your recently opened exams, tests, subjects, chapters and lectures.</p>
          </div>
        </div>
        <div id="recent-activity-list" className="recent-activity-list">
          {activities.length ? (
            activities.map((activity, index) => (
              <a
                className="recent-activity-item"
                href={activity.url || "#"}
                key={activity.id || `${activity.title || "activity"}-${index}`}
              >
                <span className="recent-activity-icon" aria-hidden="true">
                  {activity.type === "Exam" ? "📝" : "↗"}
                </span>
                <span>
                  <strong>{activity.title || activity.name || "Learning activity"}</strong>
                  <small>{activity.type || "Recently opened"}</small>
                </span>
              </a>
            ))
          ) : (
            <div className="recent-empty">
              Sign in or start exploring. Your recent tests, subjects and lectures
              will be saved on this device.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}