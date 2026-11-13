import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, RotateCcw, Save, Vote } from "lucide-react";
import Papa from "papaparse";
import DeskPage, { DeskNotice } from "../components/DeskPage";
import Flag from "../components/Flag";
import ConferenceService from "../services/ConferenceService";
import { activeDesk, recordBallot, tallyBallot } from "../services/desk";
import { downloadFile } from "../services/workspace";
import useWorkspace from "../hooks/useWorkspace";

const RULES = [["simple", "Simple majority"], ["two-thirds", "Two-thirds majority"], ["absolute", "Absolute majority of membership"], ["unanimous", "Unanimous votes cast"]];

export default function BallotPage() {
  useWorkspace(); const [params] = useSearchParams();
  const committee = ConferenceService.getActiveCommittee(); const desk = activeDesk();
  const incomingResolution = params.get("resolution");
  const saved = desk.ballotDraft && (!incomingResolution || desk.ballotDraft.resolutionId === incomingResolution) ? desk.ballotDraft : {};
  const [title, setTitle] = useState(saved.title || committee.resolutions?.find((r) => r.id === incomingResolution)?.title || ""); const [choices, setChoices] = useState(saved.choices || {});
  const [kind, setKind] = useState(saved.kind || "substantive"); const [rule, setRule] = useState(saved.rule || committee.defaultRule || "simple");
  const [resolutionId, setResolutionId] = useState(params.get("resolution") || saved.resolutionId || "");
  const [apply, setApply] = useState(false); const [recorded, setRecorded] = useState(() => desk.ballots.some((ballot) => ballot.id === saved.recordedId) ? saved.recordedId : "");
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [query, setQuery] = useState("");
  const result = tallyBallot(committee, choices, rule, kind);
  const eligible = committee.delegates.filter((d) => d.present && !d.observer);
  useEffect(() => { desk.ballotDraft = { title, choices, kind, rule, resolutionId, recordedId: recorded || "" }; ConferenceService.persist(); }, [title, choices, kind, rule, resolutionId, recorded]);
  const change = (fn) => { fn(); setRecorded(false); setError(""); setMessage(""); };
  const vote = (id, value) => change(() => setChoices((old) => ({ ...old, [id]: value })));
  const status = !result.quorum ? "Quorum not reached" : !result.complete ? "Voting in progress" : result.passed ? "Vote passes" : "Vote does not pass";
  return <DeskPage title="Recorded voting" eyebrow="Every delegation, on the record" description="Take a roll-call vote, resolve passes, and retain the result with a snapshot of the voting roster." actions={<Link className="quiet-button" to="/vote">Quick tally</Link>}>
    <DeskNotice error={error} message={message} />
    <div className="desk-ballot-layout"><section className="desk-card"><form className="desk-form" onSubmit={(e) => { e.preventDefault(); try { const entry = recordBallot({ title, choices, rule, kind, resolutionId, applyResolution: apply }); setRecorded(entry.id); setError(""); setMessage(`Recorded: ${entry.title} — ${entry.result.passed ? "passed" : "did not pass"}.`); } catch (err) { setError(err.message); } }}>
      <label>Vote title<input aria-label="Vote title" required maxLength={160} placeholder="Draft resolution 1.1" value={title} onChange={(e) => change(() => setTitle(e.target.value))} /></label>
      <div className="form-two-columns"><label>Vote type<select value={kind} onChange={(e) => change(() => { setKind(e.target.value); setChoices({}); })}><option value="substantive">Substantive</option><option value="procedural">Procedural (no abstentions)</option></select></label><label>Decision rule<select value={rule} onChange={(e) => change(() => setRule(e.target.value))}>{RULES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <label>Link to resolution<select value={resolutionId} onChange={(e) => change(() => { setResolutionId(e.target.value); const resolution = committee.resolutions?.find((r) => r.id === e.target.value); if (resolution) setTitle(resolution.title); })}><option value="">No linked resolution</option>{(committee.resolutions || []).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
      {resolutionId && <label className="desk-checkbox"><input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} />Update this resolution to Adopted / Rejected when recording</label>}
      <div className={`desk-vote-result ${result.complete && result.quorum ? result.passed ? "passed" : "failed" : ""}`}><Vote size={24} /><h2>{status}</h2><div className="desk-vote-numbers"><div><strong>{result.For}</strong><span>For</span></div><div><strong>{result.Against}</strong><span>Against</span></div><div><strong>{result.Abstain}</strong><span>Abstain</span></div></div><p>{result.required} affirmative votes required · {result.cast} votes cast</p><p>{result.eligible} present / {result.members} members · quorum requires {result.quorumRequired}</p><p>{result.Unrecorded} unrecorded · {result.Pass} passes to resolve</p></div>
      <p className="desk-hint">Simple and two-thirds thresholds use votes for and against. Absolute majority uses all non-observer members. Present-and-voting delegations cannot abstain. Review your conference's rules before choosing a decision rule.</p>
      {result.invalid.map((issue) => <p className="notice error" key={issue}>{issue}</p>)}
      <div className="desk-actions"><button className="primary-button" disabled={recorded || !result.complete || !result.quorum}><Save size={16} />{recorded ? "Vote recorded" : "Record vote"}</button><button className="quiet-button" type="button" onClick={() => { if (!Object.keys(choices).length || window.confirm("Start a new vote and clear the current selections?")) change(() => { setChoices({}); setTitle(""); setResolutionId(""); setApply(false); }); }}><RotateCcw size={15} />New vote</button></div>
    </form></section>
    <section className="desk-card"><div className="section-heading"><h2>Roll call <span className="desk-count">{eligible.length}</span></h2><div className="desk-actions"><button className="quiet-button" onClick={() => change(() => setChoices(Object.fromEntries(eligible.map((d) => [d.id, "For"]))))}>All for</button><button className="quiet-button" onClick={() => change(() => setChoices(Object.fromEntries(eligible.map((d) => [d.id, "Against"]))))}>All against</button></div></div><input className="desk-wide-input" aria-label="Search voting delegations" placeholder="Find a delegation" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="desk-roll-votes">{eligible.filter((d) => [d.country, d.delegate].join(" ").toLowerCase().includes(query.toLowerCase())).map((d) => <div key={d.id}><span className="desk-country"><Flag countryCode={d.countryCode} /><strong>{d.countryDisplay || d.country}</strong></span><select aria-label={`Vote for ${d.countryDisplay || d.country}`} value={choices[d.id] || ""} onChange={(e) => vote(d.id, e.target.value)}><option value="">Not recorded</option><option>For</option><option>Against</option>{kind === "substantive" && !d.voting && <option>Abstain</option>}<option>Pass</option></select></div>)}</div>{!eligible.length && <p className="desk-empty">Mark member delegations present in Attendance to begin.</p>}
    </section></div>
    <section className="desk-card"><h2>Recorded votes <span className="desk-count">{desk.ballots.length}</span></h2><div className="desk-history-list">{desk.ballots.map((ballot) => <details key={ballot.id}><summary><strong>{ballot.title}</strong><span className="desk-badge">{ballot.result.passed ? "Passed" : "Failed"}</span><span>{new Date(ballot.at).toLocaleString()}</span></summary><p>{ballot.result.For} for · {ballot.result.Against} against · {ballot.result.Abstain} abstain · {RULES.find(([value]) => value === ballot.rule)?.[1]}</p><div className="desk-vote-record-grid">{ballot.votes.map((v) => <span key={v.id}>{v.country}<strong>{v.choice}</strong></span>)}</div><button className="quiet-button" onClick={() => downloadFile("notionmun-recorded-vote.csv", Papa.unparse(ballot.votes.map((v) => ({ Vote: ballot.title, Date: ballot.at, Delegation: v.country, Choice: v.choice, Result: ballot.result.passed ? "Passed" : "Failed", Rule: ballot.rule })), { escapeFormulae: true }), "text/csv")}><Download size={15} />Export this vote</button></details>)}</div>{!desk.ballots.length && <p className="desk-empty">Saved roll-call votes will appear here and in your backups.</p>}</section>
  </DeskPage>;
}
