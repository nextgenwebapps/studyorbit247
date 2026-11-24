import { useEffect, useState } from "react";

export default function RecentActivity() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("studyorbit_learning_activity_v1") || "[]",
      );
      setActivities(Array.isArray(saved) ? saved.slice(0, 4) : []);
    } catch {
      setActivities([]);
    }
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
            activities.map((activity) => (
              <a className="recent-activity-item" href={activity.url || "mocktest/"} key={activity.id}>
                <strong>{activity.title || "Learning activity"}</strong>
                <span>{activity.detail || "Continue learning"}</span>
              </a>
            ))
          ) : (
            <div className="recent-empty">
              Your recent learning activity will appear here as you explore StudyOrbit247.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}