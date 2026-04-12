# SQL-Tool-over-MCP for Curated Domain Agents — Methodology Spec

## Source

LinkedIn post by Michael Lugassy (mluggy), 2026.

Attribution links (must appear verbatim in every generated artifact's header/comments):
- Author GitHub: https://github.com/mluggy
- Original post: https://www.linkedin.com/posts/mluggy_%D7%9B%D7%9E%D7%95-%D7%9E%D7%99%D7%9C%D7%99%D7%95%D7%A0%D7%99-%D7%99%D7%A9%D7%A8%D7%90%D7%9C%D7%99%D7%9D-%D7%92%D7%9D-%D7%90%D7%A0%D7%97%D7%A0%D7%95-%D7%9E%D7%AA%D7%9B%D7%A0%D7%A0%D7%99%D7%9D-%D7%97%D7%95%D7%A4%D7%A9%D7%95%D7%AA-ugcPost-7448843353275858944-b7d4

## Original text (Hebrew, verbatim)

> כמו מיליוני ישראלים, גם אנחנו מתכננים חופשות לקיץ. זה לוקח המון זמן, אז התיישבתי עם קלוד שיהיה מעניין. את האיסוף עשיתי בשבילו - 3,888 שדות תעופה, 59,079 נתיבים ישירים, מעל מיליון (!) קומבינציות טיסה רלוונטיות לי רק לחודש יולי.
>
> זה המון, בהתייחס לעובדה שישראל טסה ישירות רק ל-111 יעדים, אבל רציתי שיהיה מעניין, ונראה לי שמצאתי משהו.
>
> אנחנו רגילים להתייחס לקונקשן כמכשול בדרך ליעד. כמשהו מלחיץ. מעיק. טיסה ישירה לפורטוגל תעלה 1,609-2,350₪ לאדם. המנוע שבניתי מציע לי 2-3 ימי קונקשן מלאים במדריד, ב-950-979₪ סה״כ ואפשר לבחור אם זה בטיסה הלוך או בחזור, או בשניהם. ולא רק מדריד, יש לפחות 14 ערים שאפשר לעצור בהן והטיול בשני היעדים יהיה פחות מטיסה ישירה.
>
> יש חסרונות כמובן. זה מתאים בעיקר לאנשים עם טרולי וליעדים עם אותו מזג אוויר. מדובר ב-2 הזמנות נפרדות ואתה, בלבד, אחראי לקונקשן.
>
> בכל מקרה, שנותנים לקלוד גישת SQL לטבלאות טיסה, מקבלים סוכן נסיעות מצויין. הוא ידע להמליץ על טיסות זולות גם ל-OPO (פורטו) או FAO (פארו), להשוות בין השעות של אייר פורטוגול לאל-על (בוקר מול אחה״צ), והמטוסים (איירבאס נאו מול בואינג ישן). הוא מסביר את זה ממש טוב ולא נמאס לו אף פעם, ובגלל שזה SQL ולא MCP אז התוצאה חוזרת בטיל ובפורמט קבוע.
>
> אם יש ביקוש, אחשוב איך אפשר לפתוח את המנוע לכולם. לבינתיים, שרשרו המלצות על פורטוגל.
>
> טיסה נעימה! ✈️

## English translation (verbatim)

Like millions of Israelis, we too are planning summer vacations. It takes a lot of time, so I sat down with Claude to make it interesting. I did the data gathering for him — 3,888 airports, 59,079 direct routes, over one million (!) flight combinations relevant to me for July alone.

That's a lot, considering Israel flies directly only to 111 destinations, but I wanted it to be interesting, and I think I found something.

We tend to think of a connection as an obstacle on the way to the destination. As something stressful. Annoying. A direct flight to Portugal costs 1,609–2,350 ILS per person. The engine I built offers me 2–3 full connection days in Madrid, for 950–979 ILS total, and I can choose whether it's on the outbound, the return, or both. And not only Madrid — there are at least 14 cities you can stop in where a two-destination trip costs less than a direct flight.

There are downsides of course. This suits mainly people with carry-on luggage and destinations with the same weather. It involves 2 separate bookings and you, alone, are responsible for the connection.

In any case, when you give Claude SQL access to flight tables, you get an excellent travel agent. It can recommend cheap flights to OPO (Porto) or FAO (Faro), compare Air Portugal vs. El Al schedules (morning vs. afternoon), and aircraft (Airbus NEO vs. old Boeing). It explains it really well and never gets tired, and because it's SQL and not MCP, the result comes back fast and in a consistent format.

If there's demand, I'll think about how to open the engine to everyone. Meanwhile, chain recommendations for Portugal in the comments.

Safe flight! ✈️

## Extracted methodology

### Name
Curated-Dataset + SQL-Tool Agent (SQL-over-MCP)

### One-line statement
Expose a curated, structured domain dataset to an LLM via a direct SQL tool (not MCP), turning the LLM into a low-latency, consistent-format, natural-language domain expert.

### Core claims
1. **Data curation is the bottleneck, not model capability.** The author did the aggregation (3,888 airports, 59,079 routes, 1M+ combinations) manually before the LLM was useful. The methodology explicitly inverts the "let the LLM fetch" reflex.
2. **SQL as a tool beats MCP for read-heavy structured-data domains.** Fast round-trips; deterministic, fixed-shape responses; no MCP protocol overhead.
3. **Domain-specific reframing falls out of dense data.** Having the entire flight graph available let the author reframe "connections" as "stopover vacations" — an insight invisible without the dataset.
4. **LLM-as-query-composer is a general pattern.** The LLM explains tradeoffs (morning vs. afternoon, NEO vs. old Boeing), compares airlines, handles IATA codes — it isn't just an SQL generator, it is a domain UX.

### Trade-offs (named in the post)
- Fits domains where the user tolerates light operational friction (carry-on only, two bookings, user owns handoff risk).
- Fits destinations/queries where a common filter (e.g. same weather) can be expressed as a SQL predicate.
- The author currently operates it solo; productization is an open question.

### Generalized methodology (what the assimilation should formalize)

Given a structured-data domain `D`:

1. **Ingest.** Identify authoritative data sources, gather them offline, normalize. Do not rely on runtime web-fetch.
2. **Schema.** Design a small, query-friendly relational schema with explicit join keys. Prefer denormalization where it collapses the common query shapes.
3. **Load.** Materialize into SQLite (preferred for local/single-user) or Postgres (shared). Deterministic ETL — reproducible from raw sources.
4. **Tool registration.** Register a SQL-execution tool with the LLM harness. Include schema description in the system prompt. Do not wrap in MCP unless multi-client access is actually required.
5. **Acceptance.** A fixed set of 5–10 natural-language queries the agent must handle correctly with stable output shape. This is the binary pass/fail gate — not subjective "does it feel good".

### Non-goals
- Not a general agentic framework.
- Not a replacement for MCP in domains requiring writes, side effects, or multi-tool composition.
- Not a recommendation to skip ETL — the methodology depends on it.
