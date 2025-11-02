export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskCategory = 'maintenance' | 'billing' | 'meter_reading' | 'contract' | 'support' | 'other';

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  householdId?: number;
  householdName?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  notes?: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  householdId?: number;
  search?: string;
}

export interface TasksResponse {
  success: boolean;
  data: {
    tasks: Task[];
    stats: TaskStats;
  };
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  householdId?: number;
  dueDate?: string;
  assignedTo?: string;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  status?: TaskStatus;
  notes?: string;
}
