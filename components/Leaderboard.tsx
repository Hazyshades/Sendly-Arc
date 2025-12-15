import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Trophy, RefreshCw, Users, Gift, Copy, CheckCircle2 } from 'lucide-react';
import { CardHeader, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from './ui/empty';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from './ui/pagination';
import { getLeaderboardSenders, recalculateLeaderboard, updateZNSDomains, LeaderboardEntry } from '../utils/leaderboard';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 30;

const formatAddress = (value?: string | null) => {
  if (!value) {
    return 'Unknown';
  }
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const formatCurrencySummary = (map: Record<string, number>) => {
  const parts = Object.entries(map)
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`);

  return parts.length ? parts.join(' • ') : '0';
};

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const { address } = useAccount();
  const normalizedAccount = address?.toLowerCase() ?? null;
  const userEntryRef = useRef<HTMLDivElement>(null);
  const hasScrolledToUser = useRef(false);

  const loadEntries = useCallback(
    async (options?: { preserveData?: boolean; recalculate?: boolean }) => {
      const preserveData = options?.preserveData ?? false;
      const shouldRecalculate = options?.recalculate ?? false;
      
      if (preserveData) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        // Recalculate leaderboard if requested (e.g., on refresh button click)
        if (shouldRecalculate) {
          console.log('Recalculating leaderboard before loading...');
          const recalcResult = await recalculateLeaderboard();
          if (!recalcResult.success) {
            console.warn('Leaderboard recalculation failed:', recalcResult.message);
            // Continue loading anyway - maybe data is still valid
          } else {
            console.log('Leaderboard recalculated. Entries:', recalcResult.entries_count);
          }
        }
        
        const data = await getLeaderboardSenders({ limit: 1000 });
        setEntries(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch leaderboard', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (preserveData) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    []
  );

  const scrollToUserEntry = useCallback(() => {
    if (userEntryRef.current) {
      userEntryRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      hasScrolledToUser.current = true;
    } else {
      // Retry after a short delay if ref is not ready
      setTimeout(() => {
        if (userEntryRef.current) {
          userEntryRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          hasScrolledToUser.current = true;
        }
      }, 200);
    }
  }, []);

  useEffect(() => {
    // Load entries without recalculating on first load (to avoid unnecessary DB load)
    // Recalculation happens only when user clicks Refresh button
    loadEntries({ preserveData: hasFetchedOnce });
    if (!hasFetchedOnce) {
      setHasFetchedOnce(true);
    }
  }, [hasFetchedOnce, loadEntries]);

  // Find user's position and scroll to it on first load
  useEffect(() => {
    if (!normalizedAccount || !entries.length || loading || hasScrolledToUser.current) {
      return;
    }

    // Find user's index in the entries array
    const userIndex = entries.findIndex(
      (entry) => entry.senderAddress?.toLowerCase() === normalizedAccount
    );

    if (userIndex === -1) {
      // User not found in leaderboard
      hasScrolledToUser.current = true;
      return;
    }

    // Calculate which page the user is on
    const userPage = Math.floor(userIndex / ITEMS_PER_PAGE) + 1;

    // Switch to user's page if not already there
    if (currentPage !== userPage) {
      setCurrentPage(userPage);
      // Don't scroll yet, wait for page to change
      return;
    }

    // We're on the correct page, scroll to user entry
    // Use a timeout to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      scrollToUserEntry();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [entries, normalizedAccount, loading, currentPage, scrollToUserEntry]);

  // Calculate pagination
  const totalPages = useMemo(() => Math.ceil(entries.length / ITEMS_PER_PAGE), [entries.length]);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedEntries = useMemo(() => entries.slice(startIndex, endIndex), [entries, startIndex, endIndex]);

  // Calculate pagination pages to display
  const paginationPages = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const showEllipsis = totalPages > 7;
    
    if (!showEllipsis) {
      // Show all pages if total pages <= 7
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 4) {
        // Show pages 1-5, ellipsis, last
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Show first, ellipsis, last 5 pages
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show first, ellipsis, current-1, current, current+1, ellipsis, last
        pages.push('ellipsis');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [totalPages, currentPage]);

  // Calculate statistics
  const totalAddresses = useMemo(() => entries.length, [entries.length]);
  const totalCards = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.cardsSentTotal, 0),
    [entries]
  );

  const handleRefresh = async () => {
    // Update ZNS domains and recalculate leaderboard when user clicks refresh
    setIsRefreshing(true);
    // Reset scroll flag so user position is scrolled to after refresh
    hasScrolledToUser.current = false;
    try {
      // Update ZNS domains for all addresses
      console.log('Updating ZNS domains...');
      const znsResult = await updateZNSDomains();
      if (znsResult.success) {
        console.log(`ZNS domains updated: ${znsResult.domains_found} domains found, ${znsResult.records_updated} records updated`);
      } else {
        console.warn('ZNS domains update failed:', znsResult.message);
      }
      
      // Recalculate and reload leaderboard
      loadEntries({ preserveData: true, recalculate: true });
    } catch (error) {
      console.error('Failed to refresh leaderboard:', error);
      // Still try to reload even if ZNS update failed
      loadEntries({ preserveData: true, recalculate: true });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  return (
    <>
      <CardHeader className="border-b border-gray-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h2 className="text-[20px] leading-[22px] font-bold text-[#0f172a] flex items-center gap-2">
              Sender leaderboard
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-[36px] leading-[48px] font-extrabold text-[#635bff]">{totalAddresses}</span>
                <span className="text-[14px] leading-[16px] font-medium text-[#64748b]">addresses</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-gray-400" />
                <span className="text-[36px] leading-[48px] font-extrabold text-[#635bff]">{totalCards}</span>
                <span className="text-[14px] leading-[16px] font-medium text-[#64748b]">cards total</span>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <Button
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
              className="rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white hover:opacity-90 disabled:opacity-50 h-10 w-10 p-0"
            >
              <RefreshCw
                className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : displayedEntries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Trophy className="w-12 h-12 opacity-50" />
              </EmptyMedia>
              <EmptyTitle>No entries yet</EmptyTitle>
              <EmptyDescription>
                No one has sent any cards yet. Be the first to appear on the leaderboard!
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {displayedEntries.map((entry, index) => {
              const isAddressLabel =
                !entry.displayName ||
                entry.displayName.toLowerCase() === entry.senderAddress?.toLowerCase();
              const primaryLabel =
                (isAddressLabel ? formatAddress(entry.senderAddress) : entry.displayName) ?? '—';
              const isCurrentUser =
                normalizedAccount &&
                entry.senderAddress?.toLowerCase() === normalizedAccount;
              const rankBadgeVariant =
                index === 0
                  ? 'default'
                  : index === 1
                  ? 'secondary'
                  : index === 2
                  ? 'outline'
                  : 'secondary';

              return (
                <div
                  key={entry.id}
                  ref={isCurrentUser ? userEntryRef : null}
                  className={`group flex flex-col gap-4 rounded-2xl border p-4 transition hover:shadow-md md:flex-row md:items-center md:justify-between ${
                    isCurrentUser 
                      ? 'bg-[#f0f9ff] border-[#bae6fd]' 
                      : 'bg-white border-[#e2e8f0]'
                  }`}
                  style={{ boxShadow: '0 4px 12px -4px rgba(0, 0, 0, 0.04)' }}
                >
                  <div className="flex items-center gap-4">
                    <Badge 
                      variant={rankBadgeVariant}
                      className={`${
                        index === 0 
                          ? 'bg-yellow-100 text-yellow-700 border-yellow-200' 
                          : index === 1
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : index === 2
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : ''
                      } min-w-[2.5rem] justify-center`}
                    >
                      {startIndex + index + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm font-semibold text-gray-900 truncate cursor-help">
                              {primaryLabel}
                            </p>
                          </TooltipTrigger>
                          {entry.senderAddress && entry.senderAddress !== primaryLabel && (
                            <TooltipContent>
                              <p className="font-mono text-xs">{entry.senderAddress}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                        {entry.senderAddress && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyAddress(entry.senderAddress);
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy address</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {entry.znsDomain && (
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-xs font-medium text-[#635bff]">@{entry.znsDomain}</p>
                        </div>
                      )}
                      {isCurrentUser && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                          <p className="text-xs font-medium text-indigo-500">Your wallet</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {(index === 0 || index === 2) && (
                        <Gift className="h-4 w-4 text-gray-400" />
                      )}
                      <p className="text-sm font-semibold text-gray-900">
                        {entry.cardsSentTotal} cards
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrencySummary(entry.amountSentByCurrency)}
                    </p>
                    {entry.lastSentAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(entry.lastSentAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && displayedEntries.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) {
                        handlePageChange(currentPage - 1);
                      }
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}
                  />
                </PaginationItem>
                {paginationPages.map((page, idx) => {
                    if (page === 'ellipsis') {
                      return (
                        <PaginationItem key={`ellipsis-${idx}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    const pageNumber = page as number;
                    const isActive = pageNumber === currentPage;
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(pageNumber);
                          }}
                          isActive={isActive}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) {
                        handlePageChange(currentPage + 1);
                      }
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </>
  );
}

