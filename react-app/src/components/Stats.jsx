const stats = [
  ["5", "Core subjects"],
  ["4+", "Exam categories"],
  ["24/7", "Learn on your schedule"],
  ["One", "Unified preparation hub"],
];

export default function Stats() {
  return (
    <div className="stats-strip">
      <div className="container stats">
        {stats.map(([value, label]) => (
          <div className="stat" key={label}>
            <b>{value}</b>
            <small>{label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}