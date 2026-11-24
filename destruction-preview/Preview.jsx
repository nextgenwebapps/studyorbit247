import { useEffect, useRef, useState } from "react";
import { mount } from "../react-app/src/mount.jsx";

function Preview() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  function reset() {
    clearTimeout(timer.current);
    setRunning(false);
    setDone(false);
  }

  function start() {
    clearTimeout(timer.current);
    setRun((value) => value + 1);
    setDone(false);
    setRunning(true);
    timer.current = setTimeout(() => setDone(true), 4900);
  }

  return (
    <>
      <header className="bar">
        <div className="brand">
          StudyOrbit<span>247</span>
        </div>
        <div className="tag">VISUAL DESTRUCTION LAB</div>
      </header>
      <div className="intro">
        <div className="tag">SAFE PREVIEW • ORIGINAL SITE UNTOUCHED</div>
        <h1>Watch the website break apart.</h1>
        <p>
          Ye sirf visual demo hai — glitch, screen cracks, cards shatter aur poora page collapse hoga.
          Original homepage ka content ya code is preview se delete nahi hota.
        </p>
        <div className="actions">
          <button className="start" onClick={start}>
            ▶ START DESTRUCTION
          </button>
          <button className="reset" onClick={reset}>
            ↻ RESET PREVIEW
          </button>
        </div>
      </div>
      <main className="stage">
        <div key={run} className={running ? "site destroying" : "site"}>
          <div className="crack"></div>
          <div className="site-head">
            <div>
              StudyOrbit<span style={{ color: "#b58a32" }}>247</span>
            </div>
            <small>Login / Sign Up　　My Learning</small>
          </div>
          <div className="hero">
            <div className="eyebrow">YOUR EXAM PREPARATION ORBIT</div>
            <h2>
              Prepare smarter.
              <br />
              <span>Achieve bigger.</span>
            </h2>
            <p>Practice, prepare and progress with focused learning resources for your next exam.</p>
            <span className="fakebtn">Explore Exams →</span>
          </div>
          <div className="stats">
            <div>
              <b>5+</b>
              <small>Subjects</small>
            </div>
            <div>
              <b>10+</b>
              <small>Exam paths</small>
            </div>
            <div>
              <b>24/7</b>
              <small>Practice</small>
            </div>
            <div>
              <b>∞</b>
              <small>Possibilities</small>
            </div>
          </div>
          <section className="section">
            <h3>Explore Subjects</h3>
            <div className="cards">
              <div className="card" style={{ "--i": 1 }}>
                <b>📚 General Knowledge</b>
                <small>Build strong fundamentals</small>
              </div>
              <div className="card" style={{ "--i": 2 }}>
                <b>🧠 Reasoning</b>
                <small>Sharpen your logic</small>
              </div>
              <div className="card" style={{ "--i": 3 }}>
                <b>➗ Quantitative Aptitude</b>
                <small>Practice with confidence</small>
              </div>
              <div className="card" style={{ "--i": 4 }}>
                <b>✍️ English & Hindi</b>
                <small>Improve language skills</small>
              </div>
            </div>
          </section>
          <section className="section" style={{ background: "#fff" }}>
            <h3>Explore Exams</h3>
            <div className="cards">
              <div className="card" style={{ "--i": 1 }}>
                <b>SSC Exams</b>
                <small>CGL · CHSL · MTS</small>
              </div>
              <div className="card" style={{ "--i": 2 }}>
                <b>Banking Exams</b>
                <small>IBPS · SBI · RBI</small>
              </div>
              <div className="card" style={{ "--i": 3 }}>
                <b>RRB Exams</b>
                <small>NTPC · Group D · ALP</small>
              </div>
              <div className="card" style={{ "--i": 4 }}>
                <b>UPSC & State PCS</b>
                <small>Prepare with a plan</small>
              </div>
            </div>
          </section>
          <section className="section features">
            <h3>Everything in your learning orbit</h3>
            <div className="cards">
              <div className="card" style={{ "--i": 1 }}>
                <b>Timed Mock Tests</b>
                <small>Exam-like practice</small>
              </div>
              <div className="card" style={{ "--i": 2 }}>
                <b>Chapter Practice</b>
                <small>Learn step by step</small>
              </div>
              <div className="card" style={{ "--i": 3 }}>
                <b>Performance Analytics</b>
                <small>Understand progress</small>
              </div>
              <div className="card" style={{ "--i": 4 }}>
                <b>Previous Year Questions</b>
                <small>Practice smarter</small>
              </div>
            </div>
          </section>
          <div className="footer">StudyOrbit247 · Learn. Practice. Progress.</div>
        </div>
        <div className={done ? "end show" : "end"}>SYSTEM COLLAPSED — PREVIEW ONLY</div>
      </main>
    </>
  );
}

mount(Preview);
