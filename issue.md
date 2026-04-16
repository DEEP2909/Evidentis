Prompts — prompts/__init__.py
High impact
India-specific clause types are missing from extraction prompt
prompts/__init__.py → CLAUSE_EXTRACTION → CLAUSE TYPES TO IDENTIFY
Your product docs promise DPDP, GST, stamp duty, RERA, and labour code clause detection — but none of these appear in the extraction prompt. The LLM can only find what you tell it to look for. Add: dpdp_consent, gst_invoicing, stamp_duty, rera_compliance, labour_code, arbitration_india (separate from generic arbitration — Indian Arbitration Act §7 has specific form requirements).
High impact
Risk assessment uses US state law examples in an India product
prompts/__init__.py → RISK_ASSESSMENT → CRITICAL RULES
The prompt says "Consider non-compete enforceability by state (CA/OK/ND/MN ban them)" — these are American states. This actively confuses the model. Replace with India-specific notes: non-compete validity under Indian Contract Act §27 (generally void), arbitration seat requirements, jurisdiction clause implications under CPC, DPDP data localisation requirements.
Medium impact
Switch to chat format — you're losing the system prompt slot
routers/extract.py, research.py, suggest.py, obligations.py
All Ollama calls use /api/generate with a single monolithic prompt string. Switch to /api/chat with a system message and a user message. Models are instruction-tuned to weight the system role more heavily — your "You are a legal analyst…" persona will be significantly more effective when passed as role: "system".
Medium impact
Temperature inconsistency between prompt definition and actual call
prompts/__init__.py vs routers/research.py line ~220
RESEARCH_QUERY defines temperature: 0.2, but the actual Ollama call in generate_research_answer() hardcodes "temperature": 0.3. The prompt template temperature is never used — the router overrides it. Fix by reading RESEARCH_QUERY.temperature in the router call so changes to the prompt config actually take effect.
RAG Pipeline — routers/research.py
High impact
No reranking — retrieved chunks go straight to the LLM unsorted by relevance
routers/research.py → generate_research_answer()
You build the context by iterating chunks in retrieval order with no secondary scoring. Add a cross-encoder reranker using cross-encoder/ms-marco-MiniLM-L-6-v2 (30MB, runs on CPU). After pgvector retrieves top-20 candidates, rerank and pass only top-5 to the LLM. This is the single highest-leverage RAG improvement — it dramatically reduces hallucination from irrelevant context.
High impact
No query expansion for legal terminology
routers/research.py → research() endpoint
A user might ask "what happens if client doesn't pay?" but the contract says "event of default" or "payment obligation breach." Add a lightweight query expansion step before embedding: call Ollama with a 1-sentence prompt — "Rephrase this legal question using formal contract terminology: {query}" — then embed both the original and rephrased query and merge results. This is especially important for Indian users mixing Hindi/English legal terms.
Medium impact
Context window wasted — chunks aren't deduplicated or trimmed
routers/research.py → generate_research_answer()
If a clause appears in two overlapping chunks (which is normal in sliding-window chunking), the same text is sent to the LLM twice. Before building the context string, deduplicate chunks by comparing the first 100 chars of each. Also trim each chunk to ~600 tokens instead of passing the full text, to fit more distinct sources in the same context window.
Extraction — routers/extract.py
High impact
Long documents are hard-truncated at 30,000 chars — tail of contract lost
routers/extract.py → extract_clauses_llm() line ~45
The code does text = text[:30000] and discards everything after. A 40-page contract's definitions, schedules, and signatures are silently dropped. Instead, split into overlapping chunks (e.g. 6,000 chars with 500-char overlap), extract clauses from each chunk, then merge results by deduplicating on clause type + first 80 chars of extracted text. This is the most common source of missed clauses in long contracts.
Medium impact
JSON parsing doesn't strip markdown fences — silent failures on some models
routers/extract.py, assess.py, obligations.py — all JSON parse sites
Qwen2.5 and Mistral sometimes wrap JSON in ```json … ``` even when asked not to. Your validate_response() calls json.loads() directly — if the model adds fences, it returns [] silently. Add a pre-parse cleanup: text = re.sub(r"```json|```", "", response_text).strip() before calling json.loads(). One line, prevents silent data loss.
Embeddings — models/loader.py
Medium impact
LaBSE is good for multilingual but not legal domain — consider a swap
config.py → EMBEDDING_MODEL=sentence-transformers/LaBSE
LaBSE was trained on parallel web text — it handles Indian languages well but has no legal domain knowledge. BAAI/bge-m3 (free, Apache 2.0) is a strong alternative: it supports 100+ languages including Hindi/Bengali/Tamil, handles up to 8192 token inputs (versus LaBSE's 512), and scores significantly higher on legal retrieval benchmarks. The trade-off is it's ~570MB vs LaBSE's ~470MB — negligible on your droplet.
Obligation Extraction — routers/obligations.py
Quick win
Date calculation delegated to LLM — use Python instead
prompts/__init__.py → OBLIGATION_EXTRACTION instructions step 3
The prompt says "Calculate concrete dates where possible" and passes effective_date to the LLM. LLMs are unreliable at date arithmetic — "30 days from April 1" might come back wrong, especially with business-day logic. Extract the relative timing as a string ("30 calendar days after execution"), then do the actual date math in Python with dateutil.relativedelta after parsing the LLM output.
Here's the priority order for implementing these, given your constraints:
Do immediately (no new dependencies, just code changes):

Strip markdown fences before JSON parsing — one regex line in 4 files, prevents silent empty results right now with Qwen2.5
Fix the US state law text in the risk assessment prompt — replace CA/OK/ND/MN references with Indian Contract Act §27 notes
Add India-specific clause types to the extraction prompt — DPDP, GST, RERA, stamp duty are core to your product promise but the LLM doesn't know to look for them
Read temperature from the prompt template object instead of hardcoding in the router

Do next (small additions, high return):

Switch /api/generate → /api/chat with proper system/user message split — affects how strongly the model holds its persona
Chunk long documents instead of truncating — critical for any real contract over 15 pages
Date math in Python for obligation deadlines — remove reliance on LLM arithmetic

Do when stable (new dependencies):

Add cross-encoder reranking (cross-encoder/ms-marco-MiniLM-L-6-v2, ~30MB) to the RAG pipeline — this is your biggest RAG quality lever
Swap LaBSE → BAAI/bge-m3 for the embedding model — better legal retrieval, longer context window, same multilingual coverage
Query expansion before embedding — especially useful once you have real users mixing Hindi/English legal terms

Also, there are some more issues:
1. There should be a feature to register the stakeholders, if not having an account.
2. There should be a feature to give 30 days free demo to the users. 
3. The UI should is very bad, it should be improved a lot, use the skills-main folder for the skills to improve the UI, stick to is completely and not a single percent of deviation from it in the improvement in frontend, it should look professional as well as interactive.
4. Logo size is small, it should also be increases and also should be aligned properly.
