"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { tasksAPI } from "@/lib/api";
import type { Task, TaskStatus, TaskPriority, TaskCategory, CreateTaskData, TaskStats } from "@/types/tasks";
import Card from "@/app/components/ui/Card";
import Button from "@/app/components/ui/Button";
import Badge from "@/app/components/ui/Badge";
import Modal from "@/app/components/ui/Modal";
import Input from "@/app/components/ui/Input";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";
import EmptyState from "@/app/components/ui/EmptyState";
import {
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

export default function TasksPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTasks();
  }, [session, selectedStatus]);

  const loadTasks = async () => {
    if (!session?.accessToken) return;

    try {
      setLoading(true);
      setError(null);
      const filters = selectedStatus !== 'all' ? { status: selectedStatus } : undefined;
      const response = await tasksAPI.list(session.accessToken, filters);
      setTasks(response.data.tasks);
      setStats(response.data.stats);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setError(err.response?.data?.message || 'Failed to load tasks');

      // Set mock data for demo purposes
      setStats({
        total: 12,
        pending: 5,
        inProgress: 3,
        completed: 3,
        overdue: 1,
      });

      setTasks([
        {
          id: 1,
          title: 'Review electricity meter reading',
          description: 'Check and verify the monthly meter reading for accuracy',
          status: 'pending',
          priority: 'high',
          category: 'meter_reading',
          householdName: 'Main Street Apartment',
          dueDate: '2025-02-05',
          createdAt: '2025-02-01T10:00:00Z',
          updatedAt: '2025-02-01T10:00:00Z',
        },
        {
          id: 2,
          title: 'Update billing information',
          description: 'Update payment method for household account',
          status: 'in_progress',
          priority: 'urgent',
          category: 'billing',
          householdName: 'Oak Avenue House',
          dueDate: '2025-02-03',
          createdAt: '2025-02-01T09:00:00Z',
          updatedAt: '2025-02-01T14:30:00Z',
        },
        {
          id: 3,
          title: 'Schedule maintenance check',
          description: 'Annual maintenance for heating system',
          status: 'pending',
          priority: 'medium',
          category: 'maintenance',
          householdName: 'Pine Street Condo',
          dueDate: '2025-02-10',
          createdAt: '2025-01-30T11:00:00Z',
          updatedAt: '2025-01-30T11:00:00Z',
        },
        {
          id: 4,
          title: 'Contract renewal reminder',
          description: 'Energy contract expires in 30 days, review options',
          status: 'pending',
          priority: 'high',
          category: 'contract',
          householdName: 'Main Street Apartment',
          dueDate: '2025-02-07',
          createdAt: '2025-01-28T08:00:00Z',
          updatedAt: '2025-01-28T08:00:00Z',
        },
        {
          id: 5,
          title: 'Respond to customer inquiry',
          description: 'Answer questions about solar panel installation',
          status: 'in_progress',
          priority: 'medium',
          category: 'support',
          householdName: 'Elm Park Villa',
          dueDate: '2025-02-04',
          createdAt: '2025-02-01T13:00:00Z',
          updatedAt: '2025-02-02T09:15:00Z',
        },
        {
          id: 6,
          title: 'Process refund request',
          description: 'Review and approve refund for overpayment',
          status: 'completed',
          priority: 'high',
          category: 'billing',
          householdName: 'Cedar Lane Flat',
          completedAt: '2025-02-01T16:00:00Z',
          createdAt: '2025-01-31T10:00:00Z',
          updatedAt: '2025-02-01T16:00:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (data: CreateTaskData) => {
    if (!session?.accessToken) return;

    try {
      const newTask = await tasksAPI.create(data, session.accessToken);
      setTasks([newTask, ...tasks]);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create task:', err);
      alert('Failed to create task. Please try again.');
    }
  };

  const handleUpdateStatus = async (taskId: number, newStatus: TaskStatus) => {
    if (!session?.accessToken) return;

    try {
      const updatedTask = await tasksAPI.update(taskId, { status: newStatus }, session.accessToken);
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
      loadTasks(); // Reload to update stats
    } catch (err: any) {
      console.error('Failed to update task:', err);
      // Update locally for demo
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    }
  };

  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-error text-white';
      case 'high':
        return 'bg-warning text-white';
      case 'medium':
        return 'bg-primary text-white';
      case 'low':
        return 'bg-text-tertiary text-white';
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="primary">In Progress</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="error">Cancelled</Badge>;
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchQuery === '' ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Tasks</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage and track your household tasks
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedStatus('all')}>
          <div className="text-center">
            <p className="text-2xl font-bold text-text-primary">{stats?.total || 0}</p>
            <p className="text-sm text-text-secondary">Total Tasks</p>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedStatus('pending')}>
          <div className="text-center">
            <p className="text-2xl font-bold text-warning">{stats?.pending || 0}</p>
            <p className="text-sm text-text-secondary">Pending</p>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedStatus('in_progress')}>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{stats?.inProgress || 0}</p>
            <p className="text-sm text-text-secondary">In Progress</p>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedStatus('completed')}>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{stats?.completed || 0}</p>
            <p className="text-sm text-text-secondary">Completed</p>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <div className="text-center">
            <p className="text-2xl font-bold text-error">{stats?.overdue || 0}</p>
            <p className="text-sm text-text-secondary">Overdue</p>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  selectedStatus === status
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-background-secondary text-text-secondary hover:bg-border'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckCircleIcon className="h-12 w-12" />}
          title="No tasks found"
          description={searchQuery ? "Try adjusting your search" : "Create your first task to get started"}
          action={
            !searchQuery ? (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between gap-4">
                {/* Left side - Task info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-text-primary">
                          {task.title}
                        </h3>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {task.description}
                      </p>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                    {task.householdName && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium">Household:</span> {task.householdName}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        Due: {new Date(task.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    )}
                    <span className="capitalize">
                      {task.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Right side - Status and actions */}
                <div className="flex flex-col items-end gap-3">
                  {getStatusBadge(task.status)}

                  {/* Quick status change buttons */}
                  {task.status !== 'completed' && (
                    <div className="flex gap-2">
                      {task.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                        >
                          Start
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleUpdateStatus(task.id, 'completed')}
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTask}
      />

      {/* Info Note */}
      {error && (
        <Card className="border-l-4 border-warning bg-warning/5">
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-warning">Note:</span> Displaying sample data.
            Backend tasks endpoint not yet implemented.
          </p>
        </Card>
      )}
    </div>
  );
}

// Create Task Modal Component
function CreateTaskModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateTaskData) => void;
}) {
  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      category: 'other',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter task title"
        />

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Description
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter task description"
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskCategory })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="maintenance">Maintenance</option>
              <option value="billing">Billing</option>
              <option value="meter_reading">Meter Reading</option>
              <option value="contract">Contract</option>
              <option value="support">Support</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <Input
          label="Due Date (Optional)"
          type="date"
          value={formData.dueDate || ''}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
        />

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth>
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
