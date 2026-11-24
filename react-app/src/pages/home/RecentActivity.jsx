import { useEffect, useState } from "react";

const ACTIVITY_KEY = "studyorbit_recent_activity";

function readItems(key) {
  const decode = (raw) => {
    const value = JSON.parse(raw || "null");
    const items = value?.items ?? value?.activities ?? value;
    return Array.isArray(items) ? items : [];
  };

  try {
    const stored = localStorage.getItem(key);
    if (stored) return decode(stored);
  } catch {
    // Older visits can also have activity in a cookie.
  }

  try {
    const cookie = document.cookie.split("; ").find((row) => row.startsWith(key + "="));
    return cookie ? decode(decodeURIComponent(cookie.slice(key.length + 1))) : [];
  } catch {
    return [];
  }
}

function readActivities() {
  const completed = readItems("studyorbit_learning_activity_v1").map((item) => ({
    ...item,
    url: item?.url === "../mocktest/" ? "mocktest/" : item?.url,
  }));
  const recent = [ACTIVITY_KEY, "recentActivities", "recent_activity", "recentLearning"].flatMap(readItems);
  const unique = new Map();

  for (const item of [...completed, ...recent]) {
    const title = item?.title || item?.name || item?.label || item?.activity;
    if (!title) continue;
    const url = item.url || item.href || item.link || "#";
    const key = JSON.stringify([title, url]);
    if (!unique.has(key)) unique.set(key, { ...item, title, url });
  }

  return [...unique.values()]
    .sort(
      (a, b) =>
        (Number(b.time) || Date.parse(b.completedAt) || 0) -
        (Number(a.time) || Date.parse(a.completedAt) || 0),
    )
    .slice(0, 8);
}

export default function RecentActivity() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const refresh = () => setActivities(readActivities());
    refresh();
    window.addEventListener("studyorbit:recent-activity", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);

    return () => {
      window.removeEventListener("studyorbit:recent-activity", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pageshow", refresh);
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
                  {/exam|test|quiz/i.test(activity.type) ? "📝" : "↗"}
                </span>
                <span>
                  <strong>{activity.title || activity.name || "Learning activity"}</strong>
                  <small>{activity.type || "Recently opened"}</small>
                </span>
              </a>
            ))
          ) : (
            <div className="recent-empty">
              Sign in or start exploring. Your recent tests, subjects and lectures will be saved on this
              device.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
