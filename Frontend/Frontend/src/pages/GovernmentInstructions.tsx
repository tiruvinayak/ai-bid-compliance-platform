import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { governmentInstructionService } from '../services/governmentInstructionService';
import type { GovernmentInstruction } from '../types';
import { ErrorState } from '../components/common/ErrorState';
import { 
  ExternalLink, 
  ChevronDown, 
  ChevronRight, 
  Scale, 
  Search, 
  BadgeAlert,
  Bot,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';


export const GovernmentInstructions: React.FC = () => {
  const [instructions, setInstructions] = useState<GovernmentInstruction[]>([]);
  const [restrictions, setRestrictions] = useState<GovernmentInstruction[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');

  // Government RAG State
  const [ragQuery, setRagQuery] = useState<string>('');
  const [ragResult, setRagResult] = useState<any | null>(null);
  const [ragLoading, setRagLoading] = useState<boolean>(false);
  const [ragError, setRagError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const all = await governmentInstructionService.getInstructions();
        const restr = await governmentInstructionService.getRestrictions();
        setInstructions(all);
        setRestrictions(restr);
       } catch (err) {
         setLoadError(err instanceof Error ? err.message : 'Unable to load official instructions.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAskRag = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToUse = customQuery !== undefined ? customQuery : ragQuery;
    if (!queryToUse.trim()) return;

    setRagLoading(true);
    setRagError('');
    setRagResult(null);

    try {
      const res = await governmentInstructionService.askGovernment(queryToUse, 5, 0.70);
      setRagResult(res);
     } catch (err: any) {
      if (err.response?.status === 403) {
        setRagError("Access Denied (HTTP 403): Only authorized Government Officers can query the Government RAG Knowledge Assistant.");
      } else {
        setRagError(err.response?.data?.message || err.message || "Failed to communicate with Government RAG Assistant.");
      }
    } finally {
      setRagLoading(false);
    }
  };

  const categories = [
    'ALL',
    'Procurement Guidelines',
    'Bid Submission Requirements',
    'Document Requirements',
    'Eligibility Requirements',
    'Financial Requirements',
    'Experience Requirements',
    'Registration Requirements',
    'Compliance Requirements',
    'Verification Guidance',
    'Important Restrictions'
  ];

  const filteredInstructions = instructions.filter((item) => {
    const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sourceRef.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="font-sans space-y-6">
      <PageHeader
        title="Official Government Procurement Instructions & Policies"
        subtitle="Official procurement rules, requirements, restrictions, and verification guidance relevant to GeM portal bids."
        breadcrumbs={[
          { label: "GeM Platform" },
          { label: "Government Instructions" }
        ]}
      />

      {loadError && <ErrorState message={loadError} />}

      {/* GOVERNMENT AI KNOWLEDGE ASSISTANT / RAG QUERY PANEL */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-2 border-blue-800 text-white rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-blue-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-lg text-white font-bold shadow-xs">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold tracking-wider uppercase text-blue-100">
                  GOVERNMENT AI KNOWLEDGE & RAG ASSISTANT
                </h2>
                <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded bg-blue-900/90 text-amber-300 border border-blue-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  OFFICER ONLY
                </span>
              </div>
              <p className="text-3xs text-blue-300">
                Ask grounded semantic questions on GFR rules, CVC guidelines, and government procurement policies
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAskRag} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              placeholder="e.g. What are the bidder eligibility requirements?"
              className="w-full pl-4 pr-28 py-3 bg-slate-950/90 border border-blue-700/80 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            />
            <button
              type="submit"
              disabled={ragLoading || !ragQuery.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-extrabold text-xs rounded transition flex items-center gap-1.5 cursor-pointer"
            >
              {ragLoading ? (
                <span>Searching...</span>
              ) : (
                <>
                  <span>ASK AI</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-3xs text-slate-300">
            <span className="font-bold text-blue-300">Sample Queries:</span>
            <button
              type="button"
              onClick={() => { setRagQuery("What are the bidder eligibility requirements?"); handleAskRag(undefined, "What are the bidder eligibility requirements?"); }}
              className="hover:underline text-blue-200 cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-blue-800"
            >
              "Bidder eligibility requirements"
            </button>
            <button
              type="button"
               onClick={() => { setRagQuery("Who won the cricket match?"); handleAskRag(undefined, "Who won the cricket match?"); }}
              className="hover:underline text-amber-300 cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-amber-800"
            >
              "Who won the cricket match?" (Negative Test)
            </button>
          </div>
        </form>

        {ragError && (
          <div className="p-3 bg-rose-950/90 border border-rose-700 text-rose-200 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{ragError}</span>
          </div>
        )}

        {ragResult && (
          <div className="p-4 bg-slate-950/90 border border-blue-800/80 rounded-lg text-xs space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className={`text-3xs font-extrabold uppercase px-2.5 py-0.5 rounded border flex items-center gap-1 ${
                (ragResult.grounding_status === 'GROUNDED' || ragResult.status === 'GROUNDED' || ragResult.grounded)
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-amber-950 text-amber-300 border-amber-700'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                 Grounding Status: {ragResult.grounding_status || (ragResult.status === 'INSUFFICIENT_GOVERNMENT_EVIDENCE' ? 'INSUFFICIENT_GOVERNMENT_EVIDENCE' : (ragResult.grounded ? 'GROUNDED' : (ragResult.status || 'Not reported')))}
              </span>
              {ragResult.sources && (
                <span className="text-3xs font-mono text-slate-400">
                  {ragResult.sources.length} Grounded Citations Found
                </span>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-3xs font-bold uppercase text-slate-400 tracking-wider">AI System Answer:</span>
              <p className="text-slate-100 font-medium leading-relaxed bg-slate-900/80 p-3 rounded border border-slate-800">
                {ragResult.answer || ragResult.response || (ragResult.status === 'INSUFFICIENT_GOVERNMENT_EVIDENCE' ? 'INSUFFICIENT_GOVERNMENT_EVIDENCE: No official government evidence was found in the ingested knowledge base to answer this question.' : JSON.stringify(ragResult))}
              </p>
            </div>

            {ragResult.sources && ragResult.sources.length > 0 ? (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="text-3xs font-bold uppercase text-blue-300">Grounded Official Evidence Citations:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ragResult.sources.map((src: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-slate-900 rounded border border-slate-800 text-3xs space-y-1">
                      <div className="flex items-center justify-between text-blue-400 font-bold">
                        <span className="flex items-center gap-1 font-mono">
                          <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                           {src.document || src.source_document || 'Document not reported'}
                        </span>
                         <span className="font-mono text-amber-300">Page {src.page ?? src.page_number ?? 'Not reported'}</span>
                      </div>
                      {src.section && (
                        <div className="text-3xs text-slate-400 font-semibold">Section: {src.section}</div>
                      )}
                      <p className="text-slate-300 italic line-clamp-3">"{src.text || src.source_text || src.snippet}"</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : ragResult.status === 'INSUFFICIENT_GOVERNMENT_EVIDENCE' && (
              <div className="p-3 bg-amber-950/80 border border-amber-800 text-amber-200 rounded text-3xs">
                <strong>INSUFFICIENT_GOVERNMENT_EVIDENCE:</strong> No grounded source document clauses matched this query. No fabricated answer was generated.
              </div>
            )}
          </div>
        )}
      </div>

      {/* IMPORTANT GOVERNMENT RESTRICTIONS ALERT SECTION */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 border-2 border-rose-800 text-white rounded-xl p-6 shadow-md">
        <div className="flex items-center gap-3 mb-4 border-b border-rose-700/60 pb-3">
          <div className="p-2 bg-rose-600 rounded-lg text-white font-extrabold shadow-xs">
            <BadgeAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-wider uppercase text-rose-200">
              IMPORTANT GOVERNMENT RESTRICTIONS & MANDATORY CLAUSES
            </h2>
            <p className="text-3xs text-rose-300">
              Disqualification conditions and mandatory statutory compliance requirements (Verified Official Source References)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {restrictions.map((restr) => (
            <div key={restr.id} className="bg-slate-950/80 p-4 rounded-lg border border-rose-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700">
                  {restr.category}
                </span>
                <span className="text-3xs text-slate-400 font-mono">{restr.lastUpdated}</span>
              </div>
              <h3 className="text-xs font-bold text-slate-100">{restr.title}</h3>
              <p className="text-3xs text-slate-300 leading-relaxed line-clamp-3">{restr.description}</p>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-3xs font-mono text-amber-400">
                <span>Ref: {restr.sourceRef}</span>
                {restr.sourceUrl && (
                  <a
                    href={restr.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold transition"
                  >
                    <span>Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTER & CATEGORY TABS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guidelines, GFR rules, tender clauses..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{filteredInstructions.length}</strong> official instructions
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-3xs font-extrabold uppercase whitespace-nowrap transition cursor-pointer ${
                activeCategory === cat
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ACCORDION CARDS LIST */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
            Loading official government instructions...
          </div>
        ) : filteredInstructions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
            No official instructions found matching search query.
          </div>
        ) : (
          filteredInstructions.map((inst) => {
            const isExpanded = expandedId === inst.id;
            return (
              <div
                key={inst.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition hover:border-slate-300"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : inst.id)}
                  className="w-full p-4 flex items-start justify-between text-left cursor-pointer hover:bg-slate-50/80 transition gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 text-blue-900 rounded-lg shrink-0 mt-0.5">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-3xs font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-950 border border-blue-200">
                          {inst.category}
                        </span>
                        {inst.isRestriction && (
                          <span className="text-3xs font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-200">
                            RESTRICTION CLAUSE
                          </span>
                        )}
                        <span className="text-3xs text-slate-400 font-mono">Updated: {inst.lastUpdated}</span>
                      </div>
                      <h3 className="text-xs font-extrabold text-slate-900">{inst.title}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-3xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                      {inst.sourceRef}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-5 bg-slate-50 border-t border-slate-200 text-xs text-slate-700 space-y-4">
                    <p className="leading-relaxed font-medium">{inst.description}</p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-200 gap-2">
                      <div className="text-3xs font-mono text-slate-500">
                        Official Government Reference: <strong className="text-slate-900">{inst.sourceRef}</strong>
                      </div>

                      {inst.sourceUrl && (
                        <a
                          href={inst.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded text-3xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <span>View Official Source Document</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
