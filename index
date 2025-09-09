import React, { useEffect, useMemo, useState } from "react";
// Robust import for environments where pokersolver's exports vary
import * as PokerSolverNS from "pokersolver";
const Hand: any = (
  PokerSolverNS &&
  // @ts-ignore tolerate differing ESM/CJS shapes
  ((PokerSolverNS as any).Hand || ((PokerSolverNS as any).default && (PokerSolverNS as any).default.Hand))
) || null;

// ========= Card & types =========
const SUITS = ["s", "h", "d", "c"] as const; // spades, hearts, diamonds, clubs
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const; // high->low for display

type Card = `${typeof RANKS[number]}${typeof SUITS[number]}`;
type Street = "preflop" | "flop" | "turn" | "river";

// ========= Helpers =========
function makeDeck(): Card[] {
  const deck: Card[] = [] as Card[];
  for (const r of RANKS) for (const s of SUITS) deck.push((r + s) as Card);
  return deck;
}

function cardLabel(cs: Card) {
  const r = cs[0];
  const s = cs[1];
  const suitMap: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
  return (
    <span className={s === "h" || s === "d" ? "text-red-600" : ""}>
      {r}
      {suitMap[s]}
    </span>
  );
}

function removeCards(deck: Card[], used: Card[]) {
  const usedSet = new Set(used);
  return deck.filter((c) => !usedSet.has(c));
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ========= Poker logic =========
const HAND_ORDER = [
  "Старшая карта",
  "Пара",
  "Две пары",
  "Сет",
  "Стрит",
  "Флеш",
  "Фул-хаус",
  "Каре",
  "Стрит-флеш",
] as const;

function emptyHandDist(): Record<string, number> {
  const d: Record<string, number> = {};
  (HAND_ORDER as readonly string[]).forEach((k) => {
    d[k] = 0;
  });
  return d;
}

function winners(list: any[]) {
  if (!Hand) return [] as any[];
  try {
    return Hand.winners(list);
  } catch (e) {
    return [] as any[];
  }
}

function solveHand(cards: string[], game: "holdem" | "omaha") {
  if (!Hand) return null as any;
  try {
    if (game === "omaha") return Hand.solve(cards, "omaha");
    return Hand.solve(cards);
  } catch (e) {
    return null as any;
  }
}

function handTypeNameRu(h: any) {
  if (!h) return "Старшая карта";
  const raw = (h.name || h.descr || (h.toString ? h.toString() : "")).toLowerCase();
  const mapping: [string, string][] = [
    ["straight flush", "Стрит-флеш"],
    ["four of a kind", "Каре"],
    ["full house", "Фул-хаус"],
    ["flush", "Флеш"],
    ["straight", "Стрит"],
    ["three of a kind", "Сет"],
    ["two pair", "Две пары"],
    ["pair", "Пара"],
  ];
  for (const [key, label] of mapping) if (raw.includes(key)) return label;
  return "Старшая карта";
}

// Monte Carlo equity vs N opponents; exact board rollout on turn/river
function simEquity({
  game,
  hero,
  board,
  opponents = 1,
  iters = 2000,
}: {
  game: "holdem" | "omaha";
  hero: Card[];
  board: Card[];
  opponents?: number;
  iters?: number;
}) {
  const deck = makeDeck();
  const used = [...hero, ...board];
  const baseDeck = removeCards(deck, used);
  const takePerVillain = game === "omaha" ? 4 : 2;

  let wins = 0,
    ties = 0;
  const dist = emptyHandDist();

  const need = 5 - board.length; // missing community cards

  // Helper: deal random villain hands from deck
  function dealVillains(d: Card[]): { hands: Card[][]; rest: Card[] } {
    const hands: Card[][] = [];
    let pool = d;
    for (let v = 0; v < opponents; v++) {
      hands.push(pool.slice(0, takePerVillain));
      pool = pool.slice(takePerVillain);
    }
    return { hands, rest: pool };
  }

  // Exact rollout over remaining community cards when <= 1 card is unknown
  if (need <= 1) {
    const remaining = baseDeck.slice();
    // enumerate 1 missing card or none
    const boardVariants: Card[][] = need === 0 ? [board] : remaining.map((c) => [...board, c]);

    for (const b of boardVariants) {
      // For opponent holes we still Monte Carlo sample (tractable, controls cost)
      for (let t = 0; t < Math.max(1, Math.floor(iters / Math.max(1, boardVariants.length))); t++) {
        let d = shuffle(removeCards(baseDeck, b.slice(board.length))); // remove the extra chosen river if any
        const { hands: vHands } = dealVillains(d);
        const heroSolved = solveHand([...hero, ...b], game);
        if (!heroSolved) continue;
        const villSolved = vHands.map((vh) => solveHand([...vh, ...b], game)).filter(Boolean);
        const all = [heroSolved, ...villSolved];
        const ws = winners(all);
        if (ws.length === 0) continue;
        if (ws.includes(heroSolved)) {
          if (ws.length > 1) ties++;
          else wins++;
        }
        const key = handTypeNameRu(heroSolved);
        dist[key] = (dist[key] ?? 0) + 1;
      }
    }
  } else {
    // Flop (2 unknown cards) — pure Monte Carlo
    for (let t = 0; t < iters; t++) {
      let d = shuffle(baseDeck);
      const { hands: vHands, rest } = dealVillains(d);
      const add = 5 - board.length;
      const simBoard = board.concat(rest.slice(0, add));

      const heroSolved = solveHand([...hero, ...simBoard], game);
      if (!heroSolved) continue;
      const villSolved = vHands.map((vh) => solveHand([...vh, ...simBoard], game)).filter(Boolean);

      const all = [heroSolved, ...villSolved];
      const ws = winners(all);
      if (ws.length === 0) continue;

      if (ws.includes(heroSolved)) {
        if (ws.length > 1) ties++;
        else wins++;
      }

      const key = handTypeNameRu(heroSolved);
      dist[key] = (dist[key] ?? 0) + 1;
    }
  }

  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  const equity = (wins + ties * 0.5) / total;
  const probs = Object.fromEntries(
    (HAND_ORDER as readonly string[]).map((k) => [k, (dist[k] || 0) / total])
  ) as Record<string, number>;
  return { equity, tie: ties / total, probs };
}

function currentBest({ game, hero, board }: { game: "holdem" | "omaha"; hero: Card[]; board: Card[] }) {
  if (board.length + hero.length < 5) return null as any;
  return solveHand([...hero, ...board], game);
}

function computeOuts({ game, hero, board }: { game: "holdem" | "omaha"; hero: Card[]; board: Card[] }) {
  // Outs to improve on the NEXT SINGLE CARD (flop->turn or turn->river)
  const needsCard = board.length === 3 || board.length === 4;
  if (!needsCard) return { outs: 0, pct: 0 };

  const deck = makeDeck();
  const used = new Set([...hero, ...board]);
  const remaining = deck.filter((c) => !used.has(c));

  const baseSolved = currentBest({ game, hero, board });
  const baseRank = baseSolved ? baseSolved.rank : -Infinity;

  let outs = 0;
  for (const c of remaining) {
    const newBoard = [...board, c];
    const solved = solveHand([...hero, ...newBoard], game);
    if (solved && solved.rank > baseRank) outs++;
  }
  const pct = remaining.length ? outs / remaining.length : 0;
  return { outs, pct };
}

// ========= Flow helpers =========
const STREET_FLOW: Street[] = ["preflop", "flop", "turn", "river"]; // standard order
function nextStageOf(stage: Street): Street {
  const idx = STREET_FLOW.indexOf(stage);
  if (idx === -1 || idx === STREET_FLOW.length - 1) return stage;
  return STREET_FLOW[idx + 1];
}
function heroCountForGame(game: "holdem" | "omaha") {
  return game === "omaha" ? 4 : 2;
}

// ========= UI Components =========
function CardPicker({ disabled, taken, currentCount, limit, onPick, title }: { disabled?: boolean; taken: Card[]; currentCount: number; limit: number; onPick: (c: Card) => void; title?: string }) {
  const deck = makeDeck();
  const takenSet = new Set(taken);
  const canPick = (c: Card) => !takenSet.has(c) && currentCount < limit && !disabled;

  return (
    <div className="space-y-1">
      {title ? <div className="text-xs text-slate-500">{title}</div> : null}
      <div className="grid grid-cols-8 gap-1">
        {deck.map((c) => (
          <button
            key={c}
            onClick={() => (canPick(c) ? onPick(c) : null)}
            disabled={!!disabled || takenSet.has(c) || currentCount >= limit}
            className={
              "border rounded py-0.5 text-center text-xs " + (takenSet.has(c) ? "opacity-30 cursor-not-allowed" : currentCount < limit && !disabled ? "bg-white" : "bg-gray-50")
            }
          >
            {cardLabel(c)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">{children}</span>;
}

// ========= Dev self-checks (headless tests, not rendered) =========
function devSelfChecks() {
  try {
    const d = makeDeck();
    console.assert(d.length === 52 && new Set(d).size === 52, "Deck must have 52 unique cards");
    const dist = emptyHandDist();
    console.assert(Object.keys(dist).length === 9 && dist["Пара"] === 0, "emptyHandDist returns zeroed keys");
    console.assert(heroCountForGame("holdem") === 2 && heroCountForGame("omaha") === 4, "heroCountForGame ok");
    console.assert(nextStageOf("river") === "river", "nextStageOf river idempotent");
  } catch {}
}

export default function App() {
  useEffect(() => { devSelfChecks(); }, []);

  // View pages: home → table
  const [view, setView] = useState<"home" | "table">("home");
  const [game, setGame] = useState<"holdem" | "omaha">("holdem");
  const [stage, setStage] = useState<Street>("preflop");
  const [hero, setHero] = useState<Card[]>([]); // 2 or 4 cards
  const [board, setBoard] = useState<Card[]>([]); // 0..5 cards

  // New controls
  const [opponents, setOpponents] = useState<number>(1); // 1..9
  const [mode, setMode] = useState<"fast" | "accurate">("accurate");
  const simIters = mode === "fast" ? 800 : 4000; // flop/early streets; turn/river override with exact rollout

  const needHero = heroCountForGame(game);

  const equityData = useMemo(() => {
    if (stage === "preflop") return null as any; // не считаем эквити до Флопа по UX
    if (hero.length < needHero) return null as any;
    return simEquity({ game, hero, board, opponents, iters: simIters });
  }, [game, hero, board, needHero, stage, opponents, mode]);

  const bestNow: any = useMemo(() => (stage === "preflop" ? null : currentBest({ game, hero, board })), [game, hero, board, stage]);
  const outsNow = useMemo(() => (stage === "preflop" ? { outs: 0, pct: 0 } : computeOuts({ game, hero, board })), [game, hero, board, stage]);

  function resetHand(keepView = true) {
    setHero([]);
    setBoard([]);
    setStage("preflop");
    if (!keepView) setView("home");
  }

  function onPickHero(c: Card) {
    if (hero.includes(c) || hero.length >= needHero) return;
    setHero([...hero, c]);
  }

  function onPickBoard(c: Card) {
    if (board.includes(c)) return;
    const limit = stage === "flop" ? 3 : stage === "turn" ? 4 : 5;
    if (board.length >= limit) return;
    setBoard([...board, c]);
  }

  function nextStreet() {
    setStage((s) => nextStageOf(s));
  }

  const equityPct = equityData ? (equityData.equity * 100).toFixed(1) + "%" : "—";

  // ========== RENDER ==========
  if (view === "home") {
    return (
      <div className="w-full min-h-screen bg-slate-50 p-4">
        <div className="max-w-sm mx-auto mt-10 space-y-4 text-center">
          <h1 className="text-2xl font-bold">Выберите покер</h1>
          <p className="text-slate-600 text-sm">Первая страница: выберите тип игры</p>
          <div className="grid grid-cols-1 gap-3">
            <button
              className="p-4 rounded-xl border bg-white shadow text-lg"
              onClick={() => {
                setGame("holdem");
                resetHand(true);
                setView("table");
              }}
            >
              Холдем (2 карты)
            </button>
            <button
              className="p-4 rounded-xl border bg-white shadow text-lg"
              onClick={() => {
                setGame("omaha");
                resetHand(true);
                setView("table");
              }}
            >
              Омаха (4 карты)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // table view
  return (
    <div className="w-full min-h-screen bg-slate-50 p-2">
      <div className="space-y-3 max-w-sm mx-auto">
        <div className="flex items-center justify-between">
          <button className="text-xs underline" onClick={() => resetHand(false)}>
            ← Назад
          </button>
          <div className="text-xs text-slate-600">Игра: {game === "holdem" ? "Холдем" : "Омаха"}</div>
        </div>

        {/* Controls: opponents + accuracy */}
        <div className="bg-white rounded-lg shadow p-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span>Оппонентов:</span>
            <select
              className="border rounded px-2 py-1"
              value={opponents}
              onChange={(e) => setOpponents(Math.max(1, Math.min(9, Number(e.target.value))))}
            >
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              className={`px-2 py-1 rounded border ${mode === "fast" ? "bg-slate-800 text-white" : "bg-white"}`}
              onClick={() => setMode("fast")}
            >
              Быстро
            </button>
            <button
              className={`px-2 py-1 rounded border ${mode === "accurate" ? "bg-slate-800 text-white" : "bg-white"}`}
              onClick={() => setMode("accurate")}
            >
              Точно
            </button>
          </div>
        </div>

        {/* Info / Selected cards */}
        {stage === "preflop" ? (
          hero.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-3 text-center">
              <div className="text-xs text-slate-500 mb-2">Ваши карманные</div>
              <div className="flex items-center justify-center gap-2 text-lg">
                {hero.map((c) => (
                  <div key={c} className="px-2 py-1 rounded border">{cardLabel(c as Card)}</div>
                ))}
              </div>
            </div>
          ) : null
        ) : (
          <div className="bg-white rounded-lg shadow p-2 space-y-1 text-center">
            <Pill>
              Комбинация: {bestNow ? handTypeNameRu(bestNow) : "—"}
            </Pill>
            <Pill>Эквити: {equityPct}</Pill>
            {stage !== "river" && <Pill>Ауты: {outsNow.outs} ({(outsNow.pct * 100).toFixed(1)}%)</Pill>}
            <div className="grid grid-cols-2 gap-1 text-xs mt-1">
              {(HAND_ORDER as readonly string[]).map((k) => (
                <div key={k} className="flex items-center justify-between border rounded px-2 py-1">
                  <span>{k}</span>
                  <span className="font-semibold">{equityData ? (equityData.probs[k] * 100).toFixed(1) + "%" : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pickers */}
        {hero.length < needHero && (
          <CardPicker
            title={`Карманные карты (${hero.length}/${needHero})`}
            disabled={false}
            taken={[...hero, ...board]}
            currentCount={hero.length}
            limit={needHero}
            onPick={onPickHero}
          />
        )}

        {stage !== "preflop" && hero.length >= needHero ? (
          <CardPicker
            title={
              stage === "flop"
                ? "Выберите флоп (3 карты)"
                : stage === "turn"
                ? "Выберите тёрн (1 карта)"
                : stage === "river"
                ? "Выберите ривер (1 карта)"
                : "Борд выбран"
            }
            disabled={
              (stage === "flop" && board.length >= 3) ||
              (stage === "turn" && board.length >= 4) ||
              (stage === "river" && board.length >= 5)
            }
            taken={[...hero, ...board]}
            currentCount={board.length}
            limit={stage === "flop" ? 3 : stage === "turn" ? 4 : stage === "river" ? 5 : 0}
            onPick={onPickBoard}
          />
        ) : null}

        {/* Bottom controls: Fold resets, next button advances street */}
        <div className="flex gap-2 justify-center">
          <button className="px-3 py-1 rounded border text-xs" onClick={() => resetHand(true)}>
            Fold
          </button>
          {stage === "preflop" && hero.length >= needHero && (
            <button className="px-3 py-1 rounded border bg-emerald-600 text-white text-xs" onClick={nextStreet}>
              Флоп
            </button>
          )}
          {stage === "flop" && board.length >= 3 && (
            <button className="px-3 py-1 rounded border bg-emerald-600 text-white text-xs" onClick={nextStreet}>
              Тёрн
            </button>
          )}
          {stage === "turn" && board.length >= 4 && (
            <button className="px-3 py-1 rounded border bg-emerald-600 text-white text-xs" onClick={nextStreet}>
              Ривер
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
