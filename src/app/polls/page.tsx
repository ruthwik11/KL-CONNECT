"use client";

import * as React from "react";
import { MessageSquare, Users, BarChart3, Settings, Loader2 } from "lucide-react";
import { SidebarNav, SidebarNavItem } from "@/components/shared/sidebar-nav";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { id: "chat", label: "Direct Messages", icon: MessageSquare, href: "/chat" },
  { id: "groups", label: "Discussion Hub", icon: Users, href: "/groups" },
  { id: "polls", label: "Daily Polls", icon: BarChart3, href: "/polls" },
  { id: "settings", label: "Game Settings", icon: Settings, href: "/settings" },
];

interface Poll {
  poll_id: string;
  question: string;
  options: string[];
  active_date: string;
  is_archived: boolean;
}

interface PollResult {
  optionIndex: number;
  optionText: string;
  votes: number;
  percentage: number;
}

export default function PollsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [poll, setPoll] = React.useState<Poll | null>(null);
  const [hasVoted, setHasVoted] = React.useState(false);
  const [votedOptionIdx, setVotedOptionIdx] = React.useState<number | null>(null);
  const [results, setResults] = React.useState<PollResult[] | null>(null);
  const [totalVotes, setTotalVotes] = React.useState(0);
  const [votingIdx, setVotingIdx] = React.useState<number | null>(null);

  const fetchPollData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi("/polls/today");
      if (data.status === "success" && data.poll) {
        setPoll(data.poll);
        setHasVoted(data.hasVoted);
        setVotedOptionIdx(data.votedOptionIdx);
        
        if (data.hasVoted) {
          const resultsData = await fetchApi(`/polls/${data.poll.poll_id}/results`);
          if (resultsData.status === "success") {
            setResults(resultsData.results);
            setTotalVotes(resultsData.totalVotes);
          }
        }
      } else {
        setPoll(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load active poll system");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPollData();
  }, [fetchPollData]);

  const handleVote = async (optionIdx: number) => {
    if (!poll || votingIdx !== null) return;
    setVotingIdx(optionIdx);
    setError(null);
    try {
      const response = await fetchApi(`/polls/${poll.poll_id}/vote`, {
        method: "POST",
        body: JSON.stringify({ selectedOption: optionIdx }),
      });
      if (response.status === "success") {
        setHasVoted(true);
        setVotedOptionIdx(optionIdx);
        // Refresh results
        const resultsData = await fetchApi(`/polls/${poll.poll_id}/results`);
        if (resultsData.status === "success") {
          setResults(resultsData.results);
          setTotalVotes(resultsData.totalVotes);
        }
      }
    } catch (err: any) {
      setError(err.message || "Could not record your vote selection");
    } finally {
      setVotingIdx(null);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-surface overflow-hidden">
      {/* Sidebar Nav */}
      <div className="h-full shrink-0">
        <SidebarNav items={SIDEBAR_ITEMS} />
      </div>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col p-8 overflow-y-auto font-[family-name:var(--font-space-mono)] text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-double border-primary/30 pb-6 mb-8">
          <div>
            <h1 className="font-[family-name:var(--font-press-start)] text-[16px] text-primary uppercase tracking-wider">
              // DAILY ENGAGEMENT TERMINAL
            </h1>
            <p className="text-[10px] text-muted uppercase mt-1">
              Academic consensus & domain aggregation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-success rounded-full animate-pulse border border-surface shadow-[0_0_8px_rgba(22,163,74,0.8)]" />
            <span className="font-[family-name:var(--font-press-start)] text-[8px] text-success uppercase">
              NODE ONLINE
            </span>
          </div>
        </div>

        {/* Console Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto">
          {loading ? (
            <div className="flex flex-col items-center gap-4 text-primary uppercase font-bold text-[12px] tracking-wider animate-pulse">
              <Loader2 className="animate-spin text-primary" size={24} />
              Booting consensus matrices...
            </div>
          ) : error ? (
            <div className="border-4 border-double border-danger p-8 rounded-[8px] max-w-md w-full bg-surface text-center shadow-[6px_6px_0px_0px_rgba(220,38,38,0.3)] animate-pulse">
              <span className="font-[family-name:var(--font-press-start)] text-[12px] text-danger uppercase tracking-wider block mb-4">
                SYSTEM ERROR
              </span>
              <p className="text-[11px] text-white uppercase leading-relaxed font-bold">
                {error}
              </p>
              <Button
                variant="danger"
                size="sm"
                className="mt-6"
                onClick={() => fetchPollData()}
              >
                REBOOT TERMINAL
              </Button>
            </div>
          ) : !poll ? (
            <div className="border-4 border-double border-warning p-8 rounded-[8px] max-w-md w-full bg-surface text-center shadow-[6px_6px_0px_0px_rgba(217,119,6,0.3)]">
              <div className="font-[family-name:var(--font-press-start)] text-[12px] text-warning uppercase tracking-wider block mb-4">
                [ NO POLL DEPLOYED ]
              </div>
              <p className="text-[11px] text-white uppercase leading-relaxed max-w-xs mx-auto">
                The daily consensus database is empty. Contact administration for mission parameters.
              </p>
              <div className="font-[family-name:var(--font-press-start)] text-[8px] text-primary uppercase animate-pulse mt-6">
                WAITING FOR DEPLOYMENT...
              </div>
            </div>
          ) : (
            <Card className="w-full border-4 border-double border-primary max-w-2xl bg-surface shadow-[8px_8px_0px_0px_rgba(42,63,229,0.3)]">
              <CardHeader className="border-b-2 border-dotted border-primary pb-4">
                <div className="flex justify-between items-center text-[9px] text-primary uppercase tracking-wider font-bold mb-2">
                  <span>POLL ID: #{poll.poll_id.slice(0, 8)}</span>
                  <span>DATE: {new Date(poll.active_date).toISOString().split("T")[0]}</span>
                </div>
                <CardTitle className="text-[14px] leading-relaxed text-secondary normal-case font-bold font-[family-name:var(--font-press-start)] select-text">
                  {poll.question}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-6">
                {hasVoted && results ? (
                  // Show Poll Results
                  <div className="flex flex-col gap-6">
                    <div className="text-[10px] text-muted uppercase font-bold tracking-widest border-b border-primary/20 pb-2 mb-2">
                      Aggregate consensus ({totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'})
                    </div>
                    {results.map((res) => {
                      const isUserChoice = votedOptionIdx === res.optionIndex;
                      return (
                        <div key={res.optionIndex} className="flex flex-col gap-2">
                          <div className="flex justify-between text-[11px] font-bold uppercase">
                            <span className={isUserChoice ? "text-success flex items-center gap-1.5" : "text-white"}>
                              {isUserChoice && <span className="font-[family-name:var(--font-press-start)] text-[8px]">[X]</span>}
                              {res.optionText}
                            </span>
                            <span className={isUserChoice ? "text-success" : "text-primary"}>
                              {res.percentage}% ({res.votes})
                            </span>
                          </div>

                          {/* Progress Bar Container */}
                          <div className="h-5 w-full bg-black border-2 border-primary/40 rounded-[4px] overflow-hidden p-[2px] flex items-center">
                            <div
                              className={`h-full rounded-[2px] transition-all duration-500 ease-out ${
                                isUserChoice 
                                  ? "bg-success shadow-[0_0_8px_rgba(22,163,74,0.5)]" 
                                  : "bg-primary"
                              }`}
                              style={{ width: `${res.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    <div className="bg-success/5 border border-dashed border-success/30 p-3 rounded-[4px] text-center text-success text-[10px] uppercase font-bold mt-4">
                      ✓ Consensus Vote Recorded. Selected Option Index: {votedOptionIdx}.
                    </div>
                  </div>
                ) : (
                  // Show Vote Options
                  <div className="flex flex-col gap-4">
                    <div className="text-[10px] text-muted uppercase font-bold tracking-widest border-b border-primary/20 pb-2 mb-2">
                      Cast your decision below
                    </div>
                    {poll.options.map((option, idx) => {
                      const isVotingThis = votingIdx === idx;
                      return (
                        <Button
                          key={idx}
                          variant="outline"
                          size="lg"
                          disabled={votingIdx !== null}
                          onClick={() => handleVote(idx)}
                          className="w-full text-left justify-start font-bold capitalize select-none hover:text-white"
                        >
                          {isVotingThis ? (
                            <span className="flex items-center gap-2 text-secondary">
                              <Loader2 className="animate-spin text-secondary" size={14} />
                              REGISTERING...
                            </span>
                          ) : (
                            <span className="flex items-center gap-3">
                              <span className="font-[family-name:var(--font-press-start)] text-[10px] text-secondary">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="font-[family-name:var(--font-space-mono)] text-[12px] lowercase first-letter:uppercase">
                                {option}
                              </span>
                            </span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
