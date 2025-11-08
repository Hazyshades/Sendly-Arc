import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { Plus, CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { ScheduleWizard } from './schedules/ScheduleWizard';
import { ScheduleList } from './schedules/ScheduleList';
import { ScheduleDetailsDialog } from './schedules/ScheduleDetailsDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import {
  listAgentSchedules,
  createAgentSchedule,
  triggerManualScheduleRun,
  updateAgentSchedule,
  deleteAgentSchedule,
  getAgentSchedule,
} from '../utils/supabase/schedules';
import type { ScheduleInput, ScheduleWithStats } from '../src/types/agentSchedules';

export function AgentSchedulesPanel() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen && isCreateOpen) {
      setIsCreateOpen(false);
    }
  }, [isOpen, isCreateOpen]);

  const normalizedUserId = useMemo(() => (address ? address.toLowerCase() : null), [address]);

  const schedulesQuery = useQuery({
    queryKey: ['agent-schedules', normalizedUserId],
    queryFn: () => listAgentSchedules(normalizedUserId!, { includeHistory: true }),
    enabled: Boolean(normalizedUserId),
    staleTime: 30_000,
  });

  const detailQuery = useQuery({
    queryKey: ['agent-schedule-detail', normalizedUserId, selectedScheduleId],
    queryFn: () => getAgentSchedule(selectedScheduleId!, normalizedUserId!, 30),
    enabled: Boolean(selectedScheduleId && normalizedUserId && detailOpen),
  });

  const createMutation = useMutation({
    mutationFn: (payload: ScheduleInput) => createAgentSchedule(normalizedUserId!, payload),
    onSuccess: (created) => {
      toast.success('Schedule created');
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['agent-schedules', normalizedUserId] });
      setSelectedScheduleId(created.id);
      setDetailOpen(true);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create schedule');
    },
  });

  const runMutation = useMutation({
    mutationFn: (schedule: ScheduleWithStats) => triggerManualScheduleRun(schedule.id, normalizedUserId!, {
      triggeredFrom: 'manual-run',
    }),
    onSuccess: () => {
      toast.success('Run queued');
      queryClient.invalidateQueries({ queryKey: ['agent-schedules', normalizedUserId] });
      if (selectedScheduleId) {
        queryClient.invalidateQueries({ queryKey: ['agent-schedule-detail', normalizedUserId, selectedScheduleId] });
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to run schedule');
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (schedule: ScheduleWithStats) => {
      const isPaused = schedule.paused || schedule.status === 'paused';
      const nextStatus = isPaused ? 'active' : 'paused';
      return updateAgentSchedule(schedule.id, normalizedUserId!, {
        paused: !isPaused,
        status: nextStatus,
      });
    },
    onSuccess: () => {
      toast.success('Schedule status updated');
      queryClient.invalidateQueries({ queryKey: ['agent-schedules', normalizedUserId] });
      if (selectedScheduleId) {
        queryClient.invalidateQueries({ queryKey: ['agent-schedule-detail', normalizedUserId, selectedScheduleId] });
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update schedule status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (schedule: ScheduleWithStats) => deleteAgentSchedule(schedule.id, normalizedUserId!),
    onSuccess: () => {
      toast.success('Schedule deleted');
      queryClient.invalidateQueries({ queryKey: ['agent-schedules', normalizedUserId] });
      if (selectedScheduleId) {
        setSelectedScheduleId(null);
        setDetailOpen(false);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete schedule');
    },
  });

  const handleCreate = async (payload: ScheduleInput) => {
    await createMutation.mutateAsync(payload);
  };

  const handleRun = async (schedule: ScheduleWithStats) => {
    await runMutation.mutateAsync(schedule);
  };

  const handleTogglePause = async (schedule: ScheduleWithStats) => {
    await pauseMutation.mutateAsync(schedule);
  };

  const handleDelete = async (schedule: ScheduleWithStats) => {
    const confirmed = window.confirm(`Delete schedule "${schedule.name}"?`);
    if (!confirmed) return;
    await deleteMutation.mutateAsync(schedule);
  };

  const handleInspect = (schedule: ScheduleWithStats) => {
    setSelectedScheduleId(schedule.id);
    setDetailOpen(true);
  };

  const handleRefreshDetail = async () => {
    if (!selectedScheduleId || !normalizedUserId) return;
    await detailQuery.refetch();
  };

  if (!isConnected || !normalizedUserId) {
    return null;
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-circle-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 border border-purple-100">
                <CalendarClock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Automated Payouts</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Schedule recurring USDC/EURC transfers from your Internal wallet.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOpen && (
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      New Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Create Payout Schedule</DialogTitle>
                    </DialogHeader>
                    <Separator />
                    <div className="py-4">
                      <ScheduleWizard
                        onSubmit={handleCreate}
                        onCancel={() => setIsCreateOpen(false)}
                        isSubmitting={createMutation.isPending}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {schedulesQuery.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load schedules. Check your Supabase/Edge function connection and refresh the page.
                </AlertDescription>
              </Alert>
            )}

            <ScheduleList
              schedules={schedulesQuery.data ?? []}
              isLoading={schedulesQuery.isLoading}
              isMutating={runMutation.isPending || pauseMutation.isPending || deleteMutation.isPending}
              onRefresh={() => schedulesQuery.refetch()}
              onRun={handleRun}
              onTogglePause={handleTogglePause}
              onDelete={handleDelete}
              onInspect={handleInspect}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <ScheduleDetailsDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        detail={detailQuery.data ?? null}
        onRefreshExecutions={handleRefreshDetail}
      />
    </Card>
  );
}

