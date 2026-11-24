export function Question({ question: q, answer, onAnswer }) {
  const multi = ["multi", "gateMsq"].includes(q.type);
  const free = ["fill", "numeric", "gateNat"].includes(q.type);

  function choices(options, index, placeholder, label) {
    return (
      <select
        aria-label={label}
        value={answer[index] ?? ""}
        onChange={(event) => onAnswer({ ...answer, [index]: event.target.value })}
      >
        <option value="">{placeholder}</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    );
  }

  return (
    <>
      {q.passage && <div className="passage">{q.passage}</div>}
      <h2 className="question-text">{q.prompt}</h2>
      {q.image && <img className="question-image" src={q.image} alt="Question illustration" />}
      {q.helper && <p className="question-subtext">{q.helper}</p>}
      {multi && (
        <p className="question-subtext">Select all correct options. More than one answer may be correct.</p>
      )}
      {q.options && (
        <div className="option-list">
          {q.options.map((option, index) => {
            const value = String(option.value ?? option);
            const selected = multi ? answer.includes(value) : String(answer) === value;
            return (
              <label className={selected ? "option selected" : "option"} key={index}>
                <input
                  type={multi ? "checkbox" : "radio"}
                  name={`answer_${q.id}`}
                  value={value}
                  checked={selected}
                  onChange={() =>
                    onAnswer(
                      multi
                        ? selected
                          ? answer.filter((item) => item !== value)
                          : [...answer, value]
                        : value,
                    )
                  }
                />
                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                <span className="option-content">
                  {option.image && <img src={option.image} alt={`Answer option ${index + 1}`} />}
                  {option.label ?? option.text ?? option}
                </span>
              </label>
            );
          })}
        </div>
      )}
      {free && (
        <>
          <input
            className="input-answer"
            aria-label="Your answer"
            type="text"
            inputMode={q.type === "fill" ? "text" : "decimal"}
            placeholder={q.placeholder || "Type your answer here"}
            value={answer}
            onChange={(event) => onAnswer(event.target.value)}
          />
          <div className="hint">{q.hint || "Enter your answer, then select Save & next."}</div>
        </>
      )}
      {q.type === "ordering" && (
        <>
          <p className="question-subtext">Choose the correct position for each item in the sequence.</p>
          <div className="order-list">
            {q.items.map((item, index) => (
              <div className="order-item" key={index}>
                <b>{item}</b>
                {choices(
                  q.items.map((_, position) => [position + 1, position + 1]),
                  index,
                  "Position",
                  `Position for ${item}`,
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {["matrix", "match"].includes(q.type) && (
        <table className="match-table">
          <thead>
            <tr>
              <th>{q.type === "match" ? "Column A" : "Statement"}</th>
              <th>{q.type === "match" ? "Match with Column B" : "True / False"}</th>
            </tr>
          </thead>
          <tbody>
            {(q.left ?? q.statements).map((item, index) => (
              <tr key={index}>
                <td>{item}</td>
                <td>
                  {q.type === "match"
                    ? choices(
                        q.right.map((right, position) => [
                          position,
                          `${String.fromCharCode(65 + position)}. ${right}`,
                        ]),
                        index,
                        "Choose match",
                        item,
                      )
                    : choices(
                        [
                          ["true", "True"],
                          ["false", "False"],
                        ],
                        index,
                        "Select",
                        item,
                      )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
