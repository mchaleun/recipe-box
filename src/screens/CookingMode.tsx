import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRecipe, useStore } from '../store';
import type { Ingredient } from '../types';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/ui';
import { goBack, navigate } from '../router';
import { detectTimers, formatClock } from '../lib/time';
import { parseLeadingAmount } from '../lib/quantity';
import { CheckCircle } from './Collections';
import { keepAwake, type AwakeMode } from '../lib/keepAwake';
import { IngredientLine, ServingsStepper, useProgress } from './RecipeView';

// ---------- Ingredient ↔ step matching ----------

const UNIT_WORDS = new Set(('cup cups tbsp tablespoon tablespoons tsp teaspoon teaspoons oz ounce ounces lb lbs pound pounds g gram grams kg ml l ' +
  'clove cloves pinch dash can cans jar jars package packages stick sticks large small medium whole fresh chopped minced sliced diced ' +
  'to taste of and or the a an about plus extra virgin room temperature divided').split(' '));

function headNoun(text: string): string[] {
  const parsed = parseLeadingAmount(text);
  const rest = (parsed ? parsed.rest : text).toLowerCase().split(/[,(]| for | to taste/)[0];
  const words = rest.replace(/[^a-z\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !UNIT_WORDS.has(w));
  return words.slice(-2);
}

function ingredientsForStep(step: string, ingredients: Ingredient[]): Ingredient[] {
  const s = step.toLowerCase();
  return ingredients.filter((ing) => {
    if (ing.heading) return false;
    const nouns = headNoun(ing.text);
    const head = nouns[nouns.length - 1];
    if (!head) return false;
    const stem = head.replace(/(es|s)$/, '');
    return new RegExp(`\\b${stem}(s|es)?\\b`).test(s);
  });
}

// ---------- Keep the screen on ----------

function useKeepAwake(): AwakeMode {
  const [mode, setMode] = useState<AwakeMode>('off');
  useEffect(() => keepAwake(setMode), []);
  return mode;
}

// ---------- Timers ----------

interface RunningTimer { id: number; label: string; endsAt: number; total: number }

let audioCtx: AudioContext | null = null;
function unlockAudio() {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* audio unavailable */ }
}
function chime() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  [0, 0.28, 0.56].forEach((d, i) => {
    const o = audioCtx!.createOscillator();
    const g = audioCtx!.createGain();
    o.type = 'sine';
    o.frequency.value = i === 2 ? 1046.5 : 880;
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.25);
    o.connect(g).connect(audioCtx!.destination);
    o.start(t0 + d);
    o.stop(t0 + d + 0.3);
  });
  navigator.vibrate?.([200, 100, 200]);
}

function useTimers() {
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [now, setNow] = useState(Date.now());
  const rung = useRef(new Set<number>());
  useEffect(() => {
    if (!timers.length) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [timers.length]);
  useEffect(() => {
    for (const t of timers) if (t.endsAt <= now && !rung.current.has(t.id)) { rung.current.add(t.id); chime(); }
  }, [now, timers]);
  return {
    timers, now,
    start: (label: string, seconds: number) => { unlockAudio(); setTimers((ts) => [...ts, { id: Date.now(), label, endsAt: Date.now() + seconds * 1000, total: seconds }]); },
    stop: (id: number) => setTimers((ts) => ts.filter((t) => t.id !== id)),
  };
}

// ---------- Screen ----------

export function CookingMode({ id }: { id: string }) {
  const recipe = useRecipe(id);
  const { dispatch } = useStore();
  const progress = useProgress(recipe);
  const wake = useKeepAwake();
  const { timers, now, start, stop } = useTimers();
  const [panel, setPanel] = useState(false);
  const [finished, setFinished] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const steps = useMemo(() => recipe?.steps.filter((s) => !s.heading) ?? [], [recipe]);
  const index = Math.min(progress.stepIndex, Math.max(0, steps.length - 1));
  const step = steps[index];

  const go = useCallback((delta: number) => {
    unlockAudio();
    if (!recipe) return;
    const next = index + delta;
    if (next >= steps.length) { setFinished(true); return; }
    if (next < 0) return;
    setDir(delta > 0 ? 1 : -1);
    // Moving forward marks the step you leave as done.
    if (delta > 0 && step && !progress.checkedSteps.has(step.id)) {
      dispatch({ type: 'progress', id: recipe.id, progress: { stepIndex: next, steps: [...progress.checkedSteps, step.id] } });
    } else {
      progress.setStepIndex(next);
    }
  }, [index, steps.length, step, recipe, progress, dispatch]);

  const exit = useCallback(() => goBack({ name: 'recipe', id }), [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
      else if (e.key === 'Escape') { if (panel) setPanel(false); else exit(); }
      else if (e.key.toLowerCase() === 'i') setPanel((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, exit, panel]);

  useEffect(() => {
    document.documentElement.classList.add('cooking');
    return () => document.documentElement.classList.remove('cooking');
  }, []);

  if (!recipe) {
    return <div className="page"><EmptyState icon="book" title="Recipe Not Found" action={<button className="btn secondary" onClick={() => navigate({ name: 'library' })}>Back to Recipes</button>} /></div>;
  }

  const finish = () => {
    dispatch({ type: 'cooked', id: recipe.id });
    dispatch({ type: 'progress', id: recipe.id, progress: null });
    navigate({ name: 'recipe', id: recipe.id }, { replace: true });
  };

  const used = step ? ingredientsForStep(step.text, recipe.ingredients) : [];
  const stepTimers = step ? detectTimers(step.text) : [];
  const stepDone = step ? progress.checkedSteps.has(step.id) : false;

  const ingredientPanel = (
    <div className="cook-ingredients">
      <div className="cook-panel-head">
        <h2>Ingredients</h2>
        <button className="icon-btn plain panel-close" onClick={() => setPanel(false)} aria-label="Close ingredients"><Icon name="close" /></button>
      </div>
      <ServingsStepper value={progress.servings} base={recipe.servings} unit={recipe.yieldUnit} onChange={progress.setServings} large />
      <ul className="checklist large">
        {recipe.ingredients.map((ing) =>
          ing.heading ? <li key={ing.id} className="sub-head">{ing.text}</li> : (
            <li key={ing.id}>
              <button className={`ing${progress.checkedIngredients.has(ing.id) ? ' done' : ''}`} onClick={() => progress.toggle('ingredients', ing.id)} aria-pressed={progress.checkedIngredients.has(ing.id)}>
                <CheckCircle on={progress.checkedIngredients.has(ing.id)} size={30} />
                <IngredientLine text={ing.text} factor={progress.factor} />
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );

  return (
    <div className="cook" role="application" aria-label={`Cooking ${recipe.title}`}>
      <header className="cook-bar">
        <button className="cook-close" onClick={exit} aria-label="Exit Cooking Mode"><Icon name="close" size={22} stroke={2.2} /></button>
        <div className="cook-title">
          <div className="name">{recipe.title}</div>
          <div className="sub">
            {finished ? 'All steps done' : `Step ${index + 1} of ${steps.length}`}
            {wake !== 'off' && <span className="awake"> · Screen stays on</span>}
          </div>
        </div>
        <button className={`cook-ing-btn${panel ? ' on' : ''}`} onClick={() => setPanel((p) => !p)} aria-expanded={panel}>
          <Icon name="list" size={22} /> <span>Ingredients</span>
        </button>
      </header>

      <div className="cook-progress" aria-hidden="true">
        {steps.map((s, i) => (
          <button key={s.id} tabIndex={-1} className={`${i < index || progress.checkedSteps.has(s.id) ? 'done' : ''}${i === index && !finished ? ' current' : ''}`}
            onClick={() => { setFinished(false); setDir(i > index ? 1 : -1); progress.setStepIndex(i); }} />
        ))}
      </div>

      {timers.length > 0 && (
        <div className="cook-timers">
          {timers.map((t) => {
            const left = (t.endsAt - now) / 1000;
            const done = left <= 0;
            return (
              <button key={t.id} className={`timer-pill${done ? ' ringing' : ''}`} onClick={() => stop(t.id)} aria-label={done ? `${t.label} timer done. Dismiss` : `${t.label} timer, ${formatClock(left)} left. Cancel`}>
                <Icon name="timer" size={18} />
                <b>{done ? 'Done' : formatClock(left)}</b>
                <span className="timer-label">{t.label}</span>
                <Icon name="close" size={14} stroke={2.4} />
              </button>
            );
          })}
        </div>
      )}

      <div className="cook-main">
        <aside className={`cook-side${panel ? ' open' : ''}`}>{ingredientPanel}</aside>
        {panel && <div className="cook-scrim" onClick={() => setPanel(false)} />}

        <main
          className="cook-stage"
          onPointerDown={(e) => { touch.current = { x: e.clientX, y: e.clientY }; }}
          onPointerUp={(e) => {
            const t = touch.current; touch.current = null;
            if (!t || e.pointerType === 'mouse') return;
            const dx = e.clientX - t.x, dy = e.clientY - t.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
          }}
        >
          {finished ? (
            <div className="cook-finish" key="finish">
              <div className="finish-mark"><Icon name="check" size={44} stroke={2.4} /></div>
              <h1>Enjoy your meal.</h1>
              <p className="secondary">That’s every step of {recipe.title}.</p>
              <div className="finish-actions">
                <button className="btn primary lg" onClick={finish}>Done</button>
                <button className="btn secondary lg" onClick={() => setFinished(false)}>Back to Last Step</button>
              </div>
            </div>
          ) : step ? (
            <div className={`cook-step ${dir > 0 ? 'from-right' : 'from-left'}`} key={step.id}>
              <div className="cook-step-no">Step {index + 1}</div>
              <p className={`cook-step-text${stepDone ? ' done' : ''}`}>{step.text}</p>

              {(used.length > 0 || stepTimers.length > 0) && (
                <div className="cook-extras">
                  {stepTimers.map((t) => (
                    <button key={t.label} className="chip timer-chip" onClick={() => start(t.label, t.seconds)}>
                      <Icon name="timer" size={18} /> Start {t.label} timer
                    </button>
                  ))}
                  {used.length > 0 && (
                    <div className="cook-uses">
                      <div className="cook-uses-label">You’ll need</div>
                      <ul>
                        {used.map((ing) => (
                          <li key={ing.id} className={progress.checkedIngredients.has(ing.id) ? 'done' : undefined}>
                            <IngredientLine text={ing.text} factor={progress.factor} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <button className={`mark-done${stepDone ? ' on' : ''}`} onClick={() => progress.toggle('steps', step.id)} aria-pressed={stepDone}>
                <CheckCircle on={stepDone} size={28} />
                {stepDone ? 'Done' : 'Mark as done'}
              </button>

              {steps[index + 1] && (
                <p className="cook-next"><span>Next</span> {steps[index + 1].text}</p>
              )}
            </div>
          ) : (
            <EmptyState icon="list" title="No Steps Yet" action={<button className="btn secondary" onClick={() => navigate({ name: 'edit', id: recipe.id })}>Add Steps</button>}>
              Add instructions to this recipe to cook with it step by step.
            </EmptyState>
          )}
        </main>
      </div>

      {!finished && steps.length > 0 && (
        <footer className="cook-controls">
          <button className="btn secondary cook-nav" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous step">
            <Icon name="back" size={26} stroke={2.2} /> <span>Previous</span>
          </button>
          <button className="btn primary cook-nav" onClick={() => go(1)} aria-label={index === steps.length - 1 ? 'Finish' : 'Next step'}>
            <span>{index === steps.length - 1 ? 'Finish' : 'Next'}</span> <Icon name={index === steps.length - 1 ? 'check' : 'forward'} size={26} stroke={2.2} />
          </button>
        </footer>
      )}
    </div>
  );
}
