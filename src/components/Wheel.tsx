"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { copyText } from "@/lib/client";
import { secureIndex } from "@/lib/wheel";

const colors = ["#185b4b", "#a23c36", "#5f4d86", "#d08a54", "#3e7b78", "#8b5962", "#7a7248", "#776391"];

export function Wheel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [question, setQuestion] = useState("");
  const [rawOptions, setRawOptions] = useState("Simon\nFatima\nNoor\nLudo");
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState("");
  const [pendingResult, setPendingResult] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("");
  const options = useMemo(() => rawOptions.split("\n").map((item) => item.trim()).filter(Boolean), [rawOptions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 520;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(dpr, dpr);
    context.clearRect(0, 0, size, size);
    const center = size / 2;
    const radius = center - 12;
    const visibleOptions = options.length >= 2 ? options : ["Optie 1", "Optie 2"];
    const angle = (Math.PI * 2) / visibleOptions.length;
    visibleOptions.forEach((option, index) => {
      const start = -Math.PI / 2 + index * angle;
      context.beginPath();
      context.moveTo(center, center);
      context.arc(center, center, radius, start, start + angle);
      context.closePath();
      context.fillStyle = colors[index % colors.length];
      context.fill();
      context.save();
      context.translate(center, center);
      context.rotate(start + angle / 2);
      context.textAlign = "right";
      context.textBaseline = "middle";
      context.fillStyle = "#fffdf9";
      context.font = `700 ${visibleOptions.length > 10 ? 15 : 18}px Avenir Next, sans-serif`;
      const label = option.length > 24 ? `${option.slice(0, 22)}…` : option;
      context.fillText(label, radius - 24, 0, radius * .7);
      context.restore();
    });
    context.beginPath(); context.arc(center, center, 34, 0, Math.PI * 2); context.fillStyle = "#fbf8f3"; context.fill();
    context.beginPath(); context.arc(center, center, 11, 0, Math.PI * 2); context.fillStyle = "#252822"; context.fill();
  }, [options]);

  const spin = () => {
    setMessage(""); setResult("");
    if (options.length < 2) { setMessage("Voeg minimaal twee namen of mogelijkheden toe om het rad te draaien."); return; }
    const index = secureIndex(options.length);
    const winner = options[index];
    const segment = 360 / options.length;
    const targetOffset = -(index + .5) * segment;
    const nextRotation = rotation + 5 * 360 + ((targetOffset - rotation) % 360 + 360) % 360;
    setPendingResult(winner);
    setSpinning(true);
    setRotation(nextRotation);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => { setResult(winner); setPendingResult(""); setSpinning(false); }, reduced ? 20 : 3450);
  };

  const shareText = result ? `${question ? `${question}\n` : ""}Het rad heeft gekozen: ${result}! 🎉` : "";
  return (
    <div className="wheel-layout">
      <div className="wheel-stage" aria-label="Keuzerad">
        <div className="wheel-arrow" aria-hidden="true" />
        <canvas ref={canvasRef} className="wheel-canvas" width="520" height="520" style={{ transform: `rotate(${rotation}deg)` }} aria-label={`Rad met ${options.length} opties`} role="img" />
      </div>
      <section className="tool-card">
        <span className="eyebrow">Blijft op dit apparaat</span><h2>Wat zal het worden?</h2>
        <div className="field"><label htmlFor="wheel-question">Vraag <span className="hint">optioneel</span></label><input id="wheel-question" value={question} maxLength={160} onChange={(event) => setQuestion(event.target.value)} placeholder="Wie doet de boodschappen?" /></div>
        <div className="field"><label htmlFor="wheel-options">Namen of mogelijkheden *</label><textarea id="wheel-options" value={rawOptions} onChange={(event) => { setRawOptions(event.target.value); setResult(""); }} rows={8} aria-describedby="wheel-hint" /><span className="hint" id="wheel-hint">Eén mogelijkheid per regel. Minimaal twee.</span></div>
        <div className="option-chips" aria-label="Ingevoerde opties">{options.slice(0, 16).map((option, index) => <span className="option-chip" key={`${option}-${index}`}>{option}</span>)}</div>
        <button className="button" disabled={spinning} type="button" onClick={spin}>{spinning ? "Het rad draait…" : result ? "Nog een keer" : "Draai het rad"}</button>
        {message && <div className="notice error" role="alert">{message}</div>}
        <div className="wheel-result" aria-live="polite" aria-atomic="true">
          {result ? <><span>Het rad koos:</span><strong>{result}</strong></> : <span className="muted">{pendingResult ? "Het rad maakt zijn keuze…" : "De uitslag verschijnt hier."}</span>}
        </div>
        {result && <div className="button-row"><button className="button button-secondary button-small" type="button" onClick={() => { let removed = false; setRawOptions(options.filter((option) => { if (!removed && option === result) { removed = true; return false; } return true; }).join("\n")); setResult(""); }}>Verwijder deze optie</button><button className="button button-secondary button-small" type="button" onClick={async () => { if (navigator.share) await navigator.share({ title: question || "Uitslag van het rad", text: shareText }); else { await copyText(shareText); setMessage("De uitslag is gekopieerd."); } }}>Deel de uitslag</button><button className="button button-secondary button-small" type="button" onClick={async () => { await copyText(shareText); setMessage("De uitslag is gekopieerd."); }}>Kopieer</button></div>}
        <p className="hint">De namen en uitslag blijven tijdens het draaien op dit apparaat. Sluit of ververs je de pagina, dan ben je ze kwijt.</p>
      </section>
    </div>
  );
}
