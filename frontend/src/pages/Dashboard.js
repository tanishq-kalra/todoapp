import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, api } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Progress } from '../components/ui/progress';
import { 
  CheckSquare, 
  Search, 
  Trash2, 
  Edit, 
  Moon, 
  Sun, 
  LogOut,
  GripVertical,
  Calendar,
  Tag,
  ChevronDown,
  ChevronRight,
  BarChart3,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import Profile from '../components/Profile';
import AddTaskButton from '../components/AddTaskButton';



const Dashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('order');
  const [expandedTasks, setExpandedTasks] = useState({});
  const [showProfile, setShowProfile] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await api.get('/api/tasks');
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/api/stats');
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...tasks];

    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => 
        filterStatus === 'completed' ? task.completed : !task.completed
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sortBy === 'due_date') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      } else if (sortBy === 'completed') {
        return a.completed === b.completed ? 0 : a.completed ? 1 : -1;
      }
      return a.order - b.order;
    });

    setFilteredTasks(filtered);
  }, [tasks, searchQuery, filterPriority, filterStatus, sortBy]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  const handleAddTask = async (taskData) => {
    try {
      setIsAddingTask(true);
      await api.post('/api/tasks', taskData);
      await fetchTasks();
      await fetchStats();
    } catch (error) {
      if (error.response?.status === 403) {
        alert("Upgrade to Premium to add more tasks!");
      } else {
        console.error('Error adding task:', error);
      }
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await api.put(`/api/tasks/${taskId}`, updates);
      fetchTasks();
      fetchStats();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/api/tasks/${taskId}`);
      fetchTasks();
      fetchStats();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleToggleComplete = async (task) => {
    await handleUpdateTask(task.id, { completed: !task.completed });
  };

  const handleToggleSubtask = async (taskId, subtaskId, completed) => {
    try {
      await api.put(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { completed: !completed });
      fetchTasks();
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const handleDeleteSubtask = async (taskId, subtaskId) => {
    try {
      await api.delete(`/api/tasks/${taskId}/subtasks/${subtaskId}`);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(filteredTasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFilteredTasks(items);
    
    try {
      await api.post(`/api/tasks/${reorderedItem.id}/reorder`, { new_order: result.destination.index });
    } catch (error) {
      console.error('Error reordering tasks:', error);
      fetchTasks();
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const toggleTaskExpanded = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/70 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Hi, {user?.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="theme-toggle-button"
              className="rounded-full"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-primary/10 transition-colors"
              onClick={() => setShowProfile(true)}
              data-testid="profile-button"
              title="View profile"
            >
              <User className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              data-testid="logout-button"
              className="rounded-full"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Tasks</span>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-4xl font-semibold tracking-tight" data-testid="stat-total-tasks">{stats?.total || 0}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Completed</span>
              <CheckSquare className="w-4 h-4 text-primary" />
            </div>
            <p className="text-4xl font-semibold tracking-tight text-primary" data-testid="stat-completed-tasks">{stats?.completed || 0}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Pending</span>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-4xl font-semibold tracking-tight" data-testid="stat-pending-tasks">{stats?.pending || 0}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Progress</span>
            </div>
            <div className="space-y-2">
              <Progress 
                value={stats?.total > 0 ? (stats.completed / stats.total) * 100 : 0} 
                className="h-2"
              />
              <p className="text-sm text-muted-foreground">
                {stats?.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% complete
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-tasks-input"
                className="pl-10 h-11"
              />
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full md:w-40 h-11" data-testid="filter-priority-select">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40 h-11" data-testid="filter-status-select">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40 h-11" data-testid="sort-by-select">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">Custom Order</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="completed">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tasks">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
                data-testid="tasks-list"
              >
                {filteredTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-card border border-border rounded-xl p-6 transition-all duration-200 ${
                          snapshot.isDragging ? 'shadow-2xl scale-105' : 'hover:shadow-lg hover:-translate-y-0.5'
                        }`}
                        data-testid={`task-item-${task.id}`}
                      >
                        <div className="flex items-start gap-4">
                          <div {...provided.dragHandleProps} className="mt-1 cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-5 h-5 text-muted-foreground" />
                          </div>
                          
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => handleToggleComplete(task)}
                            data-testid={`task-checkbox-${task.id}`}
                            className="mt-1"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 
                                  className={`text-lg font-medium mb-1 ${
                                    task.completed ? 'line-through opacity-50' : ''
                                  }`}
                                  data-testid={`task-title-${task.id}`}
                                >
                                  {task.title}
                                </h3>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                  <span className={`font-medium uppercase ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                  {task.due_date && (
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(task.due_date), 'MMM dd, yyyy')}
                                    </span>
                                  )}
                                  {task.category && (
                                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary">
                                      <Tag className="w-3 h-3" />
                                      {task.category}
                                    </span>
                                  )}
                                </div>

                                {task.subtasks && task.subtasks.length > 0 && (
                                  <div className="mt-3">
                                    <button
                                      onClick={() => toggleTaskExpanded(task.id)}
                                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                      data-testid={`toggle-subtasks-${task.id}`}
                                    >
                                      {expandedTasks[task.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                      {task.subtasks.length} subtask{task.subtasks.length !== 1 ? 's' : ''}
                                    </button>
                                    {expandedTasks[task.id] && (
                                      <div className="mt-2 ml-5 space-y-2">
                                        {task.subtasks.map(subtask => (
                                          <div key={subtask.id} className="flex items-center gap-2">
                                            <Checkbox
                                              checked={subtask.completed}
                                              onCheckedChange={() => handleToggleSubtask(task.id, subtask.id, subtask.completed)}
                                              data-testid={`subtask-checkbox-${subtask.id}`}
                                            />
                                            <span className={`text-sm ${subtask.completed ? 'line-through opacity-50' : ''}`}>
                                              {subtask.title}
                                            </span>
                                            <button
                                              onClick={() => handleDeleteSubtask(task.id, subtask.id)}
                                              className="ml-auto text-muted-foreground hover:text-destructive"
                                              data-testid={`delete-subtask-${subtask.id}`}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {}}
                                  data-testid={`edit-task-${task.id}`}
                                  className="rounded-full"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteTask(task.id)}
                                  data-testid={`delete-task-${task.id}`}
                                  className="rounded-full hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {filteredTasks.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <CheckSquare className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-6">Create your first task to get started</p>
          </div>
        )}
      </main>

      <AddTaskButton 
        user={user}
        totalTasks={stats?.total || 0}
        onAddTask={handleAddTask}
        isLoading={isAddingTask}
      />

      <Profile 
        user={user}
        stats={stats}
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </div>
  );
};

export default Dashboard;