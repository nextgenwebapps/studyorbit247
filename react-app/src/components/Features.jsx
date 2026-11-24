export const features = [
  ["📝", "Chapter-wise practice", "Practice topic by topic and build confidence before moving to full-length tests."],
  ["⏱️", "Timed mock tests", "Experience exam-style tests with a timer, question palette and review options."],
  ["📊", "Performance analytics", "Review accuracy, speed, attempted questions and subject-wise strengths and gaps."],
  ["📚", "Previous year questions", "Prepare with exam-pattern questions and topic-wise PYQ practice."],
  ["📰", "Current affairs", "Revise important national, international and exam-relevant updates."],
  ["🎯", "Personal study goals", "Set daily targets, maintain consistency and see your preparation progress."],
  ["🎥", "Video & Topic Lectures", "Return to your lessons and revise important concepts at your own pace."],
];

export default function Features() {
  return (
    <section id="features">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="kicker">A SMARTER WAY TO PREPARE</div>
            <h2>Everything in your learning orbit</h2>
            <p>Tools that help turn preparation into measurable progress.</p>
          </div>
        </div>
        <div className="feature-grid">
          {features.map(([icon, title, description]) => (
            <article className="feature" key={title}>
              <div className="feature-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}